import type { Genome, RngStreams, Stats } from '../core/types';
import type { Allele, Genes } from './genetics-types';
import { GENES } from '../data/biology';
import { random, clamp } from '../core/random';

export function baselineGenes(): Genes {
  return Object.fromEntries(GENES.map((g) => [g.id, [1, 1]])) as unknown as Genes;
}
export function expressedGenes(
  genome: Genome,
): { name: string; value: number; description: string }[] {
  const genes = genome.genes ?? baselineGenes();
  return GENES.map((g) => {
    const pair = genes[g.id];
    const expression =
      g.expression === 'dominant'
        ? Math.max(...pair)
        : g.expression === 'recessive'
          ? Math.min(...pair)
          : (pair[0] + pair[1]) / 2;
    return {
      name: g.name,
      value: expression - 1,
      description: `${g.alleles[pair[0]]} / ${g.alleles[pair[1]]} (${g.expression})`,
    };
  });
}
export function geneModifiers(genome: Genome): Partial<Stats> {
  const result: Partial<Stats> = {};
  const expression = expressedGenes(genome);
  GENES.forEach((gene, i) => {
    for (const [key, amount] of Object.entries(gene.effects))
      result[key as keyof Stats] = (result[key as keyof Stats] ?? 0) + amount * expression[i].value;
  });
  return result;
}
export function inheritGenome(parent: Genome, mate: Genome | null, rng: RngStreams): Genome {
  const next = structuredClone(parent);
  if (!mate) return next;
  const a = parent.genes ?? baselineGenes(),
    b = mate.genes ?? baselineGenes();
  next.genes = baselineGenes();
  for (const gene of GENES) {
    const pair: [Allele, Allele] = [
      a[gene.id][random(rng, 'mutation') < 0.5 ? 0 : 1],
      b[gene.id][random(rng, 'mutation') < 0.5 ? 0 : 1],
    ];
    if (random(rng, 'mutation') < 0.12) {
      const which = random(rng, 'mutation') < 0.5 ? 0 : 1;
      pair[which] = clamp(pair[which] + (random(rng, 'mutation') < 0.5 ? -1 : 1), 0, 2) as Allele;
    }
    next.genes[gene.id] = pair;
  }
  return next;
}
