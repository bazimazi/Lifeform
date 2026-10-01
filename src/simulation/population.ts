import type { GameState } from '../core/types';
import { SPECIES, resourceById, speciesById, TUNING, PRESSURES } from '../data/content';
import { clamp, random } from '../core/random';
import { creature } from '../world/generation';
import { record } from '../core/history';

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
    const pressure = PRESSURES.find((p) => p.id === state.pressure?.id);
    const droughtPenalty =
      pressure && (pressure.affectedDiet === 'all' || species.diet.includes(pressure.affectedDiet))
        ? pressure.foodFitnessPenalty
        : 0;
    pop.fitness = clamp(pop.food - droughtPenalty - predation, 0, 1.2);
    const represented = state.creatures.filter((c) => c.speciesId === pop.speciesId).length;
    const farCount = Math.max(0, pop.count - represented);
    const births = stochasticRound(farCount * species.birthRate * pop.fitness, state);
    const deaths = Math.min(
      farCount,
      stochasticRound(
        farCount *
          (species.mortality + (1 - pop.food) * 0.1 + predation * 0.15 + droughtPenalty * 0.15),
        state,
      ),
    );
    pop.count = Math.max(represented, pop.count + births - deaths);
    pop.births += births;
    pop.deaths += deaths;
    pop.cause = droughtPenalty
      ? 'Drought → fewer algae → reduced food fitness'
      : pop.food < 0.45
        ? 'Food shortage → starvation'
        : predation > 0.1
          ? 'Predator pressure → higher mortality'
          : 'Food supports a stable population';
    // Materialize only a small representative cohort. The rest remain counts.
    if (represented < Math.min(TUNING.maxAgentsPerSpecies, pop.count)) {
      const x = 100 + random(state.rng, 'species') * (state.world.width - 200);
      const y = 100 + random(state.rng, 'species') * (state.world.height - 200);
      state.creatures.push(
        creature(`${species.id}-${state.nextId++}`, species.id, species.genome, x, y),
      );
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
