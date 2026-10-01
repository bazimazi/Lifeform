import type { Diet, Genome, Vec } from '../core/types';

export interface BiomeDefinition {
  id: string;
  name: string;
  description: string;
  aquatic: boolean;
  temperature: number;
  toxicity: number;
  pressure: number;
  oxygen: number;
  elevation: number;
  color: string;
  accent: string;
  resourceWeights: Partial<Record<Diet, number>>;
  discovery: string;
  requirements: { swimming?: number; walking?: number; climbing?: number; flight?: number };
}
export interface Region {
  id: string;
  name: string;
  continent: string;
  biomeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  moisture: number;
  temperature: number;
  fertility: number;
  population: Record<string, number>;
  sites: PointOfInterest[];
  discovered: boolean;
  explored: number;
}
export interface PointOfInterest extends Vec {
  id: string;
  kind: 'spring' | 'cave' | 'fossil' | 'nest' | 'rare-habitat' | 'ruin';
  name: string;
  discovered: boolean;
  investigated: boolean;
  reward: number;
}
export interface StatusInstance {
  id: string;
  remaining: number;
  strength: number;
  source: string;
}
export interface DiseaseDefinition {
  id: string;
  name: string;
  description: string;
  transmission: number;
  incubation: number;
  duration: number;
  damage: number;
  energyDrain: number;
  speedMultiplier: number;
  biomes: string[];
  resistance: 'immunity' | 'toxinResistance' | 'coldTolerance' | 'heatTolerance';
}
export interface PressureDefinition {
  id: string;
  name: string;
  description: string;
  growth: number;
  light: number;
  affectedDiet: Diet | 'all';
  foodFitnessPenalty: number;
  temperature?: number;
  toxicity?: number;
  water?: number;
  damage?: number;
  disease?: string;
  duration?: number;
  migration?: number;
}
export interface SpeciesBranch {
  id: string;
  name: string;
  parentId: string | null;
  created: number;
  generation: number;
  regionId: string;
  genome: Genome;
  members: string[];
  extinct: boolean;
  extinctionCause: string | null;
}
export interface Fossil extends Vec {
  id: string;
  branchId: string;
  name: string;
  age: number;
  adaptations: string[];
  discovered: boolean;
}
export interface Nest extends Vec {
  id: string;
  regionId: string;
  ownerBranch: string;
  food: number;
  health: number;
  capacity: number;
}
export interface WorldEvolution {
  regions: Region[];
  currentRegion: string;
  discoveries: string[];
  sites: string[];
  branches: SpeciesBranch[];
  activeBranch: string;
  fossils: Fossil[];
  nests: Nest[];
  statuses: Record<string, StatusInstance[]>;
  milestones: string[];
  unlocks: string[];
  symbioses: string[];
  challenge: string;
  climateTime: number;
  explorationRewarded: string[];
}
