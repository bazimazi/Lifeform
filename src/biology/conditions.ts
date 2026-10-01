import type { Creature, GameState } from '../core/types';
import { DISEASES } from '../data/biology';
import { activePressure } from '../world/pressures';
import { phenotype } from './body';
import { climate } from '../world/regions';
import { random, distance, clamp } from '../core/random';
import { record } from '../core/history';

export function addStatus(
  state: GameState,
  c: Creature,
  id: string,
  duration: number,
  source: string,
  strength = 1,
) {
  const conditions = (state.evolution.statuses[c.id] ??= []);
  const existing = conditions.find((s) => s.id === id);
  if (existing) {
    existing.remaining = Math.max(existing.remaining, duration);
    return;
  }
  conditions.push({ id, remaining: duration, source, strength });
  if (c.id === state.player.id)
    record(
      state,
      'condition',
      id === 'stunned' ? 'Electric shock' : (DISEASES.find((d) => d.id === id)?.name ?? id),
      `Cause: ${source}. Inspect your biology and habitat for ways to adapt.`,
    );
}
export function movementCondition(state: GameState, c: Creature) {
  return (state.evolution.statuses[c.id] ?? []).reduce(
    (speed, s) =>
      speed *
      (s.id === 'stunned' ? 0.05 : (DISEASES.find((d) => d.id === s.id)?.speedMultiplier ?? 1)),
    1,
  );
}
export function environmentNeeds(state: GameState, c: Creature, dt: number): string | null {
  const stats = phenotype(c.genome),
    local = climate(state, c),
    pressure = activePressure(state);
  const sheltered =
    state.evolution.nests.some((n) => distance(n, c) < 100 && n.health > 0) ||
    local.region.sites.some((site) => site.kind === 'cave' && distance(site, c) < 75);
  const protection = sheltered || stats.burrowing > 0 ? 0.35 : 1;
  let cause: string | null = null;
  const heat = Math.max(0, local.temperature - stats.heatTolerance);
  const cold = Math.max(0, 10 - local.temperature - stats.coldTolerance);
  const dehydration = !local.biome.aquatic
    ? Math.max(0, 0.35 - local.moisture - stats.waterStorage * 0.3)
    : 0;
  const oxygenStress = !local.biome.aquatic
    ? Math.max(0, 0.8 - stats.oxygenEfficiency * local.biome.oxygen)
    : Math.max(0, local.biome.pressure - stats.pressureTolerance);
  const stress =
    (heat * 0.025 +
      cold * 0.025 +
      dehydration +
      oxygenStress * 0.5 +
      local.toxicity * (1 - stats.toxinResistance) * 0.3 +
      (pressure?.damage ?? 0)) *
    protection;
  if (stress > 0) {
    c.energy = Math.max(0, c.energy - stress * dt);
    if (stress > 0.2) {
      c.health -= (stress - 0.2) * dt;
      cause = 'Environmental exposure';
    }
  }
  if (heat > 8) addStatus(state, c, 'heat-stress', 8, local.biome.name);
  if (cold > 8) addStatus(state, c, 'chill', 8, local.biome.name);
  if (cold > 20) addStatus(state, c, 'frozen', 3, local.biome.name);
  if (pressure?.id === 'wildfire' && !local.biome.aquatic && !sheltered)
    addStatus(state, c, 'burning', 5, 'Wildfire');
  if (c.stamina < 5) addStatus(state, c, 'exhausted', 2, 'Sprinting');
  for (const disease of DISEASES) {
    if (disease.transmission === 0) continue;
    const exposure =
      disease.biomes.includes(local.biome.id) ||
      pressure?.disease === disease.id ||
      [state.player, ...state.creatures].some(
        (other) =>
          other.id !== c.id &&
          distance(c, other) < 65 &&
          state.evolution.statuses[other.id]?.some((s) => s.id === disease.id),
      );
    if (
      exposure &&
      random(state.rng, 'simulation') < (disease.transmission * (1 - stats.immunity) * dt) / 20
    )
      addStatus(state, c, disease.id, disease.duration + disease.incubation, local.biome.name);
  }
  const statuses = state.evolution.statuses[c.id] ?? [];
  const nest = state.evolution.nests.find(
    (n) => n.health > 0 && n.food > 0 && distance(n, c) < 100,
  );
  if (nest && c.speciesId === 'player' && c.energy < stats.energy * 0.8) {
    const meal = Math.min(nest.food, dt * 1.5);
    nest.food -= meal;
    c.energy = Math.min(stats.energy, c.energy + meal * 5);
  }
  for (const status of statuses) {
    status.remaining -= dt;
    const disease = DISEASES.find((d) => d.id === status.id);
    if (!disease || status.remaining > disease.duration) continue;
    const resistance = clamp(
      disease.resistance === 'immunity' || disease.resistance === 'toxinResistance'
        ? stats[disease.resistance]
        : stats[disease.resistance] / 50,
      0,
      0.98,
    );
    c.health = Math.min(stats.health, c.health - disease.damage * (1 - resistance) * dt);
    c.energy = Math.max(0, c.energy - disease.energyDrain * (1 - resistance) * dt);
    if (c.health <= 0) cause = disease.name;
  }
  state.evolution.statuses[c.id] = statuses.filter((s) => s.remaining > 0);
  const cleaner = state.creatures.find(
    (other) => other.speciesId === 'cleaner' && other.health > 0 && distance(c, other) < 100,
  );
  if (cleaner && c.speciesId === 'player') {
    state.evolution.statuses[c.id] = state.evolution.statuses[c.id].filter(
      (s) => s.id !== 'gut-parasite',
    );
    c.health = Math.min(stats.health, c.health + 0.25 * dt);
    if (!state.evolution.symbioses.includes('cleaner')) {
      state.evolution.symbioses.push('cleaner');
      state.lineage.points++;
      record(
        state,
        'symbiosis',
        'An unexpected partnership',
        'Silver cleaners remove parasites and heal nearby relatives.',
      );
    }
  }
  return cause;
}
