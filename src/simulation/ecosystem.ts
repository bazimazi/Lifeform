import type { ActionResult, Creature, GameState, Input, Resource, Vec } from '../core/types';
import { phenotype, dietFor } from '../biology/body';
import { lineagePopulation } from '../biology/reproduction';
import { clamp, distance, random } from '../core/random';
import { record, legacyRecord } from '../core/history';
import { resourceById, speciesById, TUNING, PRESSURES } from '../data/content';
import { SpatialGrid } from '../world/spatial';
import { chooseGoal } from './ai';
import { populationDeath, updatePopulations } from './population';
import { traversal, exploreRegion } from '../world/regions';
import { environmentNeeds, movementCondition, addStatus } from '../biology/conditions';
import { evaluateMilestones, reconcileBranches } from '../progression/lineage';

export const emptyInput = (): Input => ({ x: 0, y: 0, target: null, sprint: false, action: false });

export class Simulation {
  private agents = new SpatialGrid<Creature>();
  private food = new SpatialGrid<Resource>();
  constructor(public state: GameState) {
    this.rebuild();
  }
  private rebuild() {
    this.agents.rebuild([this.state.player, ...this.state.creatures]);
    this.food.rebuild(this.state.resources.filter((r) => r.active));
  }
  step(input: Input = emptyInput()) {
    const s = this.state;
    if (s.lineage.extinct) return;
    const dt = TUNING.step;
    s.tick++;
    s.time = s.tick * dt;
    const p = s.player;
    p.juvenile = Math.max(0, p.juvenile - dt);
    // Derived indexes are rebuilt at the start of each fixed step so a loaded save
    // follows exactly the same queries, even across spatial cell boundaries.
    this.rebuild();
    let direction = { x: input.x, y: input.y };
    if (input.target && Math.hypot(direction.x, direction.y) < 0.1) {
      direction = { x: input.target.x - p.x, y: input.target.y - p.y };
      if (Math.hypot(direction.x, direction.y) < 8) {
        direction = { x: 0, y: 0 };
        input.target = null;
      }
    }
    const moved = this.move(p, direction, dt, input.sprint && p.stamina > 1);
    s.telemetry.distance += moved;
    if (input.sprint && moved) p.stamina = Math.max(0, p.stamina - TUNING.sprintDrain * dt);
    else p.stamina = Math.min(100, p.stamina + TUNING.staminaRegen * dt);
    if (input.action) this.act(p);
    else if (s.settings.control === 'hybrid' || s.settings.control === 'touch') this.feed(p);
    for (const c of [...s.creatures]) {
      if (c.health <= 0) continue;
      c.juvenile = Math.max(0, c.juvenile - dt);
      if (c.speciesId !== 'player' && distance(c, p) > TUNING.nearRadius) continue;
      c.aiTimer -= dt;
      if (c.aiTimer <= 0) {
        const goal = chooseGoal(s, c, this.agents, this.food);
        c.intent = {
          x: clamp(goal.target.x, 30, s.world.width - 30),
          y: clamp(goal.target.y, 30, s.world.height - 30),
        };
        c.behavior = goal.name;
        c.aiTimer = TUNING.aiInterval;
      }
      this.move(c, { x: c.intent.x - c.x, y: c.intent.y - c.y }, dt);
      if (c.behavior === 'hunt') this.act(c);
      else this.feed(c);
    }
    if (s.tick % Math.round(TUNING.needsInterval / dt) === 0) {
      this.needs(p, TUNING.needsInterval);
      for (const c of [...s.creatures])
        if (c.speciesId === 'player' || distance(c, p) <= TUNING.nearRadius)
          this.needs(c, TUNING.needsInterval);
      this.discover();
      this.regrow();
      exploreRegion(s);
      evaluateMilestones(s);
    }
    if (s.tick % Math.round(TUNING.populationInterval / dt) === 0) updatePopulations(s);
    if (s.pressure) {
      s.pressure.remaining -= dt;
      if (s.pressure.remaining <= 0) {
        record(
          s,
          'environment',
          'The water settles',
          'The environmental pressure passes. Resource growth returns to normal.',
        );
        s.pressure = null;
      }
    } else if (s.time >= s.nextEventAt) {
      this.triggerPressure(PRESSURES[Math.floor(random(s.rng, 'event') * PRESSURES.length)].id);
    }
    const cell = `${Math.floor(p.x / TUNING.explorationRegionSize)},${Math.floor(p.y / TUNING.explorationRegionSize)}`;
    if (!s.world.visited.includes(cell)) {
      s.world.visited.push(cell);
      if (s.world.visited.length % TUNING.territoriesPerPoint === 0) {
        s.lineage.points++;
        record(
          s,
          'discovery',
          'A little farther from home',
          `Exploring ${TUNING.territoriesPerPoint} new territories reveals a mutation opportunity.`,
        );
      }
    }
  }
  private move(c: Creature, direction: Vec, dt: number, sprint = false): number {
    const length = Math.hypot(direction.x, direction.y);
    if (length < 1e-4) return 0;
    const stats = phenotype(c.genome);
    const amount =
      stats.speed *
      traversal(this.state, c, {
        x: c.x + (direction.x / length) * 10,
        y: c.y + (direction.y / length) * 10,
      }).multiplier *
      movementCondition(this.state, c) *
      dt *
      (sprint ? TUNING.sprintMultiplier : 1) *
      (c.juvenile > 0 ? TUNING.juvenileSpeed : 1);
    const dx = (direction.x / length) * amount,
      dy = (direction.y / length) * amount;
    const x = clamp(c.x + dx, 25, this.state.world.width - 25),
      y = clamp(c.y + dy, 25, this.state.world.height - 25);
    const moved = distance(c, { x, y });
    c.x = x;
    c.y = y;
    c.angle = Math.atan2(dy, dx);
    c.energy = Math.max(0, c.energy - TUNING.movementDrain * dt * (sprint ? 2 : 1));
    return moved;
  }
  feed(c: Creature): ActionResult {
    const diet = c.speciesId === 'player' ? dietFor(c.genome) : speciesById[c.speciesId].diet;
    if (c.energy > phenotype(c.genome).energy - TUNING.hungerFullMargin && c.speciesId !== 'player')
      return { ok: false, message: 'Already full.' };
    const food = this.food
      .query(c, TUNING.feedingRadius)
      .filter((r) => r.active && diet.includes(resourceById[r.type].diet))
      .sort((a, b) => distance(c, a) - distance(c, b))[0];
    if (!food) return { ok: false, message: 'Move closer to food your body can digest.' };
    const definition = resourceById[food.type],
      stats = phenotype(c.genome);
    c.energy = Math.min(stats.energy, c.energy + definition.energy);
    c.health = Math.min(stats.health, c.health + definition.energy * TUNING.feedingHealingRatio);
    c.poison += definition.toxicity;
    food.active = false;
    food.regrowAt = this.state.time + definition.growth;
    if (c.id === this.state.player.id) {
      const s = this.state;
      s.lineage.biomass += definition.biomass;
      s.telemetry.foodEaten++;
      if (!s.discoveries.resources.includes(food.type)) {
        s.discoveries.resources.push(food.type);
        record(
          s,
          'discovery',
          `Discovered ${definition.name.toLowerCase()}`,
          `A ${definition.diet} food source. Provides ${definition.energy} energy and ${definition.biomass} biomass.`,
        );
      }
      if (s.telemetry.foodEaten % TUNING.foodPerPoint === 0) {
        s.lineage.points++;
        record(
          s,
          'opportunity',
          'Life makes room for change',
          'Four foods consumed. A new mutation point is ready to use.',
        );
      }
    }
    return { ok: true, message: `Consumed ${definition.name.toLowerCase()}.` };
  }
  act(c = this.state.player): ActionResult {
    const foodResult = this.feed(c);
    if (foodResult.ok) return foodResult;
    const stats = phenotype(c.genome),
      isPlayer = c.speciesId === 'player';
    if (c.attackCooldown > 0) return { ok: false, message: 'Recovering from the last strike.' };
    if (c.energy < TUNING.attackEnergy) return { ok: false, message: 'Too exhausted to attack.' };
    const targets = this.agents
      .query(c, Math.max(TUNING.attackRadius, stats.projectile))
      .filter((other) => {
        if (other.id === c.id || other.health <= 0 || (isPlayer && other.speciesId === 'player'))
          return false;
        return isPlayer || speciesById[c.speciesId].prey.includes(other.speciesId);
      })
      .sort((a, b) => distance(c, a) - distance(c, b));
    const target = targets[0];
    if (!target) return { ok: false, message: 'Swim closer to a creature to strike.' };
    const damage = Math.max(
      TUNING.minimumAttackDamage,
      stats.attack + stats.electricity - phenotype(target.genome).defense,
    );
    c.attackCooldown = TUNING.attackInterval;
    c.energy -= TUNING.attackEnergy;
    target.health -= damage;
    target.poison += stats.venom;
    if (stats.electricity > 0) addStatus(this.state, target, 'stunned', 2, 'Electric organ');
    if (target.health <= 0) {
      this.die(
        target,
        `Hunted by ${isPlayer ? this.state.lineage.name : speciesById[c.speciesId].name}`,
      );
      if (dietFor(c.genome).includes('meat')) {
        c.energy = Math.min(stats.energy, c.energy + TUNING.preyEnergyReward);
        if (c.id === this.state.player.id) {
          this.state.lineage.biomass += TUNING.preyBiomassReward;
          this.state.telemetry.hunts++;
          record(
            this.state,
            'hunt',
            'A place in the food web',
            'A successful hunt supplies energy and biomass. Life feeds life.',
          );
        }
      }
    }
    return { ok: true, message: `${damage} damage${stats.venom > 0 ? ' · venom applied' : ''}.` };
  }
  private needs(c: Creature, dt: number) {
    if (c.health <= 0) return;
    const stats = phenotype(c.genome);
    const environmentalCause = environmentNeeds(this.state, c, dt);
    c.age += dt;
    c.attackCooldown = Math.max(0, c.attackCooldown - dt);
    c.reproductionCooldown = Math.max(0, c.reproductionCooldown - dt);
    const sunlight = PRESSURES.find((p) => p.id === this.state.pressure?.id)?.light ?? 1;
    c.energy = clamp(
      c.energy + (stats.photosynthesis * sunlight - TUNING.baseEnergyDrain - stats.metabolism) * dt,
      0,
      stats.energy,
    );
    if (c.energy <= 0) c.health -= TUNING.starvationDamage * dt;
    if (c.poison > 0) {
      c.health -= TUNING.poisonDamage * dt * (1 - stats.toxinResistance);
      c.poison = Math.max(0, c.poison - dt);
    }
    if (c.energy > stats.energy * TUNING.regenerationThreshold && stats.regeneration)
      c.health = Math.min(stats.health, c.health + stats.regeneration * dt);
    if (c.health <= 0) this.die(c, c.energy <= 0 ? 'Starvation' : (environmentalCause ?? 'Venom'));
    if (c.id === this.state.player.id)
      this.state.telemetry.lifespan = Math.max(this.state.telemetry.lifespan, c.age);
  }
  die(c: Creature, cause: string) {
    const s = this.state;
    if (c.id !== s.player.id && !s.creatures.some((x) => x.id === c.id)) return;
    if (c.speciesId === 'player' && s.lineage.archive.find((x) => x.id === c.id)?.died !== null)
      return;
    c.health = 0;
    delete s.evolution.statuses[c.id];
    s.creatures = s.creatures.filter((x) => x.id !== c.id);
    const remains: Resource = {
      id: s.nextId++,
      type: 'carrion',
      x: c.x,
      y: c.y,
      active: true,
      regrowAt: 0,
    };
    // Reuse depleted resource entries rather than growing the world forever.
    const reusable = s.resources.findIndex((r) => !r.active);
    if (reusable >= 0) s.resources[reusable] = remains;
    else if (s.resources.length < TUNING.resourceCount + 60) s.resources.push(remains);
    if (c.speciesId !== 'player') {
      populationDeath(s, c.speciesId, cause);
      return;
    }
    const ancestor = s.lineage.archive.find((x) => x.id === c.id);
    if (ancestor) {
      ancestor.died = s.time;
      ancestor.cause = cause;
    }
    reconcileBranches(s, c, cause);
    s.telemetry.deaths++;
    record(
      s,
      'death',
      'One life ends',
      `${cause}. Generation ${c.generation} remains in your genetic archive.`,
    );
    if (c.id !== s.player.id) return;
    const successor = s.creatures
      .filter((x) => x.speciesId === 'player' && x.health > 0)
      .sort((a, b) => b.generation - a.generation)[0];
    if (successor) {
      s.player = successor;
      s.creatures = s.creatures.filter((x) => x.id !== successor.id);
      reconcileBranches(s);
      record(
        s,
        'inheritance',
        'But the lineage lives',
        `You continue as generation ${successor.generation}. Discoveries and mutation opportunities remain.`,
      );
    } else {
      s.lineage.extinct = true;
      record(
        s,
        'extinction',
        'A lineage becomes a legacy',
        `No living offspring remain. ${s.lineage.legacy} legacy marks and every discovery are preserved.`,
      );
      s.legacies.push(legacyRecord(s, cause));
    }
  }
  private regrow() {
    const s = this.state;
    const pressure = PRESSURES.find((p) => p.id === s.pressure?.id);
    for (const r of s.resources) {
      if (
        !r.active &&
        pressure &&
        (pressure.affectedDiet === 'all' || resourceById[r.type].diet === pressure.affectedDiet)
      )
        r.regrowAt = Math.max(s.time, r.regrowAt + TUNING.needsInterval * (1 - pressure.growth));
      if (!r.active && s.time >= r.regrowAt) {
        // Carrion decomposes back into detritus, closing the local food web.
        if (r.type === 'carrion') r.type = 'organic-flake';
        r.active = true;
      }
    }
  }
  private discover() {
    const s = this.state,
      stats = phenotype(s.player.genome);
    for (const c of s.creatures) {
      if (
        c.speciesId === 'player' ||
        s.discoveries.species.includes(c.speciesId) ||
        distance(s.player, c) > stats.vision
      )
        continue;
      s.discoveries.species.push(c.speciesId);
      s.lineage.points += TUNING.discoveryPoints;
      s.lineage.legacy++;
      record(
        s,
        'discovery',
        `Encountered ${speciesById[c.speciesId].name.toLowerCase()}`,
        speciesById[c.speciesId].description,
      );
    }
  }
  triggerPressure(id: string): ActionResult {
    const pressure = PRESSURES.find((p) => p.id === id);
    if (!pressure) return { ok: false, message: 'Unknown environmental pressure.' };
    this.state.pressure = { id, remaining: pressure.duration ?? TUNING.pressureDuration };
    this.state.nextEventAt = this.state.time + TUNING.pressureInterval + TUNING.pressureDuration;
    record(this.state, 'environment', pressure.name, pressure.description);
    return { ok: true, message: pressure.name };
  }
  refresh() {
    this.rebuild();
  }
  getMetrics() {
    return {
      agents: this.state.creatures.length + 1,
      nearAgents:
        this.state.creatures.filter(
          (c) => distance(c, this.state.player) <= TUNING.nearRadius || c.speciesId === 'player',
        ).length + 1,
      farPopulation:
        this.state.populations.reduce((sum, p) => sum + p.count, 0) -
        this.state.creatures.filter((c) => c.speciesId !== 'player').length,
      lineage: lineagePopulation(this.state),
    };
  }
}
