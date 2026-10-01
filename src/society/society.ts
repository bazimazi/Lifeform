import type { ActionResult, GameState, Creature } from '../core/types';
import {
  MATERIALS,
  PROFESSIONS,
  type Stock,
  type Cost,
  type SocietyState,
  type Settlement,
  type Profession,
  type Material,
} from './types';
import { BUILDINGS, techById, toolById, buildingById } from '../data/society';
import { phenotype } from '../biology/body';
import { regionAt, biomeById } from '../world/regions';
import { distance, clamp } from '../core/random';
import { record } from '../core/history';
import { lineagePopulation } from '../biology/reproduction';
import { creature } from '../world/generation';
const yes = (message: string): ActionResult => ({ ok: true, message }),
  no = (message: string): ActionResult => ({ ok: false, message });
export const emptyStock = (): Stock => Object.fromEntries(MATERIALS.map((m) => [m, 0])) as Stock;
export function createSociety(): SocietyState {
  return {
    era: 'biology',
    stock: emptyStock(),
    tools: [],
    settlements: [],
    neighbors: [],
    technologies: [],
    research: null,
    knowledge: 0,
    learning: 0,
    memory: [],
    gatherReadyAt: 0,
    culture: {
      language: 'Unspoken',
      traditions: [],
      architecture: 'Living shelter',
      mythology: 'The first ancestor',
      art: 'Cellular patterns',
      music: 'Rhythmic calls',
      government: 'council',
      law: 'balanced',
      history: [],
    },
    pollution: 0,
    production: emptyStock(),
    consumption: emptyStock(),
    tick: 0,
    tradeCount: 0,
    crafted: 0,
  };
}
export function intelligenceReason(s: GameState, advanced = false): string | null {
  const p = phenotype(s.player.genome);
  if (s.lineage.extinct) return 'This lineage is extinct.';
  if (p.intelligence < 25 || p.manipulation < 30)
    return 'Evolve an associative brain and manipulating digits to make tools.';
  if (advanced && (p.intelligence < 50 || p.communication < 25 || p.sociality < 15))
    return 'A society needs intelligence 50, communication 25, and sociality 15.';
  return null;
}
export function affordability(s: GameState, cost: Cost): string | null {
  const missing = Object.entries(cost).filter(
    ([m, n]) => s.society.stock[m as Material] + 1e-8 < n,
  );
  return missing.length
    ? `Needs ${missing.map(([m, n]) => `${Math.ceil(n - s.society.stock[m as Material])} more ${m}`).join(', ')}.`
    : null;
}
export function spend(s: GameState, cost: Cost) {
  for (const [m, n] of Object.entries(cost))
    s.society.stock[m as Material] = Math.max(0, s.society.stock[m as Material] - n);
}
export function toolBonus(s: GameState, effect: string, wear = 0) {
  let bonus = 0;
  for (const t of s.society.tools) {
    const d = toolById[t.id];
    if (d.effect === effect && t.durability > 0) {
      bonus += d.bonus;
      t.durability = Math.max(0, t.durability - wear);
    }
  }
  s.society.tools = s.society.tools.filter((t) => t.durability > 0);
  return bonus;
}
export function learnPlace(s: GameState, resource: string, p: { x: number; y: number }) {
  if (phenotype(s.player.genome).memory <= 0) return;
  const memory = s.society.memory.find((m) => m.resource === resource && distance(m, p) < 100);
  if (memory) {
    memory.visits++;
    memory.lastSeen = s.time;
  } else {
    s.society.memory.push({ ...p, resource, visits: 1, lastSeen: s.time });
    if (s.society.memory.length > 40) s.society.memory.shift();
  }
  s.society.learning++;
  s.society.knowledge += 0.4;
}
export function gather(s: GameState, material: string): ActionResult {
  const reason = intelligenceReason(s);
  if (reason) return no(reason);
  if (!MATERIALS.includes(material as Material) || ['metal', 'energy'].includes(material))
    return no('Refine metal and generate energy in a settlement.');
  if (s.time < s.society.gatherReadyAt)
    return no(`Gather again in ${Math.ceil(s.society.gatherReadyAt - s.time)} seconds.`);
  const local = regionAt(s, s.player),
    biome = biomeById[local.biomeId],
    m = material as Material;
  const abundance: Partial<Stock> = {
    food: local.fertility,
    water: local.moisture + (biome.aquatic ? 1 : 0),
    wood: ['forest', 'swamp'].includes(local.biomeId) ? 1.4 : 0.3,
    stone: biome.elevation + 0.4,
    fiber: local.fertility,
    bone: 0.45,
    fuel: local.biomeId === 'desert' ? 1.1 : 0.4,
  };
  const amount = Math.max(1, Math.floor(4 * (abundance[m] ?? 0) * (1 + toolBonus(s, 'gather', 1))));
  if (s.player.energy < 5) return no('Eat before gathering materials.');
  s.player.energy -= 4;
  s.society.stock[m] += amount;
  s.society.gatherReadyAt = s.time + 3;
  learnPlace(s, m, s.player);
  return yes(`Gathered ${amount} ${m} in ${local.name}.`);
}
export function convertBiomass(s: GameState): ActionResult {
  if (s.lineage.biomass < 5) return no('Needs 5 biomass.');
  s.lineage.biomass -= 5;
  s.society.stock.food += 10;
  return yes('Converted 5 biomass into 10 stored food.');
}
export function craft(s: GameState, id: string): ActionResult {
  const d = toolById[id],
    reason = intelligenceReason(s);
  if (reason) return no(reason);
  if (!d) return no('Unknown tool.');
  if (!s.society.technologies.includes(d.technology))
    return no(`Research ${techById[d.technology].name} first.`);
  if (s.society.tools.some((t) => t.id === id))
    return no('This tool is already carried. Use it before crafting a replacement.');
  const missing = affordability(s, d.cost);
  if (missing) return no(missing);
  spend(s, d.cost);
  s.society.tools.push({ id, durability: d.durability });
  s.society.crafted++;
  record(s, 'crafting', `Made ${d.name.toLowerCase()}`, d.description);
  return yes(`${d.name} crafted.`);
}
export function heal(s: GameState): ActionResult {
  const t = s.society.tools.find((t) => t.id === 'remedy');
  if (!t) return no('Craft a herbal remedy first.');
  s.society.tools = s.society.tools.filter((x) => x !== t);
  delete s.evolution.statuses[s.player.id];
  s.player.poison = 0;
  s.player.health = Math.min(phenotype(s.player.genome).health, s.player.health + 25);
  return yes('Infections treated; health restored.');
}
export function researchReason(s: GameState, id: string): string | null {
  const d = techById[id];
  if (!d) return 'Unknown technology.';
  const reason = intelligenceReason(s);
  if (reason) return reason;
  if (s.society.technologies.includes(id)) return 'Already researched.';
  if (s.society.research) return 'A research project is already underway.';
  const prerequisite = d.requires.find((r) => !s.society.technologies.includes(r));
  if (prerequisite) return `Requires ${techById[prerequisite].name}.`;
  if (s.society.knowledge < d.knowledge)
    return `Needs ${Math.ceil(d.knowledge - s.society.knowledge)} more knowledge. Learn by gathering, observing, and employing scholars.`;
  if (d.era !== 'intelligence' && !s.society.settlements.some((t) => !t.lost))
    return 'Found a settlement first.';
  return affordability(s, d.cost);
}
export function research(s: GameState, id: string): ActionResult {
  const reason = researchReason(s, id);
  if (reason) return no(reason);
  const d = techById[id];
  spend(s, d.cost);
  s.society.knowledge -= d.knowledge;
  s.society.research = { id, remaining: d.seconds };
  return yes(`Researching ${d.name}. Return to the habitat to let time pass.`);
}
export function foundSettlement(s: GameState, name: string): ActionResult {
  const reason = intelligenceReason(s, true);
  if (reason) return no(reason);
  if (lineagePopulation(s) < 3) return no('Establish at least three living relatives first.');
  if (s.society.settlements.filter((t) => !t.lost).length >= 12)
    return no('This world supports twelve settlements.');
  if (s.society.settlements.some((t) => !t.lost && distance(t, s.player) < 300))
    return no('Travel at least 300 units from an existing settlement.');
  const cost: Cost = { food: 12, wood: 8, fiber: 8 },
    missing = affordability(s, cost);
  if (missing) return no(missing);
  name = name.trim().slice(0, 40);
  if (!name) return no('Name the settlement.');
  spend(s, cost);
  const jobs = Object.fromEntries(PROFESSIONS.map((j) => [j, 0])) as Settlement['jobs'];
  jobs.gatherer = 2;
  jobs.scholar = 1;
  const r = regionAt(s, s.player);
  const town: Settlement = {
    id: `town-${s.nextId++}`,
    name,
    regionId: r.id,
    branchId: s.evolution.activeBranch,
    genome: structuredClone(s.player.genome),
    x: s.player.x,
    y: s.player.y,
    population: 3,
    growth: 0,
    health: 100,
    stability: 70,
    buildings: { shelter: 1 },
    jobs,
    queue: null,
    founded: s.time,
    lost: false,
  };
  s.society.settlements.push(town);
  s.society.era = 'tribal';
  s.society.stock.water += 12;
  if (!s.society.neighbors.length)
    for (const other of s.evolution.regions.filter((r) => r.id !== town.regionId).slice(0, 3))
      s.society.neighbors.push({
        id: `neighbor-${other.id}`,
        name: `${other.name.split(' ')[0]} Kin`,
        regionId: other.id,
        population: 8,
        relations: 0,
        culture: `${biomeById[other.biomeId].aquatic ? 'Tide keepers' : 'Land stewards'} of ${other.name}`,
        specialty:
          other.biomeId === 'mountain' ? 'stone' : other.biomeId === 'desert' ? 'fuel' : 'wood',
        trade: false,
        conflict: false,
      });
  updateCulture(s);
  record(
    s,
    'settlement',
    `${name} is founded`,
    `The ${s.lineage.name} lineage forms a settlement. Its ${biomeById[r.biomeId].aquatic ? 'aquatic' : 'terrestrial'} biology shapes its architecture and food production.`,
  );
  return yes(`${name} founded. Assign professions and build a food supply.`);
}
export function assignProfession(
  s: GameState,
  townId: string,
  job: string,
  delta: number,
): ActionResult {
  const t = s.society.settlements.find((t) => t.id === townId && !t.lost);
  if (!t || !PROFESSIONS.includes(job as Profession) || ![1, -1].includes(delta))
    return no('Invalid profession assignment.');
  const j = job as Profession;
  if (t.jobs[j] + delta < 0) return no('No worker to remove.');
  if (delta > 0 && Object.values(t.jobs).reduce((a, b) => a + b, 0) >= Math.floor(t.population))
    return no('All citizens have a profession. Reassign one first.');
  t.jobs[j] += delta;
  return yes(`${t.name}: ${t.jobs[j]} ${j}${t.jobs[j] === 1 ? '' : 's'}.`);
}
export function construct(s: GameState, townId: string, id: string): ActionResult {
  const t = s.society.settlements.find((t) => t.id === townId && !t.lost),
    d = buildingById[id];
  if (!t || !d) return no('Choose a settlement and building.');
  if (t.queue) return no('Finish current construction first.');
  if (!s.society.technologies.includes(d.technology))
    return no(`Requires ${techById[d.technology].name}.`);
  if (
    id === 'aquafarm' &&
    !biomeById[s.evolution.regions.find((r) => r.id === t.regionId)!.biomeId].aquatic
  )
    return no('Aquatic gardens need an aquatic settlement.');
  if (
    id === 'farm' &&
    biomeById[s.evolution.regions.find((r) => r.id === t.regionId)!.biomeId].aquatic
  )
    return no('Use aquaculture in an aquatic habitat.');
  if ((t.buildings[id] ?? 0) >= 8) return no('This settlement already has eight of that building.');
  const missing = affordability(s, d.cost);
  if (missing) return no(missing);
  spend(s, d.cost);
  t.queue = { building: id, remaining: d.seconds };
  return yes(`Building ${d.name} in ${t.name}.`);
}
export function policy(s: GameState, kind: string, value: string): ActionResult {
  if (!s.society.technologies.includes('governance'))
    return no('Research civic institutions first.');
  if (kind === 'government' && ['council', 'stewardship', 'assembly'].includes(value))
    s.society.culture.government = value as SocietyState['culture']['government'];
  else if (kind === 'law' && ['balanced', 'conservation', 'expansion'].includes(value))
    s.society.culture.law = value as SocietyState['culture']['law'];
  else return no('Unknown policy.');
  updateCulture(s);
  record(
    s,
    'politics',
    `A new ${kind}`,
    `${value} shapes production, stability, and environmental protection.`,
  );
  return yes('Policy adopted.');
}
export function diplomacy(s: GameState, id: string, action: string): ActionResult {
  const n = s.society.neighbors.find((n) => n.id === id);
  if (!n) return no('Unknown neighbor.');
  if (action === 'gift') {
    const missing = affordability(s, { food: 5 });
    if (missing) return no(missing);
    spend(s, { food: 5 });
    n.relations = clamp(n.relations + 15, -100, 100);
    if (n.relations >= 0) n.conflict = false;
  } else if (action === 'trade') {
    if (!s.society.technologies.includes('trade')) return no('Research exchange networks first.');
    if (n.relations < 0) return no('Restore peaceful relations first.');
    const missing = affordability(s, { food: 5 });
    if (missing) return no(missing);
    spend(s, { food: 5 });
    s.society.stock[n.specialty] += 8;
    n.relations = clamp(n.relations + 3, -100, 100);
    s.society.tradeCount++;
  } else if (action === 'route') {
    if (!s.society.technologies.includes('trade') || n.relations < 15)
      return no('Trade routes require exchange networks and relations of 15.');
    n.trade = !n.trade;
  } else if (action === 'territory') {
    const security = s.society.settlements.reduce((sum, t) => sum + t.jobs.warrior * 8, 0);
    if (security < 24) return no('Territorial expansion needs at least three warriors.');
    n.relations -= 35;
    n.conflict = true;
    const r = s.evolution.regions.find((r) => r.id === n.regionId)!;
    r.discovered = true;
    if (!s.evolution.discoveries.includes(r.biomeId)) s.evolution.discoveries.push(r.biomeId);
    s.society.stock.stone += 10;
  } else return no('Unknown diplomatic action.');
  record(
    s,
    'diplomacy',
    `${n.name}: ${action}`,
    `Relations ${n.relations}. ${n.conflict ? 'Border conflict threatens settlement security.' : 'Peaceful exchange remains possible.'}`,
  );
  return yes('Diplomatic action resolved.');
}
export function updateCulture(s: GameState) {
  const c = s.society.culture,
    p = phenotype(s.player.genome),
    events = s.history
      .filter((h) => h.type === 'environment')
      .map((h) => h.title.toLowerCase())
      .join(' ');
  c.language =
    p.communication >= 25
      ? `${s.lineage.name} ${p.hearing > 0 ? 'harmonic' : 'gesture'} language`
      : 'Unspoken';
  c.architecture =
    p.flight > 0
      ? 'Suspended aeries'
      : p.walking < 0.5
        ? 'Floating and submerged homes'
        : p.burrowing > 0
          ? 'Subterranean halls'
          : 'Courtyard shelters';
  if (events.includes('flood')) {
    c.traditions.push('Remembering the high water');
    c.architecture = 'Raised flood-resistant dwellings';
    c.mythology = 'The ancestors who carried life above the flood';
  }
  if (events.includes('winter')) c.traditions.push('The shared winter store');
  if (s.evolution.fossils.length) c.traditions.push('Honoring fossil ancestors');
  if (s.society.tradeCount > 0) c.traditions.push('Guest-right at the exchange');
  if (s.telemetry.hunts > 3) c.traditions.push('The cooperative hunt');
  if (!c.traditions.length)
    c.traditions.push(`The founding of ${s.society.settlements[0]?.name ?? s.lineage.name}`);
  c.traditions = [...new Set(c.traditions)];
  c.art = `${s.evolution.discoveries.join(' and ')} motifs`;
  c.music =
    p.hearing > 0
      ? 'Antiphonal calls and resonant percussion'
      : 'Rhythmic movement and tactile percussion';
  const entry = `${c.government} / ${c.law} / ${c.architecture}`;
  if (c.history.at(-1) !== entry) c.history.push(entry);
  if (c.history.length > 100) c.history.shift();
}
export function housing(t: Settlement) {
  return Object.entries(t.buildings).reduce(
    (sum, [id, n]) => sum + buildingById[id].housing * n,
    0,
  );
}
export function tickSociety(s: GameState, dt: number) {
  const q = s.society;
  q.tick++;
  q.production = emptyStock();
  q.consumption = emptyStock();
  if (!intelligenceReason(s)) {
    if (q.era === 'biology') {
      q.era = 'intelligence';
      q.knowledge += 4;
      record(
        s,
        'milestone',
        'Learning becomes a shared resource',
        'Gather materials, make tools, and preserve learned places.',
      );
    }
    q.knowledge += dt * 0.04;
  }
  if (q.research) {
    q.research.remaining -=
      dt * (1 + q.settlements.reduce((n, t) => n + (t.lost ? 0 : t.jobs.scholar * 0.04), 0));
    if (q.research.remaining <= 0) {
      const d = techById[q.research.id];
      q.technologies.push(d.id);
      q.research = null;
      const eras = ['biology', 'intelligence', 'tribal', 'civilization', 'industrial', 'space'];
      if (eras.indexOf(d.era) > eras.indexOf(q.era)) q.era = d.era;
      record(s, 'technology', d.name, d.description);
      s.lineage.legacy += 2;
    }
  }
  for (const t of q.settlements) {
    if (t.lost) continue;
    const r = s.evolution.regions.find((r) => r.id === t.regionId)!,
      b = biomeById[r.biomeId],
      p = phenotype(t.genome),
      jobs = t.jobs;
    const legal = q.culture.law === 'expansion' ? 1.2 : q.culture.law === 'conservation' ? 0.85 : 1;
    const efficiency =
      (0.5 + t.stability / 200) *
      legal *
      (1 + (t.buildings.road ?? 0) * 0.05 + (t.buildings.transport ?? 0) * 0.08) *
      (1 + p.manipulation / 300);
    const add = (m: Material, n: number) => {
      q.stock[m] += n * dt * efficiency;
      q.production[m] += n * efficiency;
    };
    add(
      'food',
      jobs.gatherer * 0.13 * Math.max(0.3, r.fertility) +
        jobs.hunter * 0.18 * (1 + p.attack / 50) +
        jobs.farmer * 0.15 * ((t.buildings.farm ?? 0) + (t.buildings.aquafarm ?? 0)),
    );
    add('water', jobs.gatherer * 0.08 * (b.aquatic ? 2 : Math.max(0.3, r.moisture)));
    add('wood', jobs.gatherer * 0.1);
    add('fiber', jobs.gatherer * 0.08);
    add('stone', jobs.builder * 0.12 + jobs.gatherer * 0.04);
    add('bone', jobs.hunter * 0.06);
    add('fuel', jobs.engineer * 0.13 + jobs.gatherer * 0.02);
    q.knowledge +=
      dt *
      (jobs.scholar * 0.13 + jobs.scout * 0.06) *
      (q.culture.government === 'assembly' ? 1.25 : 1);
    if (jobs.craftsman > 0) {
      add('fiber', jobs.craftsman * 0.12);
      if (q.technologies.includes('metallurgy') && q.stock.stone >= 0.1 * dt) {
        q.stock.stone -= 0.1 * dt;
        add('metal', jobs.craftsman * 0.08);
      }
    }
    let security = jobs.warrior * 8;
    for (const d of BUILDINGS) {
      const count = t.buildings[d.id] ?? 0;
      if (!count) continue;
      security += d.security * count;
      const cost = Object.fromEntries(
        Object.entries(d.consumption).map(([m, n]) => [m, n * count * dt]),
      ) as Cost;
      if (!affordability(s, cost)) {
        spend(s, cost);
        for (const [m, n] of Object.entries(cost)) q.consumption[m as Material] += n / dt;
        for (const [m, n] of Object.entries(d.production))
          add(
            m as Material,
            n *
              count *
              (d.id === 'farm'
                ? Math.max(0.15, r.fertility) * (s.pressure?.id === 'drought' ? 0.3 : 1)
                : 1),
          );
        q.knowledge += d.knowledge * count * dt;
        if (['factory', 'generator', 'smelter'].includes(d.id)) q.pollution += dt * 0.015 * count;
      }
    }
    if (t.queue) {
      t.queue.remaining -= dt * (1 + jobs.builder * 0.2 + toolBonus(s, 'build'));
      if (t.queue.remaining <= 0) {
        const id = t.queue.building;
        t.buildings[id] = (t.buildings[id] ?? 0) + 1;
        t.queue = null;
        toolBonus(s, 'build', 1);
        record(
          s,
          'construction',
          `${buildingById[id].name} completed`,
          `${t.name}: ${buildingById[id].description}`,
        );
      }
    }
    const requiredFood = t.population * 0.028 * dt * (p.metabolism / 1.5),
      requiredWater = (t.population * 0.02 * dt) / (1 + p.waterStorage);
    const fed = q.stock.food >= requiredFood && q.stock.water >= requiredWater;
    q.stock.food = Math.max(0, q.stock.food - requiredFood);
    q.stock.water = Math.max(0, q.stock.water - requiredWater);
    q.consumption.food += requiredFood / dt;
    q.consumption.water += requiredWater / dt;
    const overcrowded = t.population > housing(t),
      threat = q.neighbors.filter((n) => n.conflict).length * 12;
    t.stability = clamp(
      t.stability +
        dt *
          ((fed ? 0.08 : -0.3) -
            (overcrowded ? 0.12 : 0) +
            (q.culture.government === 'council' ? 0.03 : 0) -
            Math.max(0, threat - security) * 0.004),
      0,
      100,
    );
    t.health = clamp(
      t.health +
        dt *
          ((fed ? 0.02 : -0.15) +
            jobs.medic * 0.04 +
            (t.buildings.clinic ?? 0) * 0.03 -
            Math.max(0, threat - security) * 0.008 -
            (q.pollution > 30 ? 0.035 : 0)),
      0,
      100,
    );
    if (t.health <= 0) {
      t.lost = true;
      t.population = 0;
      for (const j of PROFESSIONS) t.jobs[j] = 0;
      record(
        s,
        'collapse',
        `${t.name} is abandoned`,
        'Hunger, insecurity, or pollution exhausted the settlement. Its ruins remain on the map.',
      );
      continue;
    }
    if (fed && !overcrowded && t.stability > 40 && t.population < housing(t)) {
      t.growth += dt * 0.012 * (q.culture.government === 'stewardship' ? 1.25 : 1);
      if (t.growth >= 1) {
        t.growth--;
        t.population++;
        jobs.gatherer++;
        record(
          s,
          'population',
          `New life in ${t.name}`,
          `Population ${t.population}. The new citizen begins as a gatherer.`,
        );
      }
    }
    if (distance(t, s.player) < 130) {
      s.player.energy = Math.min(p.energy, s.player.energy + (fed ? 0.8 : 0) * dt);
      s.player.health = Math.min(
        phenotype(s.player.genome).health,
        s.player.health + (jobs.medic * 0.15 + 0.1) * dt,
      );
    }
    if (jobs.scout && q.tick % 60 === 0) {
      const site = r.sites.find((site) => !site.discovered);
      if (site) {
        site.discovered = true;
        s.evolution.sites.push(site.id);
      }
    }
  }
  for (const n of q.neighbors)
    if (n.trade && !n.conflict && q.stock.food >= dt * 0.05) {
      q.stock.food -= dt * 0.05;
      q.stock[n.specialty] +=
        dt *
        0.08 *
        (1 +
          q.settlements.reduce(
            (sum, t) => sum + t.jobs.trader * 0.2 + (t.buildings.harbor ?? 0) * 0.3,
            0,
          ));
      q.consumption.food += 0.05;
      q.production[n.specialty] += 0.08;
    }
  q.pollution = Math.max(0, q.pollution - dt * (q.culture.law === 'conservation' ? 0.035 : 0.005));
  for (const r of s.evolution.regions)
    r.fertility = clamp(r.fertility + dt * (q.pollution > 40 ? -0.00004 : 0.00001), 0.1, 1);
  const capacity =
    300 + q.settlements.reduce((sum, t) => sum + (t.buildings.storehouse ?? 0) * 150, 0);
  for (const m of MATERIALS) q.stock[m] = clamp(q.stock[m], 0, capacity);
  if (q.tick % 30 === 0) updateCulture(s);
}
// A developed society preserves the lineage through unrepresented citizens.
export function citizenSuccessor(s: GameState): Creature | null {
  const t = s.society.settlements.find((t) => !t.lost && t.population >= 2 && t.health > 10);
  if (!t) return null;
  const c = creature(`citizen-${s.nextId++}`, 'player', t.genome, t.x, t.y);
  c.generation = s.player.generation + 1;
  c.age = 20;
  s.lineage.archive.push({
    id: c.id,
    generation: c.generation,
    genome: structuredClone(c.genome),
    born: s.time,
    died: null,
    cause: null,
    parent: s.player.id,
  });
  const branch = s.evolution.branches.find((b) => b.id === t.branchId)!;
  branch.members.push(c.id);
  branch.extinct = false;
  branch.extinctionCause = null;
  t.population--;
  for (const job of PROFESSIONS)
    if (t.jobs[job] > 0) {
      t.jobs[job]--;
      break;
    }
  return c;
}
