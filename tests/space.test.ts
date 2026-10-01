import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/world/generation';
import { TECHNOLOGIES } from '../src/data/society';
import { MATERIALS, PROFESSIONS } from '../src/society/types';
import {
  launch,
  tickSpace,
  frontier,
  researchFrontier,
  generateSystem,
  suitability,
} from '../src/space/space';
import { encodeSave, decodeSave } from '../src/core/save';
import { Simulation } from '../src/simulation/ecosystem';
function spaceReady() {
  const s = createGame('stars');
  s.society.technologies = TECHNOLOGIES.map((t) => t.id);
  s.society.knowledge = 1000;
  for (const m of MATERIALS) s.society.stock[m] = 1000;
  s.society.settlements.push({
    id: 'launch-town',
    name: 'Launch Town',
    regionId: s.evolution.currentRegion,
    branchId: s.evolution.activeBranch,
    genome: structuredClone(s.player.genome),
    x: s.player.x,
    y: s.player.y,
    population: 4,
    growth: 0,
    health: 100,
    stability: 80,
    buildings: { shelter: 1, launchpad: 1 },
    jobs: Object.fromEntries(PROFESSIONS.map((j) => [j, 0])) as any,
    queue: null,
    founded: 0,
    lost: false,
  });
  return s;
}
test('an off-world colony preserves the lineage when the home population is lost', () => {
  const s = spaceReady(),
    p = s.space.planets[0];
  p.surveyed = true;
  assert.ok(launch(s, 'colonize', p.id).ok);
  tickSpace(s, 40);
  s.society.settlements = [];
  const sim = new Simulation(s);
  sim.die(s.player, 'Home-world disaster');
  assert.equal(s.lineage.extinct, false);
  assert.match(s.player.id, /citizen/);
  assert.ok(p.colony!.population >= 3);
  assert.equal(s.evolution.fossils.length, 0);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('expeditions survey, colonize, resupply and engineer living worlds', () => {
  const s = spaceReady(),
    p = s.space.planets[0];
  assert.equal(launch(s, 'colonize', p.id).ok, false);
  assert.ok(launch(s, 'survey', p.id).ok);
  const saved = decodeSave(encodeSave(s));
  tickSpace(s, 40);
  tickSpace(saved, 40);
  assert.deepEqual(s, saved);
  assert.equal(p.surveyed, true);
  assert.ok(launch(s, 'colonize', p.id).ok);
  tickSpace(s, 40);
  assert.ok(p.colony);
  assert.ok(launch(s, 'supply', p.id).ok);
  tickSpace(s, 40);
  assert.ok(p.colony!.food > 40);
  const fit = suitability(p, s.player.genome);
  assert.ok(launch(s, 'terraform', p.id).ok);
  tickSpace(s, 40);
  assert.equal(p.terraforming, 0.25);
  assert.ok(suitability(p, s.player.genome) >= fit);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('orbital habitats, mines and generated frontiers have economic consequences', () => {
  const s = spaceReady();
  assert.ok(launch(s, 'orbit', 'orbit').ok);
  tickSpace(s, 25);
  assert.equal(s.space.orbitalHabitats, 1);
  const p = s.space.planets[5];
  p.surveyed = true;
  assert.ok(launch(s, 'mine', p.id).ok);
  tickSpace(s, 120);
  const metal = s.society.stock.metal;
  tickSpace(s, 10);
  assert.ok(s.society.stock.metal > metal);
  assert.ok(researchFrontier(s).ok);
  tickSpace(s, 40);
  assert.equal(s.space.improvement, 1);
  assert.ok(frontier(s).ok);
  assert.equal(s.space.planets.length, 12);
  assert.deepEqual(generateSystem('stars', 1), generateSystem('stars', 1));
  assert.notDeepEqual(generateSystem('stars', 1), generateSystem('stars', 2));
});
test('hostile colonies can fail and malformed mission destinations are rejected', () => {
  const s = spaceReady(),
    p = s.space.planets[0];
  p.surveyed = true;
  p.water = 0;
  p.oxygen = 0;
  p.temperature = -120;
  assert.ok(launch(s, 'colonize', p.id).ok);
  tickSpace(s, 40);
  p.colony!.health = 0.01;
  p.colony!.food = 0;
  p.colony!.water = 0;
  tickSpace(s, 10);
  assert.equal(p.colony, null);
  assert.ok(launch(s, 'survey', s.space.planets[1].id).ok);
  s.space.missions[0].target = 'nonexistent';
  assert.throws(() => decodeSave(JSON.stringify(s)), /space/);
});
