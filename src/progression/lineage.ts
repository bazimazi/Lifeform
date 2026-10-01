import type { GameState, ActionResult, Creature } from '../core/types';
import { phenotype } from '../biology/body';
import { lineagePopulation } from '../biology/reproduction';
import { regionAt } from '../world/regions';
import { distance } from '../core/random';
import { record } from '../core/history';

export function branchFor(state: GameState, id: string) {
  return state.evolution.branches.find((b) => b.members.includes(id));
}
export function speciationReason(state: GameState): string | null {
  if (state.lineage.extinct) return 'This lineage is extinct.';
  if (lineagePopulation(state) < 2)
    return 'Reproduce first so another population can preserve the ancestral branch.';
  const branch = branchFor(state, state.player.id)!;
  const differences = new Set([...branch.genome.mutations, ...state.player.genome.mutations]);
  for (const id of branch.genome.mutations)
    if (state.player.genome.mutations.includes(id)) differences.delete(id);
  if (differences.size < 2)
    return 'A new branch requires at least two adaptations that differ from its ancestor.';
  if (regionAt(state, state.player).id === branch.regionId && differences.size < 4)
    return 'Migrate to another habitat, or diverge through at least four adaptations.';
  return null;
}
export function speciate(state: GameState, name: string): ActionResult {
  const reason = speciationReason(state);
  if (reason) return { ok: false, message: reason };
  name = name.trim().slice(0, 40);
  if (!name) return { ok: false, message: 'Give this species branch a name.' };
  const parent = branchFor(state, state.player.id)!;
  const members = [
    state.player.id,
    ...state.creatures
      .filter(
        (c) =>
          c.speciesId === 'player' &&
          c.generation > state.player.generation &&
          distance(c, state.player) < 200,
      )
      .map((c) => c.id),
  ];
  if (members.length >= lineagePopulation(state)) members.splice(1);
  for (const branch of state.evolution.branches)
    branch.members = branch.members.filter((id) => !members.includes(id));
  const id = `branch-${state.nextId++}`;
  state.evolution.branches.push({
    id,
    name,
    parentId: parent.id,
    created: state.time,
    generation: state.player.generation,
    regionId: regionAt(state, state.player).id,
    genome: structuredClone(state.player.genome),
    members,
    extinct: false,
    extinctionCause: null,
  });
  state.evolution.activeBranch = id;
  state.lineage.name = name;
  state.lineage.legacy += 5;
  state.evolution.unlocks.push('predatory', 'social-start');
  record(
    state,
    'speciation',
    `The ${name} branch emerges`,
    `${parent.name} and ${name} now follow distinct evolutionary paths. Their ancestry remains connected.`,
  );
  return { ok: true, message: `A new species branch: ${name}.` };
}
export function reconcileBranches(state: GameState, dead?: Creature, cause = 'Population lost') {
  const living = new Set(
    [state.player, ...state.creatures]
      .filter((c) => c.health > 0 && c.speciesId === 'player')
      .map((c) => c.id),
  );
  for (const branch of state.evolution.branches) {
    if (branch.extinct || branch.members.some((id) => living.has(id))) continue;
    branch.extinct = true;
    branch.extinctionCause = cause;
    state.evolution.fossils.push({
      id: `fossil-${state.nextId++}`,
      branchId: branch.id,
      name: branch.name,
      x: dead?.x ?? state.player.x,
      y: dead?.y ?? state.player.y,
      age: state.time,
      adaptations: [...branch.genome.mutations],
      discovered: false,
    });
    record(
      state,
      'extinction',
      `${branch.name} becomes a fossil`,
      `${cause}. Its adaptations and branch in the species tree are preserved.`,
    );
  }
  const active = branchFor(state, state.player.id);
  if (active && !active.extinct) {
    state.evolution.activeBranch = active.id;
    state.lineage.name = active.name;
  }
}
export function buildNest(state: GameState): ActionResult {
  if (state.lineage.extinct)
    return { ok: false, message: 'No living creature can build this shelter.' };
  const cost = phenotype(state.player.genome).burrowing ? 4 : 8;
  if (state.lineage.biomass < cost) return { ok: false, message: `A nest needs ${cost} biomass.` };
  if (state.evolution.nests.some((n) => distance(n, state.player) < 150))
    return { ok: false, message: 'There is already a nest nearby.' };
  state.lineage.biomass -= cost;
  state.evolution.nests.push({
    id: `nest-${state.nextId++}`,
    regionId: regionAt(state, state.player).id,
    ownerBranch: state.evolution.activeBranch,
    x: state.player.x,
    y: state.player.y,
    food: 0,
    health: 100,
    capacity: 6,
  });
  record(
    state,
    'construction',
    'A place to return to',
    'A nest offers environmental shelter and a shared food store for nearby offspring.',
  );
  return { ok: true, message: 'A nest is ready. Store biomass here to feed your relatives.' };
}
export function stockNest(state: GameState, id: string, amount: number): ActionResult {
  const nest = state.evolution.nests.find((n) => n.id === id);
  if (!nest || distance(nest, state.player) > 110)
    return { ok: false, message: 'Return to this nest to stock it.' };
  if (
    !Number.isInteger(amount) ||
    amount <= 0 ||
    state.lineage.biomass < amount ||
    nest.food + amount > 200
  )
    return { ok: false, message: 'Choose available biomass within the 200-unit storage limit.' };
  state.lineage.biomass -= amount;
  nest.food += amount;
  return { ok: true, message: `${amount} biomass stored for the lineage.` };
}
export function evaluateMilestones(state: GameState) {
  const stats = phenotype(state.player.genome);
  const candidates: [string, boolean, string][] = [
    [
      'First Flight',
      stats.flight > 0 && stats.lift >= stats.mass,
      'Your species has learned to fly. The ground no longer defines its world.',
    ],
    [
      'First Tool',
      stats.manipulation >= 30 && stats.intelligence >= 25,
      'A thinking body can now manipulate materials and make tools.',
    ],
    [
      'A Shared Memory',
      stats.communication >= 25 && stats.memory >= 20,
      'Your species can teach what one individual learns.',
    ],
    [
      'Intelligence Emerges',
      stats.intelligence >= 50 &&
        stats.communication >= 25 &&
        stats.manipulation >= 30 &&
        stats.sociality >= 15,
      'Learning, communication and manipulation combine. Society becomes possible.',
    ],
    [
      'A Widespread Lineage',
      state.evolution.discoveries.length >= 3,
      'Three habitats are now part of your species history.',
    ],
  ];
  for (const [title, ready, detail] of candidates)
    if (ready && !state.evolution.milestones.includes(title)) {
      state.evolution.milestones.push(title);
      state.lineage.points += 2;
      state.lineage.legacy += 3;
      record(state, 'milestone', title, detail);
    }
  if (
    state.discoveries.resources.length >= 4 &&
    !state.evolution.unlocks.includes('photosynthetic')
  )
    state.evolution.unlocks.push('photosynthetic');
  if (state.telemetry.hunts >= 1 && !state.evolution.unlocks.includes('predatory'))
    state.evolution.unlocks.push('predatory');
}
