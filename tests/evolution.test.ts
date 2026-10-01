import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/world/generation';
import { phenotype } from '../src/biology/body';
import { applyMutation } from '../src/biology/mutation';
import { reproduce } from '../src/biology/reproduction';
import { inheritGenome, baselineGenes } from '../src/biology/genetics';
import { buildNest, stockNest, speciate } from '../src/progression/lineage';
import { regionAt, traversal, exploreRegion, investigate } from '../src/world/regions';
import { addStatus, environmentNeeds, movementCondition } from '../src/biology/conditions';
import { encodeSave, decodeSave } from '../src/core/save';
import { Simulation } from '../src/simulation/ecosystem';
function ready() {
  const s = createGame('biological-expansion');
  s.lineage.points = 100;
  s.lineage.biomass = 200;
  s.player.age = 20;
  return s;
}
test('continuous biomes impose traversal and tolerance tradeoffs', () => {
  const s = ready();
  assert.equal(s.evolution.regions.length, 6);
  assert.equal(regionAt(s, s.player).biomeId, 'ocean');
  const land = s.evolution.regions.find((r) => r.biomeId === 'desert')!;
  s.player.x = land.x + 50;
  s.player.y = land.y + 50;
  assert.equal(traversal(s, s.player, s.player).multiplier, 0.2);
  assert.ok(applyMutation(s, 'jointed-legs').ok);
  assert.ok(traversal(s, s.player, s.player).multiplier > 0.9);
  const energy = s.player.energy;
  environmentNeeds(s, s.player, 1);
  assert.ok(s.player.energy < energy);
  exploreRegion(s);
  assert.ok(s.evolution.discoveries.includes('desert'));
  const site = land.sites[0];
  site.discovered = true;
  s.player.x = site.x;
  s.player.y = site.y;
  assert.ok(investigate(s, site.id).ok);
  const points = s.lineage.points;
  assert.equal(investigate(s, site.id).ok, false);
  assert.equal(s.lineage.points, points);
});
test('mating mixes alleles deterministically and records both parents', () => {
  const s = ready();
  assert.ok(reproduce(s).ok);
  const mate = s.creatures.find((c) => c.speciesId === 'player')!;
  mate.juvenile = 0;
  mate.age = 20;
  mate.energy = 100;
  s.player.energy = 100;
  s.player.reproductionCooldown = 0;
  s.player.genome.genes = baselineGenes();
  mate.genome.genes = baselineGenes();
  s.player.genome.genes.size = [0, 0];
  mate.genome.genes.size = [2, 2];
  const a = structuredClone(s.rng),
    b = structuredClone(s.rng);
  assert.deepEqual(
    inheritGenome(s.player.genome, mate.genome, a),
    inheritGenome(s.player.genome, mate.genome, b),
  );
  assert.ok(reproduce(s, mate.id).ok);
  assert.equal(s.lineage.archive.at(-1)!.coParent, mate.id);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('diseases impair movement and nests feed living relatives', () => {
  const s = ready();
  assert.ok(buildNest(s).ok);
  const nest = s.evolution.nests[0];
  assert.ok(stockNest(s, nest.id, 5).ok);
  s.player.energy = 10;
  environmentNeeds(s, s.player, 1);
  assert.ok(s.player.energy > 10);
  assert.ok(nest.food < 5);
  addStatus(s, s.player, 'stunned', 2, 'Electric organ');
  assert.ok(movementCondition(s, s.player) < 0.1);
  environmentNeeds(s, s.player, 3);
  assert.equal(movementCondition(s, s.player), 1);
});
test('divergent populations split and an extinct branch leaves a fossil', () => {
  const s = ready();
  assert.ok(reproduce(s).ok);
  for (const id of ['jointed-legs', 'air-lungs']) assert.ok(applyMutation(s, id).ok);
  const r = s.evolution.regions.find((r) => r.biomeId === 'grassland')!;
  s.player.x = r.x + 100;
  s.player.y = r.y + 100;
  exploreRegion(s);
  assert.ok(speciate(s, 'Velari terra').ok);
  assert.equal(s.evolution.branches.length, 2);
  const sim = new Simulation(s);
  sim.die(s.player, 'Branch exposure');
  assert.equal(s.evolution.fossils.length, 1);
  assert.equal(s.lineage.extinct, false);
  assert.deepEqual(decodeSave(encodeSave(s)), s);
});
test('version 3 worlds migrate into deterministic regions and species branches', () => {
  const old: any = ready();
  old.schemaVersion = 3;
  delete old.evolution;
  old.populations = old.populations.slice(0, 5);
  const next = decodeSave(JSON.stringify(old));
  assert.equal(next.schemaVersion, 6);
  assert.equal(next.evolution.regions.length, 6);
  assert.equal(next.populations.length, 10);
  assert.equal(phenotype(next.player.genome).health, phenotype(old.player.genome).health);
});
