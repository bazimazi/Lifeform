import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/world/generation';
import { MUTATIONS, mutationById } from '../src/data/content';
import { mutationRoute, planMutation } from '../src/biology/planning';
import { applyMutation, previewMutation } from '../src/biology/mutation';
import { mutatedGenome, phenotype } from '../src/biology/body';
import { environmentalExposure, environmentNeeds } from '../src/biology/conditions';
import { habitatForecast } from '../src/presentation/build-feedback';
import { branchPopulation, speciesTreePanel, branchDetailPanel } from '../src/presentation/graphs';

test('every mutation route orders dependencies once and calculates unpaid costs without spending', () => {
  const s = createGame('planning');
  const snapshot = structuredClone(s);
  for (const m of MUTATIONS) {
    const route = mutationRoute(m.id),
      plan = planMutation(s, m.id);
    assert.equal(route.at(-1), m.id);
    assert.equal(new Set(route).size, route.length);
    for (const id of route)
      for (const dependency of mutationById[id].requires)
        assert.ok(route.indexOf(dependency) < route.indexOf(id));
    assert.equal(
      plan.points,
      route.reduce((sum, id) => sum + mutationById[id].cost, 0),
    );
    assert.equal(
      plan.biomass,
      route.reduce((sum, id) => sum + mutationById[id].biomass, 0),
    );
  }
  assert.deepEqual(s, snapshot);
  assert.throws(() => mutationRoute('not-a-mutation'), /Unknown adaptation/);
});

test('mutation plans honor inherited prerequisites and disclose conflicting bodies', () => {
  const s = createGame('costed-planning');
  s.lineage.points = 100;
  s.lineage.biomass = 200;
  assert.ok(applyMutation(s, 'light-eye').ok);
  const plan = planMutation(s, 'associative-brain');
  assert.equal(plan.steps[0].installed, true);
  assert.equal(plan.points, mutationById['associative-brain'].cost);
  assert.equal(plan.issue, null);
  assert.ok(applyMutation(s, 'filter-mouth').ok);
  assert.ok(planMutation(s, 'predatory-jaw').issue);
});

test('inspecting an installed adaptation never applies its modifiers twice', () => {
  const s = createGame('installed-preview');
  s.lineage.points = 100;
  s.lineage.biomass = 200;
  assert.ok(applyMutation(s, 'efficient-cilia').ok);
  const snapshot = structuredClone(s.player.genome);
  assert.deepEqual(mutatedGenome(s.player.genome, 'efficient-cilia'), snapshot);
  assert.deepEqual(
    previewMutation(s, 'efficient-cilia').before,
    previewMutation(s, 'efficient-cilia').after,
  );
  assert.deepEqual(s.player.genome, snapshot);
});

test('habitat previews share exposure and traversal rules without changing climate or RNG', () => {
  const s = createGame('climate-preview');
  const desert = s.evolution.regions.find((r) => r.biomeId === 'desert')!;
  s.player.x = desert.x + desert.width / 2;
  s.player.y = desert.y + desert.height / 2;
  s.evolution.challenge = 'heat';
  const snapshot = structuredClone(s),
    before = habitatForecast(s, s.player.genome);
  const afterGenome = mutatedGenome(
    mutatedGenome(s.player.genome, 'jointed-legs'),
    'cooling-glands',
  );
  const after = habitatForecast(s, afterGenome);
  const index = before.findIndex((p) => p.current);
  assert.ok(after[index].movement.multiplier > before[index].movement.multiplier);
  assert.ok(after[index].healthDrain < before[index].healthDrain);
  assert.equal(before[index].energyDrain, environmentalExposure(s, s.player).stress);
  assert.deepEqual(s, snapshot);
});

test('shared exposure forecast predicts direct environmental damage in the simulation', () => {
  const s = createGame('forecast-application');
  const field = s.evolution.regions.find((r) => r.biomeId === 'grassland')!;
  s.player.x = field.x + field.width / 2;
  s.player.y = field.y + field.height / 2;
  const exposure = environmentalExposure(s, s.player),
    initialHealth = s.player.health;
  assert.equal(exposure.heat, 0);
  assert.equal(exposure.cold, 0);
  environmentNeeds(s, s.player, 0.5);
  assert.ok(
    Math.abs(initialHealth - s.player.health - Math.max(0, exposure.stress - 0.2) * 0.5) < 1e-8,
  );
  assert.ok(phenotype(s.player.genome).health >= s.player.health);
});

test('species inspection includes off-world descendants and hides unrecovered fossils', () => {
  const s = createGame('branch-inspection'),
    root = s.evolution.branches[0];
  root.name = '<script>ancestor</script>';
  s.space.planets[0].colony = {
    population: 5.5,
    health: 100,
    food: 10,
    water: 10,
    genome: structuredClone(root.genome),
    branchId: root.id,
    founded: 0,
  };
  assert.deepEqual(branchPopulation(s, root.id), {
    individuals: 1,
    citizens: 0,
    colonists: 5,
    total: 6,
  });
  s.evolution.fossils.push({
    id: 'fossil-test',
    branchId: root.id,
    name: 'Secret remains',
    x: 10,
    y: 10,
    age: 1,
    adaptations: [],
    discovered: false,
  });
  assert.ok(!speciesTreePanel(s).includes('Secret remains'));
  s.evolution.fossils[0].discovered = true;
  assert.ok(speciesTreePanel(s).includes('Secret remains'));
  assert.ok(branchDetailPanel(s, root.id).includes('&lt;script&gt;ancestor&lt;/script&gt;'));
  assert.ok(!branchDetailPanel(s, root.id).includes('<script>'));
});
