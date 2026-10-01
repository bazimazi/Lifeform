import type { ActionResult, GameState, Stats } from '../core/types';
import { mutatedGenome, phenotype, validateBody } from './body';
import { mutationById } from '../data/content';
import { record } from '../core/history';

export function mutationReason(state: GameState, id: string): string | null {
  const m = mutationById[id];
  if (!m) return 'Unknown mutation.';
  if (state.lineage.extinct) return 'This lineage is extinct.';
  if (state.player.genome.mutations.includes(id)) return 'Already part of your genome.';
  if (m.requires.some((x) => !state.player.genome.mutations.includes(x)))
    return `Requires ${m.requires.map((x) => mutationById[x].name).join(', ')}.`;
  if (m.excludes.some((x) => state.player.genome.mutations.includes(x)))
    return 'This adaptation belongs to an incompatible evolutionary path.';
  const invalid = validateBody(mutatedGenome(state.player.genome, id));
  if (invalid) return invalid;
  if (state.lineage.points < m.cost)
    return 'Explore or eat four foods to earn another mutation point.';
  if (state.lineage.biomass < m.biomass)
    return `Requires ${m.biomass} biomass. Feed to build up reserves.`;
  return null;
}
export function previewMutation(state: GameState, id: string): { before: Stats; after: Stats } {
  return {
    before: phenotype(state.player.genome),
    after: phenotype(mutatedGenome(state.player.genome, id)),
  };
}
export function applyMutation(state: GameState, id: string): ActionResult {
  const reason = mutationReason(state, id);
  if (reason) {
    state.telemetry.mutationRejected++;
    return { ok: false, message: reason };
  }
  const before = phenotype(state.player.genome);
  state.player.genome = mutatedGenome(state.player.genome, id);
  const after = phenotype(state.player.genome);
  state.player.health = Math.min(
    after.health,
    state.player.health + Math.max(0, after.health - before.health),
  );
  state.player.energy = Math.min(after.energy, state.player.energy);
  state.lineage.points -= mutationById[id].cost;
  state.lineage.biomass -= mutationById[id].biomass;
  if (!state.discoveries.mutations.includes(id)) state.discoveries.mutations.push(id);
  const ancestor = state.lineage.archive.find((x) => x.id === state.player.id);
  if (ancestor) ancestor.genome = structuredClone(state.player.genome);
  state.telemetry.mutations[id] = (state.telemetry.mutations[id] ?? 0) + 1;
  state.lineage.legacy++;
  record(state, 'mutation', mutationById[id].name, mutationById[id].description);
  return { ok: true, message: `${mutationById[id].name}. A new possibility for your lineage.` };
}
export function removeMutation(state: GameState, id: string): ActionResult {
  if (state.lineage.extinct)
    return { ok: false, message: 'The genome of an extinct lineage stays in the archive.' };
  if (!state.player.genome.mutations.includes(id))
    return { ok: false, message: 'That mutation is not in your current body.' };
  if (state.player.genome.mutations.some((x) => mutationById[x].requires.includes(id)))
    return { ok: false, message: 'Remove its dependent adaptations first.' };
  const next = structuredClone(state.player.genome);
  next.mutations = next.mutations.filter((x) => x !== id);
  const organ = mutationById[id].organ;
  if (organ) next.organs = next.organs.filter((x) => x !== organ);
  if (organ === 'flagellum') next.organs.push('cilia');
  const invalid = validateBody(next);
  if (invalid) return { ok: false, message: invalid };
  state.player.genome = next;
  const stats = phenotype(next);
  state.player.health = Math.min(state.player.health, stats.health);
  state.player.energy = Math.min(state.player.energy, stats.energy);
  const ancestor = state.lineage.archive.find((x) => x.id === state.player.id);
  if (ancestor) ancestor.genome = structuredClone(next);
  record(
    state,
    'mutation',
    'A simpler body',
    `Removed ${mutationById[id].name.toLowerCase()}. Its discovery remains in the genetic archive. Rebuilding costs a fresh mutation opportunity.`,
  );
  return { ok: true, message: 'Adaptation removed. Your genetic knowledge remains.' };
}
