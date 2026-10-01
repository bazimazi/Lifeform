import type { StatKey } from '../core/types';
export type Allele = 0 | 1 | 2;
export type GeneId = 'size' | 'muscle' | 'senses' | 'metabolism' | 'sociality';
export type Genes = Record<GeneId, [Allele, Allele]>;
export interface GeneDefinition {
  id: GeneId;
  name: string;
  alleles: [string, string, string];
  expression: 'dominant' | 'recessive' | 'polygenic';
  effects: Partial<Record<StatKey, number>>;
}
export interface Appearance {
  color: string;
  proportions: number;
  placements: Record<string, { x: number; y: number }>;
}
