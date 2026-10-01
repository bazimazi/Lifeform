import { BASE_STATS, organById, mutationById, TUNING } from '../data/content';
import { clamp } from '../core/random';
import type { Diet, Genome, Stats } from '../core/types';
import { geneModifiers } from './genetics';
import { TRAITS } from '../progression/types';

export function phenotype(genome: Genome): Stats {
  const stats = { ...BASE_STATS };
  for (const id of genome.organs) add(stats, organById[id]?.modifiers ?? {});
  for (const id of genome.mutations) add(stats, mutationById[id]?.modifiers ?? {});
  add(stats, geneModifiers(genome));
  for (const v of genome.variations ?? []) add(stats, v.modifiers);
  for (const t of genome.traits ?? []) {
    if (t === 'social' || t === 'cooperative' || t === 'herd') stats.sociality += 8;
    if (t === 'solitary') {
      stats.stealth += 0.15;
      stats.reproductionCost += 0.1;
    }
    if (t === 'nocturnal') {
      stats.vision += 45;
      stats.metabolism += 0.08;
    }
    if (t === 'pack-hunting' || t === 'territorial') {
      stats.attack += 3;
      stats.metabolism += 0.08;
    }
    if (t === 'parental-care') stats.growthTime -= 5;
    if (t === 'nest-builder') stats.burrowing += 0.5;
    if (t === 'migratory') stats.speed += 5;
    if (t === 'scavenging') stats.smell += 80;
    if (t === 'parasitic') {
      stats.venom += 1;
      stats.health -= 6;
    }
  }
  stats.speed = Math.max(TUNING.minimumSpeed, stats.speed);
  stats.health = Math.max(1, stats.health);
  stats.energy = Math.max(1, stats.energy);
  stats.metabolism = Math.max(0, stats.metabolism);
  stats.toxinResistance = clamp(stats.toxinResistance, 0, 1);
  stats.reproductionCost = Math.max(0.4, stats.reproductionCost);
  stats.immunity = clamp(stats.immunity, 0, 0.98);
  stats.stealth = clamp(stats.stealth, 0, 0.85);
  stats.regeneration = Math.max(0, stats.regeneration);
  stats.growthTime = Math.max(5, stats.growthTime);
  return stats;
}
function add(stats: Stats, modifiers: Partial<Stats>) {
  for (const key of Object.keys(modifiers) as (keyof Stats)[]) stats[key] += modifiers[key] ?? 0;
}
export function dietFor(genome: Genome): Diet[] {
  const diet = new Set<Diet>(genome.organs.flatMap((id) => organById[id]?.diet ?? []));
  for (const id of genome.mutations)
    for (const capability of mutationById[id]?.diet ?? []) diet.add(capability);
  if (genome.traits?.includes('scavenging')) diet.add('meat');
  return [...diet];
}
export function validateBody(genome: Genome): string | null {
  if (
    genome.genes &&
    ['size', 'muscle', 'senses', 'metabolism', 'sociality'].some((k) => {
      const p = genome.genes![k as keyof typeof genome.genes];
      return !Array.isArray(p) || p.length !== 2 || p.some((v) => ![0, 1, 2].includes(v));
    })
  )
    return 'Invalid inherited genes.';
  if (genome.appearance) {
    const a = genome.appearance;
    if (
      !/^#[0-9a-f]{6}$/i.test(a.color) ||
      !Number.isFinite(a.proportions) ||
      a.proportions < 0.7 ||
      a.proportions > 1.4 ||
      !a.placements ||
      Object.entries(a.placements).some(
        ([id, p]) =>
          !organById[id] || !p || ![p.x, p.y].every((v) => Number.isFinite(v) && v >= -1 && v <= 1),
      )
    )
      return 'Invalid organ placement.';
  }
  if (
    genome.traits &&
    (!Array.isArray(genome.traits) ||
      genome.traits.length > 3 ||
      new Set(genome.traits).size !== genome.traits.length ||
      genome.traits.some((t) => !TRAITS.includes(t)))
  )
    return 'Invalid behavioral traits.';
  if (
    genome.variations &&
    (!Array.isArray(genome.variations) ||
      genome.variations.length > 3 ||
      genome.variations.some(
        (v) =>
          !v ||
          typeof v.id !== 'string' ||
          typeof v.name !== 'string' ||
          typeof v.description !== 'string' ||
          !v.modifiers ||
          Object.entries(v.modifiers).some(
            ([k, n]) =>
              !(k in BASE_STATS) ||
              typeof n !== 'number' ||
              !Number.isFinite(n) ||
              Math.abs(n) > 200,
          ),
      ))
  )
    return 'Invalid adaptive variation.';
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
  if (stats.mass < 1 || Object.values(stats).some((v) => !Number.isFinite(v)))
    return 'The body must have finite stats and positive mass.';
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
