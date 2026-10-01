import type { GameState } from '../core/types';
import { biomeById } from './regions';
import { DISEASES } from '../data/biology';
import { validateBody } from '../biology/body';

// Validate this module's versioned payload before it reaches simulation or rendering.
export function validateEvolution(value: unknown, state: GameState): void {
  const fail = (message: string): never => {
    throw new Error(`Invalid save: ${message}`);
  };
  if (!value || typeof value !== 'object') fail('evolution state');
  const e = value as GameState['evolution'];
  const num = (n: unknown, min = 0) => typeof n === 'number' && Number.isFinite(n) && n >= min;
  const text = (s: unknown) => typeof s === 'string' && s.length < 4000;
  const list = (a: unknown, max = 10000): a is unknown[] => Array.isArray(a) && a.length <= max;
  if (!list(e.regions, 100) || e.regions.length === 0 || !text(e.currentRegion)) fail('regions');
  for (const r of e.regions) {
    if (
      !r ||
      !text(r.id) ||
      !text(r.name) ||
      !text(r.continent) ||
      !biomeById[r.biomeId] ||
      ![r.x, r.y, r.width, r.height, r.moisture, r.fertility, r.explored].every((n) => num(n)) ||
      !num(r.temperature, -100) ||
      typeof r.discovered !== 'boolean' ||
      !r.population ||
      Object.values(r.population).some((n) => !num(n))
    )
      fail('region geometry or climate');
    if (
      r.x + r.width > state.world.width + 0.01 ||
      r.y + r.height > state.world.height + 0.01 ||
      r.width <= 0 ||
      r.height <= 0 ||
      !list(r.sites, 100)
    )
      fail('region bounds');
    for (const s of r.sites)
      if (
        !s ||
        !text(s.id) ||
        !text(s.name) ||
        !['spring', 'cave', 'fossil', 'nest', 'rare-habitat', 'ruin'].includes(s.kind) ||
        !num(s.x) ||
        !num(s.y) ||
        !num(s.reward) ||
        typeof s.discovered !== 'boolean' ||
        typeof s.investigated !== 'boolean'
      )
        fail('point of interest');
  }
  if (
    new Set(e.regions.map((r) => r.id)).size !== e.regions.length ||
    !e.regions.some((r) => r.id === e.currentRegion)
  )
    fail('region references');
  for (const key of [
    'discoveries',
    'sites',
    'milestones',
    'unlocks',
    'symbioses',
    'explorationRewarded',
  ] as const)
    if (!list(e[key]) || !e[key].every(text)) fail(`evolution ${key}`);
  if (
    !text(e.challenge) ||
    !num(e.climateTime) ||
    !list(e.branches) ||
    !e.branches.length ||
    !list(e.fossils) ||
    !list(e.nests, 100)
  )
    fail('evolution records');
  const ancestors = new Set(state.lineage.archive.map((a) => a.id));
  if (new Set(e.branches.map((b) => b.id)).size !== e.branches.length)
    fail('duplicate species branches');
  const parents = new Map(e.branches.map((b) => [b.id, b.parentId]));
  const checked = new Set<string>();
  for (const branch of e.branches) {
    let cursor: string | null = branch.id;
    const path = new Set<string>();
    while (cursor !== null && !checked.has(cursor)) {
      if (path.has(cursor)) fail('cyclic species tree');
      path.add(cursor);
      cursor = parents.get(cursor) ?? null;
    }
    for (const id of path) checked.add(id);
  }
  const memberships: string[] = [];
  for (const b of e.branches) {
    if (
      !b ||
      !text(b.id) ||
      !text(b.name) ||
      !num(b.created) ||
      !num(b.generation, 1) ||
      !list(b.members) ||
      !b.members.every((id) => typeof id === 'string' && ancestors.has(id)) ||
      !e.regions.some((r) => r.id === b.regionId) ||
      typeof b.extinct !== 'boolean' ||
      !b.genome ||
      !Array.isArray(b.genome.organs) ||
      !Array.isArray(b.genome.mutations) ||
      validateBody(b.genome)
    )
      fail('species branch');
    if (b.parentId !== null && !e.branches.some((other) => other.id === b.parentId))
      fail('branch parent');
    memberships.push(...b.members);
  }
  if (
    new Set(memberships).size !== memberships.length ||
    !e.branches.some((b) => b.id === e.activeBranch)
  )
    fail('branch membership');
  if (state.lineage.archive.some((a) => a.died === null && !memberships.includes(a.id)))
    fail('living species membership');
  for (const f of e.fossils)
    if (
      !f ||
      !text(f.id) ||
      !text(f.name) ||
      !num(f.x) ||
      !num(f.y) ||
      !num(f.age) ||
      !list(f.adaptations) ||
      !f.adaptations.every(text) ||
      typeof f.discovered !== 'boolean' ||
      !e.branches.some((b) => b.id === f.branchId)
    )
      fail('fossil');
  for (const n of e.nests)
    if (
      !n ||
      !text(n.id) ||
      !e.regions.some((r) => r.id === n.regionId) ||
      !e.branches.some((b) => b.id === n.ownerBranch) ||
      ![n.x, n.y, n.food, n.health, n.capacity].every((v) => num(v))
    )
      fail('nest');
  if (!e.statuses || typeof e.statuses !== 'object' || Array.isArray(e.statuses))
    fail('conditions');
  for (const conditions of Object.values(e.statuses)) {
    if (!list(conditions, 30)) fail('condition list');
    for (const s of conditions)
      if (
        !s ||
        !num(s.remaining) ||
        !num(s.strength) ||
        !text(s.source) ||
        !(s.id === 'stunned' || DISEASES.some((d) => d.id === s.id))
      )
        fail('condition');
  }
}
