import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, creature } from '../src/world/generation';
import { Simulation, emptyInput } from '../src/simulation/ecosystem';
import { phenotype, dietFor, validateBody } from '../src/biology/body';
import { applyMutation, mutationReason, removeMutation } from '../src/biology/mutation';
import { reproduce, inheritControl, lineagePopulation } from '../src/biology/reproduction';
import { ORGANS, MUTATIONS, SPECIES, RESOURCES, TUNING } from '../src/data/content';
import { decodeSave, encodeSave, loadGame, saveGame, SAVE_KEY, BACKUP_KEY } from '../src/core/save';
import { random, streams } from '../src/core/random';
import { SpatialGrid } from '../src/world/spatial';
import { chooseGoal } from '../src/simulation/ai';
import { updatePopulations, foodWeb } from '../src/simulation/population';
import { debugCommand } from '../src/core/debug';
import type { Creature, Resource } from '../src/core/types';

function ready(state = createGame()) {
  state.lineage.points = 50;
  state.lineage.biomass = 200;
  state.player.age = 20;
  state.player.energy = 100;
  return state;
}
function quiet(state = createGame()) {
  // Remove represented wildlife consistently; far counts remain aggregate populations.
  state.creatures = [];
  return state;
}
function advance(sim: Simulation, seconds: number) {
  for (let i = 0; i < Math.round(seconds / TUNING.step); i++) sim.step();
}

