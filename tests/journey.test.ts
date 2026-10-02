import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/world/generation';
import { applyMutation, removeMutation } from '../src/biology/mutation';
import { phenotype } from '../src/biology/body';
import { TUNING, resourceById } from '../src/data/content';
import { journey, nearestFood } from '../src/presentation/journey';

test('quest milestones survive removing an adaptation and follow saved births', () => {
  const s = createGame('guided-journey');
  assert.equal(journey(s).action, 'food');
  s.telemetry.foodEaten = 1;
  assert.equal(journey(s).action, 'adapt');
  assert.ok(applyMutation(s, 'light-eye').ok);
  assert.equal(journey(s).step, 2);
  assert.ok(removeMutation(s, 'light-eye').ok);
  assert.equal(journey(s).step, 2);
  s.telemetry.births = 1;
  assert.deepEqual(journey(s).completed, [true, true, true]);
  assert.equal(journey(s).step, 3);
});

test('birth guidance uses the current body cost and respects readiness', () => {
  const s = createGame('birth-guidance');
  s.telemetry.foodEaten = 1;
  s.lineage.points = 10;
  s.lineage.biomass = 100;
  assert.ok(applyMutation(s, 'brood-sac').ok);
  assert.ok(applyMutation(s, 'parental-care').ok);
  const stats = phenotype(s.player.genome);
  const cost = Math.ceil(TUNING.reproductionBiomass * stats.reproductionCost);
  s.lineage.biomass = 0;
  assert.equal(journey(s).action, 'food');
  assert.match(journey(s).progress, new RegExp(`0 / ${cost} biomass`));
  s.lineage.biomass = 100;
  s.player.energy = stats.energy;
  s.player.age = TUNING.reproductionAge;
  assert.equal(journey(s).action, 'reproduce');
  s.player.reproductionCooldown = 4;
  assert.equal(journey(s).action, 'explore');
  assert.match(journey(s).detail, /4 seconds/);
});

test('food guidance ignores inactive and incompatible resources', () => {
  const s = createGame('food-guidance');
  const algae = Object.values(resourceById).find((r) => r.diet === 'algae')!.id;
  const meat = Object.values(resourceById).find((r) => r.diet === 'meat')!.id;
  s.resources = [
    { id: 1, type: algae, x: s.player.x, y: s.player.y, active: false, regrowAt: 100 },
    { id: 2, type: meat, x: s.player.x, y: s.player.y, active: true, regrowAt: 0 },
    { id: 3, type: algae, x: s.player.x + 20, y: s.player.y, active: true, regrowAt: 0 },
  ];
  assert.equal(nearestFood(s)?.id, 3);
  s.resources[2].active = false;
  assert.equal(nearestFood(s), null);
  assert.ok(applyMutation(s, 'predatory-jaw').ok);
  assert.equal(nearestFood(s)?.id, 2);
});
