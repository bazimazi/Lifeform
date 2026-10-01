import type { Genome } from '../core/types';
export interface Planet {
  id: string;
  name: string;
  kind: 'moon' | 'planet' | 'asteroid';
  distance: number;
  temperature: number;
  water: number;
  oxygen: number;
  gravity: number;
  metal: number;
  surveyed: boolean;
  life: { name: string; genome: Genome; niche: string }[];
  colony: {
    population: number;
    health: number;
    food: number;
    water: number;
    genome: Genome;
    branchId: string;
    founded: number;
  } | null;
  mines: number;
  terraforming: number;
}
export type MissionKind = 'orbit' | 'survey' | 'mine' | 'colonize' | 'supply' | 'terraform';
export interface SpaceState {
  system: number;
  planets: Planet[];
  missions: {
    id: string;
    kind: MissionKind;
    target: string;
    remaining: number;
    genome: Genome;
    branchId: string;
  }[];
  orbitalHabitats: number;
  launches: number;
  discoveries: number;
  coloniesFounded: number;
  research: { name: string; remaining: number; level: number } | null;
  improvement: number;
  log: { time: number; title: string; detail: string }[];
}
