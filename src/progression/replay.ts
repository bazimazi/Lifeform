import { createTerrain } from '../world/terrain';
import type { GameState, ActionResult, Stats } from '../core/types';
import {
  TRAITS,
  type Trait,
  type ProgressionState,
  type AdaptiveVariation,
  type Objective,
} from './types';
import { streams, random } from '../core/random';
import { phenotype, validateBody } from '../biology/body';
import { mutatedGenome } from '../biology/body';
import { record } from '../core/history';
import { baselineGenes } from '../biology/genetics';
import { GENES } from '../data/biology';
import { SPECIES, BASE_STATS } from '../data/content';
import { creature } from '../world/generation';
import { regionAt } from '../world/regions';
const yes = (message: string): ActionResult => ({ ok: true, message }),
  no = (message: string): ActionResult => ({ ok: false, message });
export const STARTS = [
  { id: 'microbe', name: 'Microbe', description: 'A flexible, tiny beginning.', mutations: [] },
  {
    id: 'photosynthetic',
    name: 'Photosynthetic organism',
    description: 'Sunlight supplements food, at the cost of speed.',
    mutations: ['sun-cell'],
  },
  {
    id: 'predatory',
    name: 'Predatory microbe',
    description: 'A jaw opens the meat food web.',
    mutations: ['predatory-jaw'],
  },
  {
    id: 'filter-feeder',
    name: 'Filter feeder',
    description: 'A specialist in microscopic food.',
    mutations: ['filter-mouth'],
  },
  {
    id: 'parasitic',
    name: 'Parasitic organism',
    description: 'Steal energy through close biological contact.',
    mutations: ['predatory-jaw'],
  },
  {
    id: 'social-start',
    name: 'Colonial organism',
    description: 'Cooperative behavior and larger broods.',
    mutations: ['brood-sac'],
  },
];
export const CHALLENGES = [
  { id: 'normal', name: 'Living world', description: 'Balanced environmental pressures.' },
  { id: 'cold', name: 'Ice age', description: 'All habitats are 20 degrees colder.' },
  { id: 'heat', name: 'Hothouse', description: 'All habitats are 20 degrees hotter.' },
  { id: 'dark', name: 'Sunless world', description: 'Photosynthesis receives no sunlight.' },
  {
    id: 'predators',
    name: 'Predator world',
    description: 'Predators are more numerous and aggressive.',
  },
  {
    id: 'tiny',
    name: 'Tiny world',
    description: 'Half-size dimensions compress habitats and encounters.',
  },
  {
    id: 'high-gravity',
    name: 'High gravity',
    description: 'Travel is slower and flight needs twice the lift.',
  },
  {
    id: 'low-gravity',
    name: 'Low gravity',
    description: 'Travel is faster and flight needs less lift.',
  },
  {
    id: 'rapid',
    name: 'Rapid evolution',
    description: 'Biological discoveries award twice the mutation points.',
  },
  {
    id: 'extinction',
    name: 'Mass extinction',
    description: 'Severe world pressures return every 75 seconds.',
  },
  {
    id: 'scarcity',
    name: 'Limited food',
    description: 'Half the food begins dormant; regrowth takes twice as long.',
  },
];
export function variations(seed: string, round: number): AdaptiveVariation[] {
  const rng = streams(`${seed}:adaptation:${round}`),
    pairs: [string, string, Partial<Stats>][] = [
      [
        'Heat exchanger',
        'Shed heat at the cost of energy storage.',
        { heatTolerance: 12, energy: -8 },
      ],
      [
        'Dense insulation',
        'Keep warmth at the cost of mobility.',
        { coldTolerance: 12, speed: -6 },
      ],
      [
        'Efficient neural tissue',
        'Remember more while consuming more energy.',
        { intelligence: 8, memory: 10, metabolism: 0.12 },
      ],
      ['Powerful muscle', 'Strike harder while carrying more mass.', { attack: 5, mass: 1 }],
      ['Light membrane', 'Move faster with a more fragile body.', { speed: 12, health: -8 }],
      [
        'Selective immunity',
        'Resist infection with higher metabolic upkeep.',
        { immunity: 0.15, metabolism: 0.1 },
      ],
      [
        'Pressure valve',
        'Endure deeper water with less speed.',
        { pressureTolerance: 0.5, speed: -5 },
      ],
      ['Water recycling', 'Store water with a heavier body.', { waterStorage: 0.6, mass: 1 }],
      [
        'Acute perception',
        'Sense distant food while spending more energy.',
        { smell: 70, vision: 30, metabolism: 0.1 },
      ],
    ];
  const chosen = new Set<number>();
  while (chosen.size < 3) chosen.add(Math.floor(random(rng, 'mutation') * pairs.length));
  return [...chosen].map((i, n) => ({
    id: `variation-${round}-${n}`,
    name: `${pairs[i][0]} ${round + 1}`,
    description: pairs[i][1],
    modifiers: pairs[i][2],
  }));
}
export function createProgression(seed: string): ProgressionState {
  return {
    objectives: [],
    completed: 0,
    variations: variations(seed, 0),
    variationRound: 0,
    wildGenomes: {},
    selectionEvents: 0,
    apex: null,
    pressureSurvived: 0,
    startingPath: 'microbe',
    discoveryPoints: 0,
  };
}
export function configureStart(
  s: GameState,
  path: string,
  challenge: string,
  unlocks: string[],
): ActionResult {
  const start = STARTS.find((x) => x.id === path);
  if (!start || !unlocks.includes(path))
    return no('This starting organism has not been discovered.');
  if (!CHALLENGES.some((c) => c.id === challenge)) return no('Unknown world rules.');
  let genome = s.player.genome;
  for (const id of start.mutations) genome = mutatedGenome(genome, id);
  if (path === 'parasitic') genome.traits = ['parasitic'];
  if (path === 'social-start') genome.traits = ['cooperative'];
  const error = validateBody(genome);
  if (error) return no(error);
  s.player.genome = genome;
  s.player.health = phenotype(genome).health;
  s.player.energy = phenotype(genome).energy * 0.82;
  s.lineage.archive[0].genome = structuredClone(genome);
  s.evolution.branches[0].genome = structuredClone(genome);
  s.progression.startingPath = path;
  s.evolution.challenge = challenge;
  if (challenge === 'tiny') {
    s.world.width /= 2;
    s.world.height /= 2;
    for (const p of [s.player, ...s.creatures, ...s.resources, ...s.world.features]) {
      p.x /= 2;
      p.y /= 2;
    }
    for (const c of [s.player, ...s.creatures]) c.intent = { x: c.x, y: c.y };
    for (const r of s.evolution.regions) {
      r.x /= 2;
      r.y /= 2;
      r.width /= 2;
      r.height /= 2;
      for (const site of r.sites) {
        site.x /= 2;
        site.y /= 2;
      }
    }
  }
  s.world.terrain = createTerrain(s.seed, s.world.width, s.world.height, s.evolution.regions);
  if (challenge === 'scarcity')
    for (let i = 12; i < s.resources.length; i += 2) {
      s.resources[i].active = false;
      s.resources[i].regrowAt = 60;
    }
  if (challenge === 'predators')
    for (const pop of s.populations)
      if (SPECIES.find((x) => x.id === pop.speciesId)!.prey.length) pop.count *= 2;
  if (challenge === 'extinction') s.nextEventAt = 30;
  record(
    s,
    'origin',
    `${start.name}: ${CHALLENGES.find((c) => c.id === challenge)!.name}`,
    start.description,
  );
  return yes('A different evolutionary path begins.');
}
export function adoptVariation(s: GameState, id: string): ActionResult {
  const v = s.progression.variations.find((v) => v.id === id);
  if (!v) return no('This variation is no longer available.');
  if (s.lineage.points < 2 || s.lineage.biomass < 6)
    return no('Needs 2 mutation points and 6 biomass.');
  const g = structuredClone(s.player.genome);
  g.variations ??= [];
  if (g.variations.length >= 3)
    return no('A body supports three adaptive variations. Remove one first.');
  g.variations.push(structuredClone(v));
  const reason = validateBody(g);
  if (reason) return no(reason);
  s.player.genome = g;
  s.player.health = Math.min(s.player.health, phenotype(g).health);
  s.player.energy = Math.min(s.player.energy, phenotype(g).energy);
  s.lineage.points -= 2;
  s.lineage.biomass -= 6;
  refreshGenomeArchive(s);
  s.progression.variationRound++;
  s.progression.variations = variations(s.seed, s.progression.variationRound);
  record(s, 'mutation', v.name, v.description);
  return yes('The inherited variation changes your phenotype.');
}
export function removeVariation(s: GameState, id: string): ActionResult {
  const g = structuredClone(s.player.genome);
  if (!g.variations?.some((v) => v.id === id)) return no('Variation not installed.');
  g.variations = g.variations.filter((v) => v.id !== id);
  const reason = validateBody(g);
  if (reason) return no(reason);
  s.player.genome = g;
  refreshGenomeArchive(s);
  return yes('Variation removed.');
}
function refreshGenomeArchive(s: GameState) {
  const a = s.lineage.archive.find((a) => a.id === s.player.id);
  if (a) a.genome = structuredClone(s.player.genome);
}
export function adoptTrait(s: GameState, value: string): ActionResult {
  if (!TRAITS.includes(value as Trait)) return no('Unknown behavior.');
  const trait = value as Trait,
    g = s.player.genome;
  g.traits ??= [];
  if (g.traits.includes(trait)) {
    g.traits = g.traits.filter((t) => t !== trait);
    refreshGenomeArchive(s);
    return yes('Behavior removed.');
  }
  if (g.traits.length >= 3) return no('Choose at most three behavioral specializations.');
  if (s.lineage.points < 1 || s.lineage.biomass < 3) return no('Needs 1 point and 3 biomass.');
  if (
    (trait === 'solitary' &&
      g.traits.some((t) => ['social', 'cooperative', 'herd', 'pack-hunting'].includes(t))) ||
    (trait !== 'solitary' &&
      ['social', 'cooperative', 'herd', 'pack-hunting'].includes(trait) &&
      g.traits.includes('solitary'))
  )
    return no('Solitary and group behaviors are incompatible.');
  g.traits.push(trait);
  s.lineage.points--;
  s.lineage.biomass -= 3;
  refreshGenomeArchive(s);
  record(
    s,
    'behavior',
    `A ${trait.replaceAll('-', ' ')} lineage`,
    'Offspring inherit this behavior; it changes their decisions and biological tradeoffs.',
  );
  return yes('Behavior adopted and inherited.');
}
export function objectiveValue(s: GameState, kind: Objective['kind']) {
  return kind === 'food'
    ? s.telemetry.foodEaten
    : kind === 'births'
      ? s.telemetry.births
      : kind === 'travel'
        ? s.telemetry.distance
        : kind === 'time'
          ? s.time
          : kind === 'hunts'
            ? s.telemetry.hunts
            : kind === 'tools'
              ? s.society.crafted
              : kind === 'trade'
                ? s.society.tradeCount
                : s.space.launches;
}
export function refreshObjectives(s: GameState) {
  const q = s.progression;
  const choices: Objective['kind'][] =
    s.society.era === 'space'
      ? ['space', 'trade', 'time']
      : s.society.era === 'biology'
        ? ['food', 'births', 'travel', 'time', 'hunts']
        : ['tools', 'trade', 'food', 'time'];
  while (q.objectives.filter((o) => !o.claimed).length < 3) {
    const rng = streams(`${s.seed}:objective:${q.completed}:${q.objectives.length}`),
      kind = choices[Math.floor(random(rng, 'event') * choices.length)],
      amount =
        kind === 'time'
          ? 60 + q.completed * 10
          : kind === 'travel'
            ? 600 + q.completed * 50
            : kind === 'food'
              ? 8 + q.completed
              : 1 + Math.floor(q.completed / 5);
    const names = {
      food: 'Find nourishment',
      births: 'Continue the lineage',
      travel: 'Beyond familiar territory',
      time: 'Endure another season',
      hunts: 'A place in the food web',
      tools: 'The inventive body',
      trade: 'Build understanding',
      space: 'Carry life farther',
    };
    q.objectives.push({
      id: `objective-${s.nextId++}`,
      kind,
      name: names[kind],
      baseline: objectiveValue(s, kind),
      target: amount,
      reward: 2,
      claimed: false,
    });
  }
  q.objectives = q.objectives
    .filter((o) => !o.claimed)
    .concat(q.objectives.filter((o) => o.claimed).slice(-12));
}
export function claimObjective(s: GameState, id: string): ActionResult {
  const o = s.progression.objectives.find((o) => o.id === id);
  if (!o || o.claimed) return no('Objective already claimed or unknown.');
  if (objectiveValue(s, o.kind) - o.baseline < o.target)
    return no('Keep exploring: this objective is not yet complete.');
  o.claimed = true;
  s.progression.completed++;
  s.lineage.points += o.reward;
  s.lineage.legacy += 2;
  s.progression.discoveryPoints++;
  refreshObjectives(s);
  record(
    s,
    'objective',
    o.name,
    'An ecological objective grants new possibilities. Another challenge awaits.',
  );
  return yes('Objective complete: 2 mutation points, 2 legacy marks, and 1 discovery point.');
}
export function tickReplay(s: GameState) {
  refreshObjectives(s);
  const unlocks = s.evolution.unlocks;
  for (const [id, ready] of [
    ['filter-feeder', s.discoveries.resources.length >= 2],
    ['parasitic', Object.values(s.evolution.statuses).some((list) => list.length > 0)],
    ['social-start', s.telemetry.births >= 3],
  ] as [string, boolean][])
    if (ready && !unlocks.includes(id)) unlocks.push(id);
  if (s.time >= 180 && !s.progression.apex) {
    const r = s.evolution.regions.find((r) => r.biomeId === 'mountain')!;
    const d = SPECIES.find((d) => d.id === 'reedstalker')!;
    const g = structuredClone(d.genome);
    g.variations = [
      {
        id: 'titan',
        name: 'Ancient giant',
        description: 'Territorial mass comes at the expense of speed.',
        modifiers: { health: 180, attack: 12, speed: -45, defense: 4 },
      },
    ];
    g.traits = ['territorial'];
    const c = creature(`apex-${s.nextId++}`, d.id, g, r.x + r.width / 2, r.y + r.height / 2);
    s.creatures.push(c);
    s.populations.find((p) => p.speciesId === d.id)!.count++;
    s.progression.apex = { id: c.id, regionId: r.id, defeated: false, avoided: false };
    record(
      s,
      'apex',
      'An ancient giant stirs',
      'A slow, territorial apex organism occupies the highlands. Adapt, cooperate, or give it room.',
    );
  }
  const apex = s.progression.apex;
  if (
    apex &&
    !apex.avoided &&
    !apex.defeated &&
    regionAt(s, s.player).id === apex.regionId &&
    s.telemetry.distance > 1500
  ) {
    apex.avoided = true;
    s.lineage.points += 2;
    record(
      s,
      'milestone',
      'Living alongside a giant',
      'Your lineage explores the apex territory and survives without needing to dominate it.',
    );
  }
}
export function naturalSelection(s: GameState) {
  for (const pop of s.populations) {
    if (pop.count <= 0) continue;
    const species = SPECIES.find((d) => d.id === pop.speciesId)!;
    const representatives = s.creatures.filter(
      (c) => c.speciesId === pop.speciesId && !c.id.startsWith('apex-'),
    );
    const best = representatives.sort(
      (a, b) =>
        b.health / phenotype(b.genome).health +
        b.energy / phenotype(b.genome).energy -
        a.health / phenotype(a.genome).health -
        a.energy / phenotype(a.genome).energy,
    )[0];
    const g = structuredClone(
      best?.genome ?? s.progression.wildGenomes[species.id] ?? species.genome,
    );
    g.genes ??= baselineGenes();
    const gene = GENES[Math.floor(random(s.rng, 'mutation') * GENES.length)];
    const pair = g.genes[gene.id];
    pair[Math.floor(random(s.rng, 'mutation') * 2)] = Math.floor(random(s.rng, 'mutation') * 3) as
      0 | 1 | 2;
    if (!validateBody(g)) {
      s.progression.wildGenomes[species.id] = g;
      s.progression.selectionEvents++;
    }
  }
}
export function validateProgression(s: GameState) {
  const q = s.progression,
    bad = (): never => {
      throw new Error('Invalid save: progression');
    },
    n = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0,
    str = (v: unknown) => typeof v === 'string' && v.length <= 4000;
  if (
    !q ||
    ![
      q.completed,
      q.variationRound,
      q.selectionEvents,
      q.pressureSurvived,
      q.discoveryPoints,
    ].every(n) ||
    !STARTS.some((p) => p.id === q.startingPath) ||
    !Array.isArray(q.objectives) ||
    q.objectives.length > 20 ||
    !Array.isArray(q.variations) ||
    q.variations.length !== 3 ||
    !q.wildGenomes
  )
    bad();
  for (const o of q.objectives)
    if (
      !o ||
      !str(o.id) ||
      !str(o.name) ||
      !['food', 'births', 'travel', 'time', 'hunts', 'tools', 'trade', 'space'].includes(o.kind) ||
      ![o.baseline, o.target, o.reward].every(n) ||
      typeof o.claimed !== 'boolean'
    )
      bad();
  for (const v of q.variations)
    if (
      !v ||
      !str(v.id) ||
      !str(v.name) ||
      !str(v.description) ||
      !v.modifiers ||
      Object.entries(v.modifiers).some(
        ([key, value]) => !(key in BASE_STATS) || !Number.isFinite(value) || Math.abs(value) > 200,
      )
    )
      bad();
  for (const [id, g] of Object.entries(q.wildGenomes))
    if (!SPECIES.some((d) => d.id === id) || !g || validateBody(g)) bad();
  if (
    q.apex &&
    (!str(q.apex.id) ||
      !s.evolution.regions.some((r) => r.id === q.apex!.regionId) ||
      typeof q.apex.defeated !== 'boolean' ||
      typeof q.apex.avoided !== 'boolean')
  )
    bad();
}
