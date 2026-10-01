import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/world/generation';
import { applyMutation } from '../src/biology/mutation';
import { reproduce } from '../src/biology/reproduction';
import { Simulation } from '../src/simulation/ecosystem';
import { encodeSave, decodeSave } from '../src/core/save';
import { MATERIALS } from '../src/society/types';
import { TECHNOLOGIES } from '../src/data/society';
import * as society from '../src/society/society';
export function intelligent() {
  const s = createGame('society-test');
  s.lineage.points = 100;
  s.lineage.biomass = 500;
  s.player.age = 20;
  for (const id of [
    'light-eye',
    'associative-brain',
    'jointed-legs',
    'manipulating-digits',
    'vocal-language',
    'social-memory',
    'air-lungs',
  ])
    assert.ok(applyMutation(s, id).ok, id);
  for (let i = 0; i < 2; i++) {
    s.player.energy = 150;
    s.player.reproductionCooldown = 0;
    assert.ok(reproduce(s).ok);
  }
  for (const m of MATERIALS) s.society.stock[m] = 250;
  s.society.knowledge = 1000;
  return s;
}
function finish(s: ReturnType<typeof createGame>, seconds = 100) {
  for (let i = 0; i < seconds * 2; i++) society.tickSociety(s, 0.5);
}
test('intelligence unlocks meaningful learning and tools with resource conservation', () => {
  const s = intelligent();
  assert.equal(society.intelligenceReason(s, true), null);
  assert.equal(society.craft(s, 'stone-axe').ok, false);
  const stone = s.society.stock.stone;
  assert.ok(society.research(s, 'stonecraft').ok);
  assert.equal(s.society.stock.stone, stone - 4);
  finish(s, 20);
  assert.ok(s.society.technologies.includes('stonecraft'));
  assert.ok(society.craft(s, 'stone-axe').ok);
  const wood = s.society.stock.wood;
  assert.ok(society.gather(s, 'wood').ok);
  assert.ok(s.society.stock.wood > wood);
  assert.equal(society.gather(s, 'wood').ok, false);
  assert.equal(s.society.memory.length, 1);
  assert.ok(society.toolBonus(s, 'gather') > 0);
});
test('settlements, professions, buildings and trade run through the economy', () => {
  const s = intelligent();
  assert.ok(society.foundSettlement(s, 'First Haven').ok);
  const t = s.society.settlements[0];
  assert.equal(society.assignProfession(s, t.id, 'medic', 1).ok, false);
  assert.ok(society.assignProfession(s, t.id, 'gatherer', -1).ok);
  assert.ok(society.assignProfession(s, t.id, 'builder', 1).ok);
  for (const id of ['stonecraft', 'weaving', 'fire', 'construction', 'trade']) {
    assert.ok(society.research(s, id).ok, id);
    finish(s, 40);
  }
  const cost = s.society.stock.stone;
  assert.ok(society.construct(s, t.id, 'well').ok);
  assert.equal(s.society.stock.stone, cost - 12);
  finish(s, 40);
  assert.equal(t.buildings.well, 1);
  const n = s.society.neighbors[0];
  assert.ok(society.diplomacy(s, n.id, 'gift').ok);
  assert.ok(society.diplomacy(s, n.id, 'route').ok);
  const before = s.society.stock[n.specialty];
  finish(s, 5);
  assert.ok(s.society.stock[n.specialty] > before);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('every authored technology can be researched in order through space', () => {
  const s = intelligent();
  assert.ok(society.foundSettlement(s, 'Future Haven').ok);
  for (const tech of TECHNOLOGIES) {
    for (const m of MATERIALS) s.society.stock[m] = 250;
    s.society.knowledge = 1000;
    assert.ok(society.research(s, tech.id).ok, tech.id);
    finish(s, tech.seconds + 1);
    assert.ok(s.society.technologies.includes(tech.id));
  }
  assert.equal(s.society.era, 'space');
  assert.ok(society.policy(s, 'law', 'conservation').ok);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('a settlement citizen continues the biological lineage after represented relatives die', () => {
  const s = intelligent();
  assert.ok(society.foundSettlement(s, 'Living Archive').ok);
  const sim = new Simulation(s);
  for (const c of [...s.creatures].filter((c) => c.speciesId === 'player')) sim.die(c, 'Test');
  sim.die(s.player, 'Test');
  assert.equal(s.lineage.extinct, false);
  assert.match(s.player.id, /citizen/);
  assert.equal(s.society.settlements[0].population, 2);
  assert.equal(s.evolution.fossils.length, 0);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('societal research and economy replay identically across save/load', () => {
  const s = intelligent();
  assert.ok(society.foundSettlement(s, 'Determinist').ok);
  assert.ok(society.research(s, 'stonecraft').ok);
  const a = new Simulation(s),
    b = new Simulation(decodeSave(encodeSave(s)));
  for (let i = 0; i < 600; i++) {
    a.step();
    b.step();
  }
  assert.deepEqual(a.state, b.state);
  const malformed: any = JSON.parse(encodeSave(s));
  malformed.society.settlements[0].jobs.scholar = 999;
  assert.throws(() => decodeSave(JSON.stringify(malformed)), /society/);
});
