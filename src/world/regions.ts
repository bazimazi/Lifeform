import type { Creature, Descendant, GameState, Vec, ActionResult } from '../core/types';
import type { WorldEvolution, Region } from './types';
import { BIOMES } from '../data/biology';
import { SPECIES, PRESSURES, resourceById } from '../data/content';
import { phenotype } from '../biology/body';
import { hash, random, streams, distance, clamp } from '../core/random';
import { record } from '../core/history';

export const biomeById = Object.fromEntries(BIOMES.map((b) => [b.id, b]));
export function createEvolution(
  seed: string,
  width: number,
  height: number,
  player: Creature,
  archive: Descendant[],
): WorldEvolution {
  const regionRng = streams(`${seed}:regions`);
  const order = ['forest', 'mountain', 'desert', 'grassland', 'ocean', 'swamp'];
  const column = Math.min(2, Math.floor(player.x / (width / 3))),
    row = Math.min(1, Math.floor(player.y / (height / 2)));
  const origin = row * 3 + column;
  [order[4], order[origin]] = [order[origin], order[4]];
  const regions: Region[] = order.map((biomeId, i) => {
    const x = ((i % 3) * width) / 3,
      y = (Math.floor(i / 3) * height) / 2;
    const kinds = ['spring', 'cave', 'fossil', 'nest', 'rare-habitat', 'ruin'] as const;
    const sites = [0, 1, 2].map((j) => {
      const kind = kinds[(i + j) % kinds.length];
      return {
        id: `site-${i}-${j}`,
        kind,
        name: `${['Quiet', 'Ancient', 'Hidden', 'Silver'][hash(`${seed}:${i}:${j}`) % 4]} ${kind.replace('-', ' ')}`,
        x: x + (width / 3) * (0.2 + random(regionRng, 'world') * 0.6),
        y: y + (height / 2) * (0.2 + random(regionRng, 'world') * 0.6),
        discovered: false,
        investigated: false,
        reward: 2 + j,
      };
    });
    return {
      id: `region-${i}`,
      name: biomeById[biomeId].name,
      continent: 'First continent',
      biomeId,
      x,
      y,
      width: width / 3,
      height: height / 2,
      moisture: biomeId === 'desert' ? 0.1 : biomeById[biomeId].aquatic ? 1 : 0.6,
      temperature: biomeById[biomeId].temperature,
      fertility: 1,
      population: Object.fromEntries(SPECIES.map((s) => [s.id, Math.floor(s.count / 6)])),
      sites,
      discovered: i === origin,
      explored: 0,
    };
  });
  return {
    regions,
    currentRegion: `region-${origin}`,
    discoveries: ['ocean'],
    sites: [],
    branches: [
      {
        id: 'branch-0',
        name: 'Velari',
        parentId: null,
        created: 0,
        generation: 1,
        regionId: `region-${origin}`,
        genome: structuredClone(player.genome),
        members: archive.filter((a) => a.died === null).map((a) => a.id),
        extinct: false,
        extinctionCause: null,
      },
    ],
    activeBranch: 'branch-0',
    fossils: [],
    nests: [],
    statuses: {},
    milestones: [],
    unlocks: ['microbe'],
    symbioses: [],
    challenge: 'balanced',
    climateTime: 0,
    explorationRewarded: [],
  };
}
export function regionAt(state: GameState, point: Vec): Region {
  return (
    state.evolution.regions.find(
      (r) =>
        point.x >= r.x && point.y >= r.y && point.x < r.x + r.width && point.y < r.y + r.height,
    ) ?? state.evolution.regions[0]
  );
}
export function traversal(
  state: GameState,
  c: Creature,
  point: Vec,
): { multiplier: number; reason: string | null } {
  const biome = biomeById[regionAt(state, point).biomeId],
    stats = phenotype(c.genome);
  if (stats.flight > 0 && stats.lift >= stats.mass) return { multiplier: 1.15, reason: null };
  if (biome.requirements.climbing && stats.climbing < biome.requirements.climbing)
    return { multiplier: 0.2, reason: 'Steep terrain: evolve climbing or flight.' };
  if (biome.aquatic)
    return {
      multiplier: Math.max(0.2, Math.min(1.4, stats.swimming)),
      reason: stats.swimming < 0.5 ? 'This body struggles to swim.' : null,
    };
  if (stats.walking < 0.5)
    return { multiplier: 0.2, reason: 'Dry land: evolve legs, digging limbs, or wings.' };
  return { multiplier: Math.min(1.3, 0.8 + stats.walking * 0.2), reason: null };
}
export function climate(state: GameState, point: Vec) {
  const region = regionAt(state, point),
    biome = biomeById[region.biomeId];
  const pressure = PRESSURES.find((p) => p.id === state.pressure?.id);
  return {
    biome,
    region,
    temperature: biome.temperature + Math.sin(state.time / 180) * 5 + (pressure?.temperature ?? 0),
    toxicity: clamp(biome.toxicity + (pressure?.toxicity ?? 0), 0, 1),
    moisture: clamp(region.moisture + (pressure?.water ?? 0), 0, 1),
  };
}
export function exploreRegion(state: GameState) {
  const current = regionAt(state, state.player),
    biome = biomeById[current.biomeId];
  if (state.evolution.currentRegion !== current.id) {
    state.evolution.currentRegion = current.id;
    state.world.biome = biome.name;
    record(state, 'travel', `Entered ${biome.name}`, biome.description);
  }
  if (!current.discovered) {
    current.discovered = true;
    state.evolution.discoveries.push(biome.id);
    state.lineage.points += 2;
    state.lineage.legacy += 2;
    state.evolution.milestones.push(biome.discovery);
    record(
      state,
      'milestone',
      biome.discovery,
      `Discovered ${biome.name}. Two new mutation opportunities open.`,
    );
  }
  current.explored += 0.5;
  for (const site of current.sites)
    if (!site.discovered && distance(site, state.player) < phenotype(state.player.genome).vision) {
      site.discovered = true;
      state.evolution.sites.push(site.id);
      record(
        state,
        'discovery',
        site.name,
        `A ${site.kind.replace('-', ' ')} is nearby. Investigate it to learn what this habitat preserves.`,
      );
    }
  for (const fossil of state.evolution.fossils)
    if (!fossil.discovered && distance(fossil, state.player) < 90) {
      fossil.discovered = true;
      state.lineage.points += 2;
      record(
        state,
        'fossil',
        `Found the fossil of ${fossil.name}`,
        `${fossil.adaptations.length} adaptations survive as genetic knowledge.`,
      );
    }
}
export function investigate(state: GameState, id: string): ActionResult {
  const site = state.evolution.regions.flatMap((r) => r.sites).find((s) => s.id === id);
  if (!site || !site.discovered) return { ok: false, message: 'Discover this site first.' };
  if (site.investigated)
    return { ok: false, message: 'This site has already shared its discovery.' };
  if (distance(site, state.player) > 110)
    return { ok: false, message: 'Move within 110 units of the site to investigate.' };
  site.investigated = true;
  state.lineage.points += site.reward;
  state.lineage.legacy += site.reward;
  if (site.kind === 'spring') state.player.energy = phenotype(state.player.genome).energy;
  if (site.kind === 'cave') state.evolution.unlocks.push('cave-dweller');
  if (site.kind === 'fossil') state.evolution.unlocks.push('ancestral-start');
  if (site.kind === 'rare-habitat') state.evolution.unlocks.push('photosynthetic');
  record(
    state,
    'discovery',
    `Investigated ${site.name}`,
    `Gained ${site.reward} mutation opportunities from a unique habitat.`,
  );
  return { ok: true, message: `The ${site.kind} reveals a new possibility.` };
}
export function settleResources(state: GameState) {
  for (const resource of state.resources.slice(12)) {
    const biome = biomeById[regionAt(state, resource).biomeId];
    const candidates = Object.values(resourceById).filter(
      (r) => (biome.resourceWeights[r.diet] ?? 0) > 0,
    );
    if (candidates.length)
      resource.type =
        candidates[hash(`${state.seed}:resource:${resource.id}`) % candidates.length].id;
  }
}
