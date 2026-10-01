import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/world/generation';
import { Simulation, emptyInput } from '../src/simulation/ecosystem';
import { phenotype, validateBody } from '../src/biology/body';
import {
  STARTS,
  CHALLENGES,
  configureStart,
  adoptVariation,
  adoptTrait,
  removeVariation,
  refreshObjectives,
  claimObjective,
  naturalSelection,
  tickReplay,
  variations,
} from '../src/progression/replay';
import { encodeSave, decodeSave } from '../src/core/save';
import { climate } from '../src/world/regions';
import { addStatus, environmentNeeds } from '../src/biology/conditions';
test('all six starts and eleven challenge worlds are playable and persist', () => {
  for (const start of STARTS)
    for (const challenge of CHALLENGES) {
      const s = createGame('start-matrix');
      assert.ok(
        configureStart(
          s,
          start.id,
          challenge.id,
          STARTS.map((p) => p.id),
        ).ok,
        `${start.id}/${challenge.id}`,
      );
      assert.equal(validateBody(s.player.genome), null);
      assert.deepEqual(decodeSave(encodeSave(s)), s);
      const sim = new Simulation(s);
      for (let i = 0; i < 30; i++) sim.step();
      assert.ok(s.player.health > 0);
    }
});
test('world modifiers alter climate, movement and resource scarcity', () => {
  const a = createGame(),
    b = createGame();
  configureStart(a, 'microbe', 'normal', ['microbe']);
  configureStart(b, 'microbe', 'heat', ['microbe']);
  assert.equal(climate(b, b.player).temperature - climate(a, a.player).temperature, 20);
  configureStart(b, 'microbe', 'high-gravity', ['microbe']);
  const ax = a.player.x,
    bx = b.player.x,
    input = { ...emptyInput(), x: 1 };
  new Simulation(a).step(input);
  new Simulation(b).step({ ...input });
  assert.ok(b.player.x - bx < a.player.x - ax);
  const small = createGame();
  configureStart(small, 'microbe', 'tiny', ['microbe']);
  assert.equal(small.world.width, a.world.width / 2);
});
test('adaptive variations have bounded slots, tradeoffs, deterministic generation and removal', () => {
  const s = createGame();
  s.lineage.points = 20;
  s.lineage.biomass = 100;
  assert.deepEqual(variations('seed', 3), variations('seed', 3));
  assert.notDeepEqual(variations('seed', 3), variations('seed', 4));
  const before = phenotype(s.player.genome);
  assert.ok(adoptVariation(s, s.progression.variations[0].id).ok);
  assert.notDeepEqual(phenotype(s.player.genome), before);
  const id = s.player.genome.variations![0].id;
  assert.ok(removeVariation(s, id).ok);
  assert.deepEqual(phenotype(s.player.genome), before);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('behavior choices enforce incompatibilities and are inherited gameplay modifiers', () => {
  const s = createGame();
  s.lineage.points = 20;
  s.lineage.biomass = 100;
  assert.ok(adoptTrait(s, 'solitary').ok);
  assert.equal(adoptTrait(s, 'herd').ok, false);
  assert.ok(phenotype(s.player.genome).stealth > 0);
  assert.ok(adoptTrait(s, 'solitary').ok);
  assert.ok(adoptTrait(s, 'herd').ok);
  assert.ok(phenotype(s.player.genome).sociality > 0);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('objective rewards cannot be claimed twice and new objectives continue', () => {
  const s = createGame();
  refreshObjectives(s);
  const o = s.progression.objectives[0];
  assert.equal(claimObjective(s, o.id).ok, false);
  o.kind = 'food';
  o.baseline = 0;
  s.telemetry.foodEaten = o.target;
  const before = s.lineage.points;
  assert.ok(claimObjective(s, o.id).ok);
  assert.equal(s.lineage.points, before + 2);
  assert.equal(claimObjective(s, o.id).ok, false);
  assert.equal(s.progression.objectives.filter((o) => !o.claimed).length, 3);
});
test('natural selection creates valid inherited wild genomes and rare apex events', () => {
  const s = createGame();
  for (let i = 0; i < 50; i++) naturalSelection(s);
  assert.ok(s.progression.selectionEvents > 0);
  for (const g of Object.values(s.progression.wildGenomes)) assert.equal(validateBody(g), null);
  s.time = 180;
  s.tick = 5400;
  tickReplay(s);
  assert.ok(s.progression.apex);
  const c = s.creatures.find((c) => c.id === s.progression.apex!.id)!;
  assert.ok(phenotype(c.genome).health > 200);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('generic wound and regeneration statuses produce measurable health effects', () => {
  const s = createGame();
  s.player.health = 40;
  addStatus(s, s.player, 'bleeding', 8, 'Claw wound');
  environmentNeeds(s, s.player, 1);
  assert.ok(s.player.health < 40);
  s.evolution.statuses[s.player.id] = [];
  s.player.health = 40;
  addStatus(s, s.player, 'regenerating', 5, 'Healing tissue');
  environmentNeeds(s, s.player, 1);
  assert.ok(s.player.health > 40);
});
