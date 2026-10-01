import { activePressure } from '../world/pressures';
import type { GameState } from '../core/types';
import { SPECIES, resourceById, speciesById, TUNING } from '../data/content';
import { clamp, random } from '../core/random';
import { creature } from '../world/generation';
import { record } from '../core/history';
import { biomeById, regionAt } from '../world/regions';
import { phenotype } from '../biology/body';

export function updatePopulations(state: GameState) {
  for (const pop of state.populations) {
    if (pop.count === 0) continue;
    const species = speciesById[pop.speciesId];
    const available = state.resources.filter(
      (r) => r.active && species.diet.includes(resourceById[r.type].diet),
    ).length;
    const prey = species.prey
      .filter((id) => id !== 'player')
      .reduce(
        (sum, id) => sum + (state.populations.find((p) => p.speciesId === id)?.count ?? 0),
        0,
      );
    const predation = state.populations
      .filter((p) => species.predators.includes(p.speciesId))
      .reduce((sum, p) => sum + p.count * 0.005, 0);
    pop.food = clamp((available + prey * 2) / (pop.count * 4), 0, 1);
    const pressure = activePressure(state);
    const droughtPenalty =
      pressure && (pressure.affectedDiet === 'all' || species.diet.includes(pressure.affectedDiet))
        ? pressure.foodFitnessPenalty
        : 0;
    pop.fitness = clamp(pop.food - droughtPenalty - predation, 0, 1.2);
    const cohort = state.creatures.filter((c) => c.speciesId === pop.speciesId);
    const dormant = cohort.filter(
      (c) => Math.hypot(c.x - state.player.x, c.y - state.player.y) > TUNING.nearRadius,
    );
    const active = cohort.length - dormant.length;
    const farCount = Math.max(0, pop.count - active);
    const births = stochasticRound(farCount * species.birthRate * pop.fitness, state);
    const deaths = Math.min(
      farCount,
      stochasticRound(
        farCount *
          (species.mortality + (1 - pop.food) * 0.1 + predation * 0.15 + droughtPenalty * 0.15),
        state,
      ),
    );
    pop.count = Math.max(active, pop.count + births - deaths);
    // Dormant representatives belong to the aggregate population; they are not immortal reserves.
    const removed = dormant.slice(0, Math.max(0, cohort.length - pop.count));
    const removedIds = new Set(removed.map((c) => c.id));
    if (removed.length) {
      state.creatures = state.creatures.filter((c) => !removedIds.has(c.id));
      for (const c of removed) delete state.evolution.statuses[c.id];
    }
    if (state.progression.apex && removedIds.has(state.progression.apex.id))
      state.progression.apex.defeated = true;
    const represented = cohort.length - removed.length;
    pop.births += births;
    pop.deaths += deaths;
    pop.cause = droughtPenalty
      ? `${pressure!.id.charAt(0).toUpperCase() + pressure!.id.slice(1)} → reduced food availability → reduced food fitness`
      : pop.food < 0.45
        ? 'Food shortage → starvation'
        : predation > 0.1
          ? 'Predator pressure → higher mortality'
          : 'Food supports a stable population';
    if (pop.count === 0)
      record(
        state,
        'extinction',
        `${species.name} disappears`,
        `${pop.cause}. No local or distant population remains.`,
      );
    // Materialize only a small representative cohort. The rest remain counts.
    if (represented < Math.min(TUNING.maxAgentsPerSpecies, pop.count)) {
      const habitats = state.evolution.regions.filter(
        (r) => biomeById[r.biomeId].aquatic === phenotype(species.genome).walking < 0.5,
      );
      const habitat = habitats[Math.floor(random(state.rng, 'species') * habitats.length)];
      let x = habitat.x + 30 + random(state.rng, 'species') * (habitat.width - 60);
      let y = habitat.y + 30 + random(state.rng, 'species') * (habitat.height - 60);
      if (
        species.prey.includes('player') &&
        Math.hypot(x - state.player.x, y - state.player.y) < 500
      ) {
        const corners = habitats
          .flatMap((r) => [
            { x: r.x + 35, y: r.y + 35 },
            { x: r.x + r.width - 35, y: r.y + r.height - 35 },
          ])
          .sort(
            (a, b) =>
              Math.hypot(b.x - state.player.x, b.y - state.player.y) -
              Math.hypot(a.x - state.player.x, a.y - state.player.y),
          );
        x = corners[0].x;
        y = corners[0].y;
      }
      state.creatures.push(
        creature(
          `${species.id}-${state.nextId++}`,
          species.id,
          state.progression.wildGenomes[species.id] ?? species.genome,
          x,
          y,
        ),
      );
    }
    const near = state.creatures.filter((c) => c.speciesId === pop.speciesId);
    let far = Math.max(0, pop.count - near.length);
    const regions = state.evolution.regions;
    for (let i = 0; i < regions.length; i++) {
      const allocated = Math.floor(far / (regions.length - i));
      far -= allocated;
      regions[i].population[pop.speciesId] =
        allocated + near.filter((c) => regionAt(state, c).id === regions[i].id).length;
    }
  }
}
function stochasticRound(value: number, state: GameState) {
  const floor = Math.floor(value);
  return floor + (random(state.rng, 'simulation') < value - floor ? 1 : 0);
}
export function populationDeath(state: GameState, speciesId: string, cause: string) {
  const pop = state.populations.find((p) => p.speciesId === speciesId);
  if (!pop) return;
  pop.count = Math.max(0, pop.count - 1);
  pop.deaths++;
  pop.cause = cause;
  if (pop.count === 0)
    record(
      state,
      'extinction',
      `${speciesById[speciesId].name} disappears`,
      `The last member died from ${cause.toLowerCase()}. Its place in the food web is now empty.`,
    );
}
export function foodWeb() {
  return SPECIES.flatMap((s) => s.prey.map((prey) => ({ predator: s.id, prey })));
}
