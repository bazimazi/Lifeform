import { BASE_STATS, organById, mutationById, TUNING } from '../data/content';
import { clamp } from '../core/random';
import type { Diet, Genome, Stats } from '../core/types';
import { geneModifiers } from './genetics';

export function phenotype(genome: Genome): Stats {
  const stats = { ...BASE_STATS };
  for (const id of genome.organs) add(stats, organById[id]?.modifiers ?? {});
  for (const id of genome.mutations) add(stats, mutationById[id]?.modifiers ?? {});
  add(stats, geneModifiers(genome));
  stats.speed = Math.max(TUNING.minimumSpeed, stats.speed);
  stats.health = Math.max(1, stats.health);
  stats.energy = Math.max(1, stats.energy);
  stats.metabolism = Math.max(0, stats.metabolism);
  stats.toxinResistance = clamp(stats.toxinResistance, 0, 1);
  stats.reproductionCost = Math.max(0.4, stats.reproductionCost);
  stats.immunity = clamp(stats.immunity, 0, 0.98);
  stats.stealth = clamp(stats.stealth, 0, 0.85);
  stats.regeneration = Math.max(0, stats.regeneration);
  return stats;
}
function add(stats: Stats, modifiers: Partial<Stats>) {
  for (const key of Object.keys(modifiers) as (keyof Stats)[]) stats[key] += modifiers[key] ?? 0;
}
export function dietFor(genome: Genome): Diet[] {
  const diet = new Set<Diet>(genome.organs.flatMap((id) => organById[id]?.diet ?? []));
  for (const id of genome.mutations)
    for (const capability of mutationById[id]?.diet ?? []) diet.add(capability);
  return [...diet];
}
export function validateBody(genome: Genome): string | null {
  if (!genome.organs.includes('core') || !genome.organs.includes('mouth'))
    return 'A body needs a core and a mouth.';
  const slots = new Set<string>();
  for (const id of genome.organs) {
    const organ = organById[id];
    if (!organ) return `Unknown organ: ${id}.`;
    if (slots.has(organ.slot)) return `The ${organ.slot} slot is already occupied.`;
    slots.add(organ.slot);
  }
  if (new Set(genome.mutations).size !== genome.mutations.length)
    return 'Mutations cannot be duplicated.';
  for (const id of genome.mutations) {
    const mutation = mutationById[id];
    if (!mutation) return `Unknown mutation: ${id}.`;
    if (mutation.requires.some((x) => !genome.mutations.includes(x)))
      return `${mutation.name} needs its earlier adaptation.`;
    if (mutation.excludes.some((x) => genome.mutations.includes(x)))
      return `${mutation.name} conflicts with another adaptation.`;
    if (mutation.organ && !genome.organs.includes(mutation.organ))
      return `${mutation.name} needs its organ.`;
  }
  if (phenotype(genome).mass > TUNING.bodyBudget)
    return `Body mass exceeds the ${TUNING.bodyBudget} unit budget. Choose a lighter path.`;
  const stats = phenotype(genome);
  if (stats.flight > 0 && stats.lift < stats.mass)
    return `Flight needs enough lift: ${stats.lift} lift for ${stats.mass} body mass.`;
  return null;
}
export function mutatedGenome(genome: Genome, id: string): Genome {
  const mutation = mutationById[id];
  const next = structuredClone(genome);
  if (mutation?.organ && !next.organs.includes(mutation.organ)) {
    const slot = organById[mutation.organ].slot;
    next.organs = next.organs.filter((x) => organById[x].slot !== slot);
    next.organs.push(mutation.organ);
  }
  next.mutations.push(id);
  return next;
}
