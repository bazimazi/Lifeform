import type { Creature, GameState, Resource, Vec } from '../core/types';
import { phenotype, dietFor } from '../biology/body';
import { distance, random } from '../core/random';
import { speciesById, resourceById, SPECIES, TUNING } from '../data/content';
import type { SpatialGrid } from '../world/spatial';
import { climate, biomeById } from '../world/regions';
import { shelterDefense } from '../society/society';

export interface UtilityGoal {
  score: number;
  name: string;
  target: Vec;
}
export function chooseGoal(
  state: GameState,
  c: Creature,
  agents: SpatialGrid<Creature>,
  resources: SpatialGrid<Resource>,
): UtilityGoal {
  const stats = phenotype(c.genome),
    definition = speciesById[c.speciesId];
  const near = agents
    .query(c, stats.vision + stats.hearing * 0.4)
    .filter(
      (x) =>
        x.id !== c.id &&
        x.health > 0 &&
        distance(c, x) <= (stats.vision + stats.hearing * 0.4) * (1 - phenotype(x.genome).stealth),
    );
  const traits = c.genome.traits ?? [];
  const preyIds =
    definition?.prey ??
    (traits.includes('pack-hunting') || traits.includes('cooperative')
      ? ['drifter', 'grazer', 'leafback']
      : []);
  const predatorIds =
    definition?.predators ?? SPECIES.filter((s) => s.prey.includes('player')).map((s) => s.id);
  const goals: UtilityGoal[] = [];
  if (traits.includes('migratory')) {
    const local = climate(state, c);
    if (local.temperature > stats.heatTolerance || local.temperature < 10 - stats.coldTolerance) {
      const target = state.evolution.regions
        .filter((r) => biomeById[r.biomeId].aquatic === stats.walking < 0.5)
        .sort((a, b) => Math.abs(a.temperature - 22) - Math.abs(b.temperature - 22))[0];
      if (target)
        goals.push({
          name: 'migrate',
          score: 1.2,
          target: { x: target.x + target.width / 2, y: target.y + target.height / 2 },
        });
    }
  }
  const kin = near.filter((x) => x.speciesId === c.speciesId);
  if (traits.includes('solitary') && kin[0] && distance(c, kin[0]) < 100)
    goals.push({
      name: 'solitary',
      score: 0.8,
      target: { x: c.x + (c.x - kin[0].x), y: c.y + (c.y - kin[0].y) },
    });
  if ((traits.includes('herd') || traits.includes('social') || stats.sociality > 20) && kin.length)
    goals.push({
      name: 'herd',
      score: 0.55,
      target: {
        x: kin.reduce((n, k) => n + k.x, 0) / kin.length,
        y: kin.reduce((n, k) => n + k.y, 0) / kin.length,
      },
    });
  if (traits.includes('territorial')) {
    const home =
      state.progression.apex?.id === c.id
        ? state.evolution.regions.find((r) => r.id === state.progression.apex!.regionId)
        : undefined;
    const nest = state.evolution.nests.find((n) => distance(n, c) < 300);
    const target = home ? { x: home.x + home.width / 2, y: home.y + home.height / 2 } : nest;
    if (target && distance(c, target) > 100) goals.push({ name: 'guard', score: 0.9, target });
  }
  if (traits.includes('parental-care')) {
    const child = kin.find((k) => k.juvenile > 0);
    if (child && distance(c, child) > 40)
      goals.push({ name: 'protect', score: 0.85, target: child });
  }
  if (stats.memory > 0 && c.speciesId === 'player' && c.energy < stats.energy * 0.5) {
    const memory = state.society.memory
      .filter((m) => dietFor(c.genome).includes(resourceById[m.resource]?.diet))
      .sort((a, b) => distance(c, a) - distance(c, b))[0];
    if (memory) goals.push({ name: 'remember', score: 0.65, target: memory });
  }
  const isPlayerHunter = state.player.genome.organs.includes('jaw');
  for (const other of near) {
    if (predatorIds.includes(other.speciesId) && (other.speciesId !== 'player' || isPlayerHunter)) {
      const d = distance(c, other);
      goals.push({
        score: 1.5 - d / stats.vision + (c.health < stats.health / 2 ? 0.5 : 0),
        name: 'flee',
        target: { x: c.x + (c.x - other.x) * 2, y: c.y + (c.y - other.y) * 2 },
      });
    }
    if (
      preyIds.includes(other.speciesId) &&
      other.juvenile >= 0 &&
      c.energy / stats.energy < TUNING.predatorHungerThreshold
    ) {
      // Small predators avoid a well-armored or stronger target.
      const opponent = phenotype(other.genome);
      const risk =
        (opponent.defense >= stats.attack * 0.7 ? 0.6 : 0) +
        (shelterDefense(state, other) >= stats.attack ? 1.5 : 0);
      goals.push({
        score:
          1 -
          c.energy / stats.energy +
          (definition?.aggression ?? 0) * (state.evolution.challenge === 'predators' ? 0.8 : 0.45) -
          (distance(c, other) / stats.vision) * 0.3 -
          risk,
        name: 'hunt',
        target: other,
      });
    }
  }
  const diet = definition?.diet ?? dietFor(c.genome);
  for (const food of resources.query(c, stats.vision + stats.smell)) {
    if (!food.active || !diet.includes(resourceById[food.type].diet)) continue;
    goals.push({
      score: 0.4 + (1 - c.energy / stats.energy) * 0.6 - (distance(c, food) / stats.vision) * 0.3,
      name: 'feed',
      target: food,
    });
  }
  if (c.speciesId === 'player' && distance(c, state.player) > 130) {
    goals.push({
      score: c.juvenile > 0 ? 0.85 : 0.5,
      name: 'follow',
      target: { x: state.player.x - 60, y: state.player.y + 35 },
    });
  }
  if (distance(c, c.intent) < 30 || c.behavior !== 'wander') {
    c.intent = {
      x: c.x + (random(state.rng, 'simulation') - 0.5) * 350,
      y: c.y + (random(state.rng, 'simulation') - 0.5) * 350,
    };
  }
  goals.push({ score: 0.08, name: 'wander', target: c.intent });
  return goals.reduce((best, goal) => (goal.score > best.score ? goal : best));
}
