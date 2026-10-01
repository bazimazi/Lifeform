import type { GameState, ActionResult, Genome } from '../core/types';
import type { SpaceState, Planet, MissionKind } from './types';
import type { Cost } from '../society/types';
import { affordability, spend } from '../society/society';
import { streams, random, clamp } from '../core/random';
import { phenotype, validateBody } from '../biology/body';
import { record } from '../core/history';
import { SPECIES } from '../data/content';
const ok = (message: string): ActionResult => ({ ok: true, message }),
  no = (message: string): ActionResult => ({ ok: false, message });
export function generateSystem(seed: string, index: number): Planet[] {
  const rng = streams(`${seed}:system:${index}`),
    names = ['Aster', 'Pelagos', 'Vela', 'Iris', 'Nacre', 'Tethra', 'Mirren', 'Cinder'];
  return Array.from({ length: 6 }, (_, i) => {
    const temperature = -80 + Math.floor(random(rng, 'world') * 170),
      water = random(rng, 'world'),
      oxygen = random(rng, 'world'),
      gravity = 0.2 + random(rng, 'world') * 1.5;
    const life = Array.from({ length: water > 0.35 ? 3 : 1 }, (_, j) => {
      const d = SPECIES[Math.floor(random(rng, 'species') * SPECIES.length)],
        genome = structuredClone(d.genome);
      return {
        name: `${names[(index + i + j) % names.length]} ${d.name.toLowerCase()}`,
        genome,
        niche:
          temperature > 30
            ? 'Heat-adapted mineral scavenger'
            : temperature < 0
              ? 'Cold-adapted shelter forager'
              : 'Water-cycle symbiont',
      };
    });
    return {
      id: `system-${index}-${i}`,
      name: `${names[(index + i) % names.length]} ${index + 1}-${i + 1}`,
      kind: i === 0 ? 'moon' : i === 5 ? 'asteroid' : 'planet',
      distance: 1 + i * 2,
      temperature,
      water,
      oxygen,
      gravity,
      metal: 0.3 + random(rng, 'world') * 0.7,
      surveyed: false,
      life,
      colony: null,
      mines: 0,
      terraforming: 0,
    };
  });
}
export function createSpace(seed: string): SpaceState {
  return {
    system: 0,
    planets: generateSystem(seed, 0),
    missions: [],
    orbitalHabitats: 0,
    launches: 0,
    discoveries: 0,
    coloniesFounded: 0,
    research: null,
    improvement: 0,
    log: [],
  };
}
export function suitability(p: Planet, g: Genome) {
  const s = phenotype(g),
    temp = p.temperature + (20 - p.temperature) * p.terraforming,
    oxygen = p.oxygen + (1 - p.oxygen) * p.terraforming;
  return clamp(
    1 -
      Math.max(0, temp - s.heatTolerance) * 0.01 -
      Math.max(0, 10 - temp - s.coldTolerance) * 0.01 -
      Math.max(0, 0.65 - oxygen * s.oxygenEfficiency) * 0.5 -
      Math.max(0, 0.25 - p.water - s.waterStorage * 0.15) * 0.7 -
      Math.max(0, p.gravity - 1.2) * 0.1,
    0.05,
    1,
  );
}
export const MISSION_COSTS: Record<MissionKind, Cost> = {
  orbit: { metal: 35, fuel: 30, energy: 20 },
  survey: { metal: 12, fuel: 20, energy: 15 },
  mine: { metal: 30, fuel: 25, energy: 20 },
  colonize: { metal: 45, fuel: 35, food: 30, water: 25, energy: 25 },
  supply: { food: 25, water: 25, fuel: 12 },
  terraform: { metal: 35, energy: 60, fuel: 20 },
};
const REQUIREMENTS: Record<MissionKind, string> = {
  orbit: 'orbital-habitats',
  survey: 'planetology',
  mine: 'asteroid-mining',
  colonize: 'colonization',
  supply: 'colonization',
  terraform: 'terraforming',
};
export function launchReason(s: GameState, kind: MissionKind, target: string): string | null {
  if (s.lineage.extinct) return 'The lineage is extinct.';
  if (!MISSION_COSTS[kind]) return 'Unknown mission.';
  if (!s.society.technologies.includes(REQUIREMENTS[kind]))
    return `Requires ${REQUIREMENTS[kind].replaceAll('-', ' ')} research.`;
  if (!s.society.settlements.some((t) => !t.lost && t.buildings.launchpad))
    return 'Construct a launch complex first.';
  if (s.space.missions.length >= 3) return 'Three missions are already in flight.';
  const p = s.space.planets.find((p) => p.id === target);
  if (kind !== 'orbit' && !p) return 'Select a known destination.';
  if (p && kind !== 'survey' && !p.surveyed) return 'Survey this destination first.';
  if (kind === 'colonize' && (p!.kind === 'asteroid' || p!.colony))
    return 'Choose an uncolonized moon or planet.';
  if (['supply', 'terraform'].includes(kind) && !p?.colony) return 'Establish a colony first.';
  if (s.space.missions.some((m) => m.kind === kind && m.target === target))
    return 'This mission is already underway.';
  if (kind === 'survey' && p?.surveyed) return 'This destination has already been surveyed.';
  if (kind === 'terraform' && p!.terraforming >= 1) return 'Habitat engineering is complete.';
  return affordability(s, MISSION_COSTS[kind]);
}
export function launch(s: GameState, kind: MissionKind, target: string): ActionResult {
  const reason = launchReason(s, kind, target);
  if (reason) return no(reason);
  spend(s, MISSION_COSTS[kind]);
  const p = s.space.planets.find((p) => p.id === target);
  s.space.missions.push({
    id: `mission-${s.nextId++}`,
    kind,
    target,
    remaining: 20 + (p?.distance ?? 0) * 8,
    genome: structuredClone(s.player.genome),
    branchId: s.evolution.activeBranch,
  });
  s.space.launches++;
  log(
    s,
    `Launch ${s.space.launches}: ${kind}`,
    p
      ? `Destination ${p.name}. The expedition carries the ${s.lineage.name} genome.`
      : 'A new habitat will sustain life above the home world.',
  );
  return ok('Mission launched. Its progress follows the simulation clock.');
}
function log(s: GameState, title: string, detail: string) {
  s.space.log.push({ time: s.time, title, detail });
  if (s.space.log.length > 100) s.space.log.shift();
  record(s, 'space', title, detail);
}
export function frontier(s: GameState): ActionResult {
  if (!s.society.technologies.includes('terraforming') || s.space.orbitalHabitats < 1)
    return no('Habitat engineering and an orbital habitat are required to explore another system.');
  if (s.space.missions.length) return no('Wait for current expeditions to arrive.');
  const cost: Cost = { fuel: 60, energy: 80, metal: 30 },
    missing = affordability(s, cost);
  if (missing) return no(missing);
  spend(s, cost);
  s.space.system++;
  s.space.planets.push(...generateSystem(s.seed, s.space.system));
  // Preserve settled destinations; cap uninhabited archival worlds for bounded saves.
  while (s.space.planets.length > 120) {
    const i = s.space.planets.findIndex((p) => !p.colony && !p.mines);
    if (i < 0) break;
    s.space.planets.splice(i, 1);
  }
  log(
    s,
    'Another sky opens',
    `System ${s.space.system + 1} reveals six new destinations. Earlier colonies continue to produce and survive.`,
  );
  return ok('A new star system is available.');
}
export function researchFrontier(s: GameState): ActionResult {
  if (!s.society.technologies.includes('science'))
    return no('Research scientific institutions first.');
  if (s.space.research) return no('A frontier project is already underway.');
  const level = s.space.improvement + 1,
    cost = 20 + level * 5;
  if (s.society.knowledge < cost) return no(`Needs ${cost} knowledge.`);
  s.society.knowledge -= cost;
  const names = [
    'Adaptive habitat membranes',
    'Low-gravity materials',
    'Symbiotic life support',
    'Distributed memory',
    'Closed-cycle agriculture',
  ];
  s.space.research = {
    name: `${names[(level - 1) % names.length]} ${level}`,
    level,
    remaining: 30 + level * 3,
  };
  return ok(
    'Frontier research started. Each breakthrough improves energy efficiency and colony supplies.',
  );
}
export function tickSpace(s: GameState, dt: number) {
  const q = s.space;
  for (const m of [...q.missions]) {
    m.remaining -= dt;
    if (m.remaining > 0) continue;
    q.missions = q.missions.filter((x) => x !== m);
    const p = q.planets.find((p) => p.id === m.target);
    if (m.kind === 'orbit') {
      q.orbitalHabitats++;
      log(
        s,
        'A permanent foothold in orbit',
        'Orbital habitats produce knowledge and solar energy.',
      );
    }
    if (p) {
      if (m.kind === 'survey') {
        p.surveyed = true;
        q.discoveries += p.life.length;
        s.society.knowledge += 10 + p.life.length * 4;
        s.lineage.legacy += 5;
        log(
          s,
          `${p.name} surveyed`,
          `${p.life.length} forms of life catalogued. Biological suitability: ${Math.round(suitability(p, m.genome) * 100)}%.`,
        );
      }
      if (m.kind === 'mine') {
        p.mines++;
        log(
          s,
          `Mining begins at ${p.name}`,
          'Automated outposts return metal and fuel to the lineage economy.',
        );
      }
      if (m.kind === 'colonize') {
        p.colony = {
          population: 4,
          health: 100,
          food: 40,
          water: 40,
          genome: structuredClone(m.genome),
          branchId: m.branchId,
          founded: s.time,
        };
        q.coloniesFounded++;
        log(
          s,
          `${p.name}: life takes root`,
          'The original lineage continues on another world. Supply and environmental adaptation determine its future.',
        );
      }
      if (m.kind === 'supply' && p.colony) {
        p.colony.food += 40;
        p.colony.water += 40;
        p.colony.health = Math.min(100, p.colony.health + 15);
        log(
          s,
          `Supplies reach ${p.name}`,
          'Food, water, and repair materials reinforce the colony.',
        );
      }
      if (m.kind === 'terraform' && p.colony) {
        p.terraforming = Math.min(1, p.terraforming + 0.25);
        log(
          s,
          `${p.name} becomes more habitable`,
          `Habitat engineering ${p.terraforming * 100}% complete.`,
        );
      }
    }
  }
  if (q.research) {
    q.research.remaining -= dt;
    if (q.research.remaining <= 0) {
      q.improvement = q.research.level;
      log(
        s,
        q.research.name,
        'A scientific breakthrough improves power and colony efficiency by another 5%.',
      );
      q.research = null;
    }
  }
  const improve = 1 + q.improvement * 0.05;
  s.society.stock.energy += q.orbitalHabitats * 0.1 * dt * improve;
  s.society.knowledge += q.orbitalHabitats * 0.1 * dt;
  for (const p of q.planets) {
    s.society.stock.metal += p.mines * p.metal * 0.1 * dt;
    s.society.stock.fuel += p.mines * 0.04 * dt;
    if (!p.colony) continue;
    const c = p.colony,
      fit = suitability(p, c.genome);
    c.food = Math.max(0, c.food + dt * (fit * 0.15 * improve - c.population * 0.025));
    c.water = Math.max(0, c.water + dt * (p.water * 0.2 * improve - c.population * 0.02));
    c.health = clamp(
      c.health + dt * ((c.food > 0 && c.water > 0 ? 0.04 : -0.2) - (1 - fit) * 0.09),
      0,
      100,
    );
    if (c.health <= 0) {
      log(
        s,
        `${p.name} colony lost`,
        'Supplies or environmental adaptation were insufficient. The expedition remains in history.',
      );
      p.colony = null;
      continue;
    }
    if (c.health > 60 && c.food > 10 && c.water > 10)
      c.population = Math.min(40, c.population + dt * 0.008 * fit);
    s.society.knowledge += c.population * 0.005 * dt;
  }
}
export function validateSpace(s: GameState) {
  const q = s.space,
    bad = (): never => {
      throw new Error('Invalid save: space state');
    },
    num = (v: unknown, min = 0) => typeof v === 'number' && Number.isFinite(v) && v >= min,
    str = (v: unknown) => typeof v === 'string' && v.length < 4000;
  if (
    !q ||
    ![
      q.system,
      q.orbitalHabitats,
      q.launches,
      q.discoveries,
      q.coloniesFounded,
      q.improvement,
    ].every((v) => num(v)) ||
    !Array.isArray(q.planets) ||
    q.planets.length > 1000 ||
    !Array.isArray(q.missions) ||
    q.missions.length > 3 ||
    !Array.isArray(q.log) ||
    q.log.length > 100
  )
    bad();
  for (const p of q.planets) {
    if (
      !p ||
      !str(p.id) ||
      !str(p.name) ||
      !['moon', 'planet', 'asteroid'].includes(p.kind) ||
      ![p.distance, p.water, p.oxygen, p.gravity, p.metal, p.mines, p.terraforming].every((v) =>
        num(v),
      ) ||
      !num(p.temperature, -273) ||
      typeof p.surveyed !== 'boolean' ||
      !Array.isArray(p.life) ||
      p.life.length > 20
    )
      bad();
    for (const l of p.life)
      if (!l || !str(l.name) || !str(l.niche) || !l.genome || validateBody(l.genome)) bad();
    const c = p.colony;
    if (
      c &&
      (![c.population, c.health, c.food, c.water, c.founded].every((v) => num(v)) ||
        !s.evolution.branches.some((b) => b.id === c.branchId) ||
        !c.genome ||
        validateBody(c.genome))
    )
      bad();
  }
  if (new Set(q.planets.map((p) => p.id)).size !== q.planets.length) bad();
  for (const m of q.missions)
    if (
      !m ||
      !str(m.id) ||
      !MISSION_COSTS[m.kind] ||
      !num(m.remaining) ||
      !s.evolution.branches.some((b) => b.id === m.branchId) ||
      !m.genome ||
      validateBody(m.genome) ||
      (m.kind !== 'orbit' && !q.planets.some((p) => p.id === m.target))
    )
      bad();
  if (
    q.research &&
    (!str(q.research.name) || !num(q.research.remaining) || !num(q.research.level, 1))
  )
    bad();
  for (const l of q.log) if (!l || !str(l.title) || !str(l.detail) || !num(l.time)) bad();
}
