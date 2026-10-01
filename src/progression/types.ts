import type { Genome, Stats } from '../core/types';
export interface AdaptiveVariation {
  id: string;
  name: string;
  description: string;
  modifiers: Partial<Stats>;
}
export const TRAITS = [
  'territorial',
  'social',
  'solitary',
  'nocturnal',
  'migratory',
  'pack-hunting',
  'herd',
  'parental-care',
  'nest-builder',
  'scavenging',
  'cooperative',
  'parasitic',
] as const;
export type Trait = (typeof TRAITS)[number];
export interface Objective {
  id: string;
  kind: 'food' | 'births' | 'travel' | 'time' | 'hunts' | 'tools' | 'trade' | 'space';
  name: string;
  baseline: number;
  target: number;
  reward: number;
  claimed: boolean;
}
export interface ProgressionState {
  objectives: Objective[];
  completed: number;
  variations: AdaptiveVariation[];
  variationRound: number;
  wildGenomes: Record<string, Genome>;
  selectionEvents: number;
  apex: { id: string; regionId: string; defeated: boolean; avoided: boolean } | null;
  pressureSurvived: number;
  startingPath: string;
  discoveryPoints: number;
}
