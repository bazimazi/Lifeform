import type { GameState } from '../core/types';
import { MATERIALS, PROFESSIONS } from './types';
import { buildingById, techById, toolById } from '../data/society';
import { validateBody } from '../biology/body';
export function validateSociety(s: GameState) {
  const q = s.society,
    fail = (): never => {
      throw new Error('Invalid save: society state');
    };
  const n = (v: unknown, min = 0) => typeof v === 'number' && Number.isFinite(v) && v >= min;
  const str = (v: unknown) => typeof v === 'string' && v.length <= 4000;
  const arr = (v: unknown, max = 500): v is unknown[] => Array.isArray(v) && v.length <= max;
  if (
    !q ||
    !['biology', 'intelligence', 'tribal', 'civilization', 'industrial', 'space'].includes(q.era)
  )
    fail();
  for (const stock of [q.stock, q.production, q.consumption])
    if (!stock || MATERIALS.some((m) => !n(stock[m]))) fail();
  for (const value of [
    q.knowledge,
    q.learning,
    q.gatherReadyAt,
    q.pollution,
    q.tick,
    q.tradeCount,
    q.crafted,
  ])
    if (!n(value)) fail();
  if (
    !arr(q.tools, 20) ||
    q.tools.some(
      (t) => !t || !toolById[t.id] || !n(t.durability) || t.durability > toolById[t.id].durability,
    ) ||
    new Set(q.tools.map((t) => t.id)).size !== q.tools.length
  )
    fail();
  if (
    !arr(q.technologies) ||
    q.technologies.some((id) => !techById[id]) ||
    new Set(q.technologies).size !== q.technologies.length
  )
    fail();
  if (q.research && (!techById[q.research.id] || !n(q.research.remaining))) fail();
  if (
    !arr(q.memory, 40) ||
    q.memory.some(
      (m) => !m || !str(m.resource) || ![m.x, m.y, m.visits, m.lastSeen].every((v) => n(v)),
    )
  )
    fail();
  if (!arr(q.settlements, 12)) fail();
  for (const t of q.settlements) {
    if (
      !t ||
      !str(t.id) ||
      !str(t.name) ||
      !s.evolution.regions.some((r) => r.id === t.regionId) ||
      !s.evolution.branches.some((b) => b.id === t.branchId) ||
      !t.genome ||
      validateBody(t.genome) ||
      ![t.x, t.y, t.population, t.growth, t.health, t.stability, t.founded].every((v) => n(v)) ||
      t.x > s.world.width ||
      t.y > s.world.height ||
      typeof t.lost !== 'boolean' ||
      !t.jobs ||
      !t.buildings
    )
      fail();
    if (
      PROFESSIONS.some((j) => !Number.isInteger(t.jobs[j]) || t.jobs[j] < 0) ||
      Object.values(t.jobs).reduce((a, b) => a + b, 0) > Math.floor(t.population)
    )
      fail();
    if (
      Object.entries(t.buildings).some(
        ([id, count]) => !buildingById[id] || !Number.isInteger(count) || count < 0 || count > 8,
      )
    )
      fail();
    if (t.queue && (!buildingById[t.queue.building] || !n(t.queue.remaining))) fail();
  }
  if (new Set(q.settlements.map((t) => t.id)).size !== q.settlements.length) fail();
  if (
    !arr(q.neighbors, 50) ||
    q.neighbors.some(
      (v) =>
        !v ||
        !str(v.id) ||
        !str(v.name) ||
        !str(v.culture) ||
        !MATERIALS.includes(v.specialty) ||
        !s.evolution.regions.some((r) => r.id === v.regionId) ||
        !n(v.population) ||
        !n(v.relations, -100) ||
        v.relations > 100 ||
        typeof v.trade !== 'boolean' ||
        typeof v.conflict !== 'boolean',
    )
  )
    fail();
  const c = q.culture;
  if (
    !c ||
    !['council', 'stewardship', 'assembly'].includes(c.government) ||
    !['balanced', 'conservation', 'expansion'].includes(c.law) ||
    ![c.language, c.architecture, c.mythology, c.art, c.music].every(str) ||
    !arr(c.traditions) ||
    !c.traditions.every(str) ||
    !arr(c.history) ||
    !c.history.every(str)
  )
    fail();
}
