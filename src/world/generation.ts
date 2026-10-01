import { streams, random } from '../core/random';
import type { Creature, GameState, Genome, RngStreams } from '../core/types';
import { phenotype } from '../biology/body';
import { RESOURCES, SPECIES, TUNING } from '../data/content';
import { record } from '../core/history';
import { createEvolution, settleResources, regionAt, biomeById } from './regions';

export function creature(
  id: string,
  speciesId: string,
  genome: Genome,
  x: number,
  y: number,
  generation = 1,
): Creature {
  const stats = phenotype(genome);
  return {
    id,
    speciesId,
    genome: structuredClone(genome),
    x,
    y,
    generation,
    health: stats.health,
    energy: TUNING.playerStartEnergy,
    stamina: 100,
    age: 0,
    angle: -0.3,
    attackCooldown: 0,
    reproductionCooldown: 0,
    poison: 0,
    juvenile: 0,
    aiTimer: 0,
    intent: { x, y },
    behavior: 'wander',
  };
}
export function createGame(seed = 'FIRST-LIGHT'): GameState {
  const rng = streams(seed.trim().slice(0, 80) || 'FIRST-LIGHT');
  const player = creature(
    'ancestor-1',
    'player',
    { organs: ['core', 'mouth', 'cilia'], mutations: [] },
    TUNING.worldWidth / 2,
    TUNING.worldHeight * 0.75,
  );
  const state: GameState = {
    schemaVersion: 4,
    seed: seed.trim().slice(0, 80) || 'FIRST-LIGHT',
    time: 0,
    tick: 0,
    nextId: TUNING.resourceCount + 1,
    rng,
    world: {
      width: TUNING.worldWidth,
      height: TUNING.worldHeight,
      biome: 'Primordial shallows',
      features: [],
      visited: [],
    },
    player,
    creatures: [],
    resources: [],
    populations: SPECIES.map((s) => ({
      speciesId: s.id,
      count: s.count,
      births: 0,
      deaths: 0,
      food: 1,
      fitness: 1,
      cause: 'A stable ecosystem',
    })),
    lineage: {
      name: 'Velari',
      points: TUNING.initialPoints,
      biomass: TUNING.initialBiomass,
      peak: 1,
      archive: [
        {
          id: player.id,
          genome: structuredClone(player.genome),
          generation: 1,
          born: 0,
          died: null,
          cause: null,
          parent: null,
        },
      ],
      legacy: 0,
      extinct: false,
    },
    history: [],
    discoveries: { species: [], resources: [], mutations: [] },
    pressure: null,
    nextEventAt: TUNING.pressureInterval,
    settings: {
      reducedMotion: false,
      particles: true,
      sound: false,
      textScale: false,
      leftHanded: false,
      control: 'hybrid',
    },
    telemetry: {
      foodEaten: 0,
      hunts: 0,
      births: 0,
      deaths: 0,
      mutations: {},
      distance: 0,
      lifespan: 0,
      mutationRejected: 0,
    },
    legacies: [],
    evolution: createEvolution(seed, TUNING.worldWidth, TUNING.worldHeight, player, [
      {
        id: player.id,
        genome: player.genome,
        generation: 1,
        born: 0,
        died: null,
        cause: null,
        parent: null,
      },
    ]),
  };
  for (let i = 0; i < 115; i++) {
    const kind = i < 12 ? 'patch' : i % 5 === 0 ? 'rock' : 'reed';
    state.world.features.push({
      ...position(rng),
      kind,
      size: 10 + random(rng, 'world') * (kind === 'patch' ? 170 : 25),
      angle: random(rng, 'world') * Math.PI * 2,
    });
  }
  for (let i = 0; i < TUNING.resourceCount; i++) {
    const type = RESOURCES[Math.floor(random(rng, 'world') * RESOURCES.length)].id;
    state.resources.push({ id: i, type, ...position(rng), active: true, regrowAt: 0 });
  }
  // A deterministic, safe feeding trail teaches the core loop before any hunt.
  for (let i = 0; i < 12; i++) {
    state.resources[i].type = RESOURCES[i % 6].id;
    state.resources[i].x = player.x + 90 + i * 30;
    state.resources[i].y = player.y + Math.sin(i * 0.8) * 70;
  }
  for (const species of SPECIES) {
    for (let i = 0; i < Math.min(TUNING.maxAgentsPerSpecies, species.count); i++) {
      let p = {
        x: 100 + random(rng, 'species') * (state.world.width - 200),
        y: 100 + random(rng, 'species') * (state.world.height - 200),
      };
      const suitable = state.evolution.regions.filter(
        (r) => biomeById[r.biomeId].aquatic === phenotype(species.genome).walking < 0.5,
      );
      if (suitable.length) {
        const region = suitable[i % suitable.length];
        p = {
          x: region.x + 60 + random(rng, 'species') * (region.width - 120),
          y: region.y + 60 + random(rng, 'species') * (region.height - 120),
        };
      }
      if (species.prey.includes('player') && Math.hypot(p.x - player.x, p.y - player.y) < 500)
        p = { x: 160 + i * 80, y: 150 };
      if (i === 0 && species.id === 'grazer') p = { x: player.x - 165, y: player.y - 150 };
      if (i === 0 && species.id === 'filterer') p = { x: player.x + 200, y: player.y + 200 };
      state.creatures.push(creature(`${species.id}-${i}`, species.id, species.genome, p.x, p.y));
    }
  }
  settleResources(state);
  state.world.biome = regionAt(state, player).name;
  record(
    state,
    'origin',
    'A lineage begins',
    'In a quiet pocket of primordial water, the first Velari takes its place in the food web.',
  );
  return state;
}
function position(rng: RngStreams) {
  return {
    x: 50 + random(rng, 'world') * (TUNING.worldWidth - 100),
    y: 50 + random(rng, 'world') * (TUNING.worldHeight - 100),
  };
}