test('vertical slice catalog is complete, unique, and valid', () => {
  assert.equal(ORGANS.length, 30);
  assert.equal(MUTATIONS.length, 50);
  assert.equal(SPECIES.length, 10);
  assert.equal(RESOURCES.length, 15);
  for (const catalog of [ORGANS, MUTATIONS, SPECIES, RESOURCES])
    assert.equal(new Set(catalog.map((x) => x.id)).size, catalog.length);
  for (const species of SPECIES) assert.equal(validateBody(species.genome), null, species.id);
  for (const mutation of MUTATIONS)
    for (const id of [...mutation.requires, ...mutation.excludes])
      assert.ok(MUTATIONS.some((x) => x.id === id));
});
test('seed determinism includes terrain, resources, organisms, and independent RNG streams', () => {
  assert.deepEqual(createGame('a world'), createGame('a world'));
  assert.notDeepEqual(
    createGame('a world').world.features,
    createGame('another world').world.features,
  );
  const a = streams('seed'),
    b = streams('seed');
  random(a, 'mutation');
  random(a, 'mutation');
  assert.equal(random(a, 'world'), random(b, 'world'));
});
test('phenotype derives organ tradeoffs and diet in a single calculation', () => {
  const state = ready();
  const before = phenotype(state.player.genome);
  assert.ok(applyMutation(state, 'mineral-shell').ok);
  const after = phenotype(state.player.genome);
  assert.equal(after.defense - before.defense, 5);
  assert.equal(after.speed - before.speed, -18);
  assert.equal(after.mass - before.mass, 4);
  assert.ok(dietFor(state.player.genome).includes('mineral'));
  assert.ok(applyMutation(state, 'predatory-jaw').ok);
  assert.ok(dietFor(state.player.genome).includes('meat'));
});
test('each mutation has a mechanical effect and can be reached through its graph', () => {
  for (const target of MUTATIONS) {
    const state = ready();
    const install = (id: string) => {
      const m = MUTATIONS.find((x) => x.id === id)!;
      for (const requirement of m.requires)
        if (!state.player.genome.mutations.includes(requirement)) install(requirement);
      const before = { stats: phenotype(state.player.genome), diet: dietFor(state.player.genome) };
      assert.ok(applyMutation(state, id).ok, id);
      assert.notDeepEqual(
        { stats: phenotype(state.player.genome), diet: dietFor(state.player.genome) },
        before,
        id,
      );
    };
    install(target.id);
  }
});
test('mutation prerequisites, incompatible branches, duplicate choices, and budgets reject atomically', () => {
  const state = ready();
  assert.match(mutationReason(state, 'serrated-jaw')!, /Requires/);
  assert.ok(applyMutation(state, 'filter-mouth').ok);
  const genome = structuredClone(state.player.genome),
    points = state.lineage.points;
  assert.equal(applyMutation(state, 'predatory-jaw').ok, false);
  assert.equal(applyMutation(state, 'filter-mouth').ok, false);
  assert.deepEqual(state.player.genome, genome);
  assert.equal(state.lineage.points, points);
  state.lineage.points = 0;
  assert.match(mutationReason(state, 'light-eye')!, /earn/);
  state.lineage.points = 50;
  state.lineage.biomass = 0;
  assert.match(mutationReason(state, 'light-eye')!, /biomass/);
  const heavy = ready();
  for (const id of [
    'mineral-shell',
    'larger-core',
    'deep-reserves',
    'reinforced-shell',
    'brood-sac',
  ])
    assert.ok(applyMutation(heavy, id).ok, id);
  assert.equal(phenotype(heavy.player.genome).mass, 18);
  assert.match(mutationReason(heavy, 'light-eye')!, /mass exceeds/);
});
test('organ replacement and removal enforce slots and dependent adaptations', () => {
  const state = ready();
  assert.ok(applyMutation(state, 'strong-tail').ok);
  assert.equal(state.player.genome.organs.includes('cilia'), false);
  assert.ok(applyMutation(state, 'swift-tail').ok);
  assert.equal(removeMutation(state, 'strong-tail').ok, false);
  assert.ok(removeMutation(state, 'swift-tail').ok);
  assert.ok(removeMutation(state, 'strong-tail').ok);
  assert.ok(state.player.genome.organs.includes('cilia'));
  assert.ok(state.discoveries.mutations.includes('strong-tail'));
});
test('movement is frame-independent, bounded, and sprint trades stamina and energy for speed', () => {
  const a = new Simulation(quiet()),
    b = new Simulation(quiet());
  const x = a.state.player.x;
  for (let i = 0; i < 30; i++) {
    a.step({ ...emptyInput(), x: 1 });
    b.step({ ...emptyInput(), x: 1, sprint: true });
  }
  assert.ok(Math.abs(a.state.player.x - x - phenotype(a.state.player.genome).speed) < 1e-6);
  assert.ok(b.state.player.x > a.state.player.x);
  assert.ok(b.state.player.stamina < 100);
  a.state.player.x = a.state.world.width - 26;
  a.step({ ...emptyInput(), x: 1 });
  assert.ok(a.state.player.x <= a.state.world.width - 25);
});
test('food restores energy, grants biomass and opportunities, then regrows', () => {
  const state = quiet();
  state.player.energy = 25;
  for (let i = 0; i < 4; i++)
    Object.assign(state.resources[i], {
      x: state.player.x,
      y: state.player.y,
      type: 'green-algae',
    });
  const sim = new Simulation(state);
  for (let i = 0; i < 4; i++) assert.ok(sim.feed(state.player).ok);
  assert.equal(state.telemetry.foodEaten, 4);
  assert.equal(state.lineage.biomass, TUNING.initialBiomass + 12);
  assert.equal(state.lineage.points, TUNING.initialPoints + 1);
  assert.equal(state.player.energy, 89);
  assert.equal(state.resources[0].active, false);
  state.player.x = 25;
  state.player.y = 25;
  advance(sim, 51);
  assert.equal(state.resources[0].active, true);
});
test('diet restrictions prevent digesting meat until the correct organ evolves', () => {
  const state = ready(quiet());
  state.resources.forEach((r) => (r.active = false));
  Object.assign(state.resources[0], {
    active: true,
    type: 'carrion',
    x: state.player.x,
    y: state.player.y,
  });
  const sim = new Simulation(state);
  assert.equal(sim.feed(state.player).ok, false);
  applyMutation(state, 'predatory-jaw');
  assert.ok(sim.feed(state.player).ok);
});
test('reproduction consumes resources, inherits independent genomes, and grows offspring', () => {
  const state = ready(quiet());
  applyMutation(state, 'light-eye');
  const energy = state.player.energy,
    biomass = state.lineage.biomass;
  assert.ok(reproduce(state).ok);
  assert.equal(lineagePopulation(state), 2);
  assert.equal(state.player.energy, energy - TUNING.reproductionEnergy);
  assert.equal(state.lineage.biomass, biomass - TUNING.reproductionBiomass);
  const child = state.creatures[0];
  assert.deepEqual(child.genome, state.player.genome);
  assert.notEqual(child.genome, state.player.genome);
  assert.equal(child.generation, 2);
  assert.equal(inheritControl(state, child.id).ok, false);
  applyMutation(state, 'mineral-shell');
  assert.equal(child.genome.organs.includes('shell'), false);
  const sim = new Simulation(state);
  advance(sim, 31);
  assert.equal(child.juvenile, 0);
  assert.ok(inheritControl(state, child.id).ok);
  assert.equal(state.player.id, child.id);
});
test('brood and parental care change offspring count, energy costs, and growth time', () => {
  const state = ready(quiet());
  applyMutation(state, 'brood-sac');
  applyMutation(state, 'parental-care');
  const energy = state.player.energy;
  assert.ok(reproduce(state).ok);
  assert.equal(state.creatures.length, 2);
  assert.equal(state.creatures[0].juvenile, TUNING.juvenileTime * 0.6);
  assert.ok(state.player.energy > energy - TUNING.reproductionEnergy);
});
test('individual death transfers control to an offspring and preserves knowledge', () => {
  const state = ready(quiet());
  applyMutation(state, 'light-eye');
  reproduce(state);
  const old = state.player.id,
    points = state.lineage.points,
    sim = new Simulation(state);
  sim.die(state.player, 'Test predation');
  assert.equal(state.lineage.extinct, false);
  assert.notEqual(state.player.id, old);
  assert.equal(state.player.generation, 2);
  assert.equal(state.lineage.points, points);
  assert.ok(state.discoveries.mutations.includes('light-eye'));
  assert.equal(state.lineage.archive.find((a) => a.id === old)!.cause, 'Test predation');
  advance(sim, 31);
  assert.equal(state.player.juvenile, 0);
  assert.doesNotThrow(() => encodeSave(state));
});
test('last individual death creates a persistent legacy and freezes the simulation', () => {
  const state = quiet();
  const sim = new Simulation(state);
  sim.die(state.player, 'Starvation');
  assert.ok(state.lineage.extinct);
  assert.equal(state.legacies[0].cause, 'Starvation');
  assert.equal(lineagePopulation(state), 0);
  const before = encodeSave(state);
  advance(sim, 20);
  assert.equal(encodeSave(state), before);
});
test('combat is organ-driven, honors armor and creates food after death', () => {
  const state = ready(quiet());
  state.resources.forEach((r) => (r.active = false));
  applyMutation(state, 'predatory-jaw');
  const prey = creature(
    'test-prey',
    'grazer',
    SPECIES[0].genome,
    state.player.x + 35,
    state.player.y,
  );
  prey.health = 1;
  state.creatures.push(prey);
  const sim = new Simulation(state),
    population = state.populations[0].count;
  assert.ok(sim.act().ok);
  assert.equal(state.telemetry.hunts, 1);
  assert.equal(state.populations[0].count, population - 1);
  assert.ok(state.resources.some((r) => r.type === 'carrion' && r.active));
  assert.equal(state.creatures.length, 0);
});
test('utility AI flees immediate threats and seeks compatible food when hungry', () => {
  const state = createGame(),
    grazer = state.creatures.find((c) => c.speciesId === 'grazer')!;
  const predator = creature('threat', 'stalker', SPECIES[2].genome, grazer.x + 10, grazer.y);
  const agents = new SpatialGrid<Creature>(),
    resources = new SpatialGrid<Resource>();
  agents.rebuild([grazer, predator]);
  resources.rebuild([]);
  assert.equal(chooseGoal(state, grazer, agents, resources).name, 'flee');
  agents.rebuild([grazer]);
  grazer.energy = 5;
  resources.rebuild([
    { id: 999, type: 'green-algae', x: grazer.x + 30, y: grazer.y, active: true, regrowAt: 0 },
  ]);
  assert.equal(chooseGoal(state, grazer, agents, resources).name, 'feed');
});
test('drought changes food fitness and documents its causal population pressure', () => {
  const normal = createGame('pressure'),
    dry = createGame('pressure');
  new Simulation(dry).triggerPressure('drought');
  updatePopulations(normal);
  updatePopulations(dry);
  assert.ok(dry.populations[0].fitness < normal.populations[0].fitness);
  assert.match(dry.populations[0].cause, /Drought/);
  assert.ok(foodWeb().some((e) => e.predator === 'stalker' && e.prey === 'grazer'));
});
test('far simulation keeps populations nonnegative and represented creatures conserved', () => {
  const state = createGame('balance');
  for (let i = 0; i < 100; i++) updatePopulations(state);
  for (const p of state.populations)
    assert.ok(p.count >= state.creatures.filter((c) => c.speciesId === p.speciesId).length);
  assert.ok(state.creatures.length <= SPECIES.length * TUNING.maxAgentsPerSpecies);
});
test('saved random streams and clocks replay exactly after load', () => {
  const a = new Simulation(ready(createGame('replay')));
  advance(a, 35);
  const b = new Simulation(decodeSave(encodeSave(a.state)));
  advance(a, 20);
  advance(b, 20);
  assert.deepEqual(b.state, a.state);
});
test('save replay remains exact across different seeds and spatial index boundaries', () => {
  for (let seed = 0; seed < 12; seed++) {
    const a = new Simulation(ready(createGame(`boundary-${seed}`)));
    for (let tick = 0; tick < 127 + seed; tick++) a.step({ ...emptyInput(), x: 0.7, y: -0.3 });
    const b = new Simulation(decodeSave(encodeSave(a.state)));
    for (let tick = 0; tick < 180; tick++) {
      const input = {
        ...emptyInput(),
        x: Math.sin(tick * 0.02),
        y: Math.cos(tick * 0.02),
        action: tick % 19 === 0,
      };
      a.step(structuredClone(input));
      b.step(structuredClone(input));
    }
    assert.deepEqual(a.state, b.state, `seed ${seed}`);
  }
});
test('archived lineages retain complete genomes and journals through save/load', () => {
  const state = ready(quiet());
  applyMutation(state, 'light-eye');
  new Simulation(state).die(state.player, 'Test extinction');
  const restored = decodeSave(encodeSave(state));
  assert.deepEqual(restored.legacies[0].archive[0].genome, state.player.genome);
  assert.equal(restored.legacies[0].history.at(-1)!.type, 'extinction');
  const before = encodeSave(state);
  new Simulation(state).die(state.player, 'Repeated command');
  assert.equal(encodeSave(state), before);
});
test('v2 summary-only legacy records migrate without inventing missing history', () => {
  const old = JSON.parse(encodeSave(createGame()));
  old.schemaVersion = 2;
  old.legacies = [
    {
      name: 'Earlier Velari',
      seed: 'EARLIER',
      duration: 120,
      peak: 3,
      adaptations: ['light-eye'],
      cause: 'Starvation',
    },
  ];
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.legacies[0].name, 'Earlier Velari');
  assert.deepEqual(migrated.legacies[0].archive, []);
  assert.deepEqual(migrated.legacies[0].history, []);
});
test('save roundtrip includes offspring, mutations, events, discoveries, and settings', () => {
  const state = ready(createGame());
  applyMutation(state, 'light-eye');
  reproduce(state);
  new Simulation(state).triggerPressure('drought');
  state.settings.reducedMotion = true;
  assert.deepEqual(decodeSave(encodeSave(state)), state);
});
test('v1 saves migrate with accessibility defaults, stamina, telemetry, and legacy records', () => {
  const old = JSON.parse(encodeSave(createGame()));
  old.schemaVersion = 1;
  delete old.settings;
  delete old.telemetry;
  delete old.legacies;
  delete old.player.stamina;
  const migrated = decodeSave(JSON.stringify(old));
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.player.stamina, 100);
  assert.equal(migrated.settings.control, 'hybrid');
});
test('malformed, incompatible, and inconsistent saves are rejected before use', () => {
  assert.throws(() => decodeSave('no'), /valid JSON/);
  for (const mutate of [
    (s: any) => (s.schemaVersion = 99),
    (s: any) => s.player.genome.organs.push('not-real'),
    (s: any) => (s.rng = {}),
    (s: any) => (s.world.width = -3),
    (s: any) => (s.populations[0].count = 0),
    (s: any) => (s.player.energy = null),
    (s: any) => (s.resources[1].id = s.resources[0].id),
    (s: any) => (s.lineage.archive = []),
  ]) {
    const state = JSON.parse(encodeSave(createGame()));
    mutate(state);
    assert.throws(() => decodeSave(JSON.stringify(state)), /Invalid save/);
  }
});
test('storage failures report errors, and damaged saves recover a valid backup', () => {
  const records = new Map<string, string>();
  const storage = {
    getItem: (k: string) => records.get(k) ?? null,
    setItem: (k: string, v: string) => {
      records.set(k, v);
    },
  };
  const state = createGame();
  assert.ok(saveGame(state, storage).ok);
  state.settings.sound = true;
  assert.ok(saveGame(state, storage).ok);
  assert.ok(records.has(BACKUP_KEY));
  records.set(SAVE_KEY, '{bad');
  const loaded = loadGame(storage);
  assert.ok(loaded.state);
  assert.match(loaded.warning!, /recovered/);
  assert.equal(loaded.state.settings.sound, false);
  assert.equal(
    saveGame(state, {
      ...storage,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    }).ok,
    false,
  );
});
test('spatial queries match brute force and exclude distant cells', () => {
  const points = Array.from({ length: 100 }, (_, i) => ({ x: i * 17, y: (i % 8) * 35 }));
  const grid = new SpatialGrid(60);
  grid.rebuild(points);
  const center = { x: 300, y: 100 },
    radius = 155;
  const actual = grid.query(center, radius).sort((a, b) => a.x - b.x);
  assert.deepEqual(
    actual,
    points.filter((p) => Math.hypot(p.x - center.x, p.y - center.y) <= radius),
  );
});
test('developer commands reject invalid inputs and preserve valid save state', () => {
  const sim = new Simulation(createGame());
  assert.equal(debugCommand(sim, '/advance banana').ok, false);
  assert.equal(debugCommand(sim, '/population grazer -2').ok, false);
  assert.equal(debugCommand(sim, '/spawn unknown').ok, false);
  assert.ok(debugCommand(sim, '/population grazer 0').ok);
  assert.equal(
    sim.state.creatures.some((c) => c.speciesId === 'grazer'),
    false,
  );
  assert.ok(debugCommand(sim, '/points 10').ok);
  assert.equal(sim.state.lineage.points, 10);
  assert.doesNotThrow(() => encodeSave(sim.state));
});
