import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/world/generation';
import { decodeSave, encodeSave, SAVE_VERSION } from '../src/core/save';
import { validBindings, DEFAULT_KEYS } from '../src/core/controls';
import { updatePopulations } from '../src/simulation/population';
import { terrainAt } from '../src/world/terrain';
import { Simulation } from '../src/simulation/ecosystem';
import { TUNING } from '../src/data/content';
test('all intermediate released schemas migrate without losing the original lineage', () => {
  for (const version of [3, 4, 5, 6]) {
    const s: any = createGame('older-world');
    s.schemaVersion = version;
    if (version < 4) delete s.evolution;
    if (version < 5) delete s.society;
    if (version < 6) delete s.space;
    if (version < 7) delete s.progression;
    const restored = decodeSave(JSON.stringify(s));
    assert.equal(restored.schemaVersion, SAVE_VERSION);
    assert.equal(restored.player.id, s.player.id);
    assert.equal(restored.lineage.name, s.lineage.name);
    assert.doesNotThrow(() => encodeSave(restored));
  }
});
test('malformed extended genomes, terrain, controls and mission data are rejected', () => {
  const changes = [
    (s: any) =>
      (s.player.genome.appearance = {
        color: '#ffffff',
        proportions: 1,
        placements: { eye: { x: 1e20, y: 0 } },
      }),
    (s: any) =>
      (s.player.genome.variations = [
        { id: 'bad', name: 'bad', description: 'bad', modifiers: { mass: -100 } },
      ]),
    (s: any) => (s.settings.keys = { ...DEFAULT_KEYS, up: 'p' }),
    (s: any) => s.world.terrain.heights.push(2),
    (s: any) => (s.lineage.archive[0].coParent = 'missing'),
    (s: any) => (s.progression.variations[0].modifiers.magic = 9),
  ];
  for (const change of changes) {
    const s = createGame();
    change(s);
    assert.throws(() => decodeSave(JSON.stringify(s)));
  }
  assert.ok(validBindings(DEFAULT_KEYS));
  assert.equal(validBindings({ ...DEFAULT_KEYS, up: 'pause' }), false);
});
test('regional population allocations conserve the global population and rivers retain moisture', () => {
  const s = createGame('hydrology');
  updatePopulations(s);
  for (const p of s.populations)
    assert.equal(
      s.evolution.regions.reduce((n, r) => n + r.population[p.speciesId], 0),
      p.count,
    );
  const river = s.world.terrain!.rivers[0][5];
  assert.equal(terrainAt(s, river).moisture, 1);
  assert.deepEqual(createGame(' trimmed '), createGame('trimmed'));
});
test('procedural environmental severity is deterministic and persisted', () => {
  const a = new Simulation(createGame('pressures')),
    b = new Simulation(createGame('pressures'));
  a.triggerPressure('winter', true);
  b.triggerPressure('winter', true);
  assert.deepEqual(a.state.pressure, b.state.pressure);
  assert.ok(a.state.pressure!.severity! >= 0.7);
  assert.deepEqual(decodeSave(encodeSave(a.state)), a.state);
});
test('food collapse can extinguish dormant represented populations without ghost reserves', () => {
  const s = createGame('extinction-accounting');
  s.resources.forEach((r) => (r.active = false));
  for (const c of s.creatures) {
    c.x = 25;
    c.y = 25;
    assert.ok(Math.hypot(c.x - s.player.x, c.y - s.player.y) > TUNING.nearRadius);
  }
  for (let i = 0; i < 1000; i++) updatePopulations(s);
  assert.ok(s.populations.some((p) => p.count === 0));
  for (const p of s.populations)
    assert.ok(p.count >= s.creatures.filter((c) => c.speciesId === p.speciesId).length);
  assert.doesNotThrow(() => encodeSave(s));
});
