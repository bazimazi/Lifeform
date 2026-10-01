import type { Genome, Vec } from '../core/types';
export const MATERIALS = [
  'food',
  'water',
  'wood',
  'stone',
  'fiber',
  'bone',
  'metal',
  'fuel',
  'energy',
] as const;
export type Material = (typeof MATERIALS)[number];
export type Stock = Record<Material, number>;
export type Cost = Partial<Stock>;
export const PROFESSIONS = [
  'gatherer',
  'hunter',
  'farmer',
  'builder',
  'craftsman',
  'medic',
  'scout',
  'warrior',
  'scholar',
  'trader',
  'engineer',
] as const;
export type Profession = (typeof PROFESSIONS)[number];
export type Era = 'biology' | 'intelligence' | 'tribal' | 'civilization' | 'industrial' | 'space';
export interface Technology {
  id: string;
  name: string;
  description: string;
  requires: string[];
  knowledge: number;
  cost: Cost;
  seconds: number;
  era: Era;
}
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  cost: Cost;
  technology: string;
  durability: number;
  effect: 'gather' | 'hunt' | 'build' | 'heal' | 'travel';
  bonus: number;
}
export interface BuildingDefinition {
  id: string;
  name: string;
  description: string;
  cost: Cost;
  technology: string;
  seconds: number;
  housing: number;
  production: Cost;
  consumption: Cost;
  security: number;
  knowledge: number;
}
export interface Settlement extends Vec {
  id: string;
  name: string;
  regionId: string;
  branchId: string;
  genome: Genome;
  population: number;
  growth: number;
  health: number;
  stability: number;
  buildings: Record<string, number>;
  jobs: Record<Profession, number>;
  queue: { building: string; remaining: number } | null;
  founded: number;
  lost: boolean;
}
export interface Neighbor {
  id: string;
  name: string;
  regionId: string;
  population: number;
  relations: number;
  culture: string;
  specialty: Material;
  trade: boolean;
  conflict: boolean;
}
export interface LearnedPlace extends Vec {
  resource: string;
  visits: number;
  lastSeen: number;
}
export interface Culture {
  language: string;
  traditions: string[];
  architecture: string;
  mythology: string;
  art: string;
  music: string;
  government: 'council' | 'stewardship' | 'assembly';
  law: 'balanced' | 'conservation' | 'expansion';
  history: string[];
}
export interface SocietyState {
  era: Era;
  stock: Stock;
  tools: { id: string; durability: number }[];
  settlements: Settlement[];
  neighbors: Neighbor[];
  technologies: string[];
  research: { id: string; remaining: number } | null;
  knowledge: number;
  learning: number;
  memory: LearnedPlace[];
  gatherReadyAt: number;
  culture: Culture;
  pollution: number;
  production: Stock;
  consumption: Stock;
  tick: number;
  tradeCount: number;
  crafted: number;
}
