import type { Genes, Appearance } from '../biology/genetics-types';
import type { WorldEvolution } from '../world/types';

export interface Vec {
  x: number;
  y: number;
}
export type StatKey =
  | 'health'
  | 'energy'
  | 'speed'
  | 'attack'
  | 'defense'
  | 'vision'
  | 'mass'
  | 'metabolism'
  | 'photosynthesis'
  | 'toxinResistance'
  | 'venom'
  | 'regeneration'
  | 'reproductionCost'
  | 'offspringCount'
  | 'growthTime'
  | 'swimming'
  | 'walking'
  | 'flight'
  | 'climbing'
  | 'heatTolerance'
  | 'coldTolerance'
  | 'pressureTolerance'
  | 'immunity'
  | 'waterStorage'
  | 'stealth'
  | 'smell'
  | 'hearing'
  | 'intelligence'
  | 'communication'
  | 'manipulation'
  | 'sociality'
  | 'memory'
  | 'electricity'
  | 'projectile'
  | 'burrowing'
  | 'lift'
  | 'oxygenEfficiency';
export type Stats = Record<StatKey, number>;
export type Diet =
  'algae' | 'detritus' | 'microbe' | 'meat' | 'mineral' | 'toxic' | 'plant' | 'fruit' | 'insect';
export interface OrganDefinition {
  id: string;
  name: string;
  slot: string;
  description: string;
  modifiers: Partial<Stats>;
  diet: Diet[];
  visual: string;
}
export interface MutationDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  benefit: string;
  tradeoff: string;
  organ?: string;
  requires: string[];
  excludes: string[];
  modifiers: Partial<Stats>;
  cost: number;
  biomass: number;
  icon: string;
  diet: Diet[];
}
export interface Genome {
  organs: string[];
  mutations: string[];
  genes?: Genes;
  appearance?: Appearance;
}
export interface Creature extends Vec {
  id: string;
  speciesId: string;
  genome: Genome;
  generation: number;
  health: number;
  energy: number;
  stamina: number;
  age: number;
  angle: number;
  attackCooldown: number;
  reproductionCooldown: number;
  poison: number;
  juvenile: number;
  aiTimer: number;
  intent: Vec;
  behavior: string;
}
export interface SpeciesDefinition {
  id: string;
  name: string;
  epithet: string;
  description: string;
  color: string;
  genome: Genome;
  count: number;
  diet: Diet[];
  prey: string[];
  predators: string[];
  birthRate: number;
  mortality: number;
  aggression: number;
  visual: string;
}
export interface ResourceDefinition {
  id: string;
  name: string;
  diet: Diet;
  energy: number;
  biomass: number;
  toxicity: number;
  radius: number;
  color: string;
  growth: number;
}
export interface Resource extends Vec {
  id: number;
  type: string;
  active: boolean;
  regrowAt: number;
}
export interface Population {
  speciesId: string;
  count: number;
  births: number;
  deaths: number;
  food: number;
  fitness: number;
  cause: string;
}
export interface HistoryEvent {
  id: number;
  time: number;
  generation: number;
  type: string;
  title: string;
  detail: string;
}
export interface Descendant {
  id: string;
  generation: number;
  genome: Genome;
  born: number;
  died: number | null;
  cause: string | null;
  parent: string | null;
  coParent?: string;
}
export interface LegacyRecord {
  name: string;
  seed: string;
  duration: number;
  peak: number;
  adaptations: string[];
  cause: string;
  archive: Descendant[];
  history: HistoryEvent[];
  evolution?: WorldEvolution;
}
export interface Pressure {
  id: string;
  remaining: number;
}
export interface TerrainFeature extends Vec {
  kind: 'rock' | 'reed' | 'patch';
  size: number;
  angle: number;
}
export interface RngStreams {
  world: number;
  species: number;
  mutation: number;
  event: number;
  simulation: number;
}
export interface Settings {
  reducedMotion: boolean;
  particles: boolean;
  sound: boolean;
  textScale: boolean;
  leftHanded: boolean;
  control: 'hybrid' | 'direct' | 'touch';
}
export interface Telemetry {
  foodEaten: number;
  hunts: number;
  births: number;
  deaths: number;
  mutations: Record<string, number>;
  distance: number;
  lifespan: number;
  mutationRejected: number;
}
export interface GameState {
  schemaVersion: number;
  seed: string;
  time: number;
  tick: number;
  nextId: number;
  rng: RngStreams;
  world: {
    width: number;
    height: number;
    biome: string;
    features: TerrainFeature[];
    visited: string[];
  };
  player: Creature;
  creatures: Creature[];
  resources: Resource[];
  populations: Population[];
  lineage: {
    name: string;
    points: number;
    biomass: number;
    peak: number;
    archive: Descendant[];
    legacy: number;
    extinct: boolean;
  };
  history: HistoryEvent[];
  discoveries: { species: string[]; resources: string[]; mutations: string[] };
  pressure: Pressure | null;
  nextEventAt: number;
  settings: Settings;
  telemetry: Telemetry;
  legacies: LegacyRecord[];
  evolution: WorldEvolution;
}
export interface Input {
  x: number;
  y: number;
  target: Vec | null;
  sprint: boolean;
  action: boolean;
}
export interface ActionResult {
  ok: boolean;
  message: string;
}
