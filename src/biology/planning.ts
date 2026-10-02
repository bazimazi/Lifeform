import type { GameState, Genome } from '../core/types';
import { mutationById } from '../data/content';
import { mutatedGenome, validateBody } from './body';
import { mutationReason } from './mutation';

/** A deterministic prerequisite order. Shared prerequisites are paid for only once. */
export function mutationRoute(goal: string): string[] {
  const ordered: string[] = [],
    visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    if (!mutationById[id]) throw new Error(`Unknown adaptation: ${id}`);
    if (visiting.has(id)) throw new Error(`Cyclic adaptation prerequisites: ${id}`);
    visiting.add(id);
    for (const parent of mutationById[id].requires) visit(parent);
    visiting.delete(id);
    visited.add(id);
    ordered.push(id);
  }
  visit(goal);
  return ordered;
}

export function planMutation(state: GameState, goal: string) {
  let genome: Genome = structuredClone(state.player.genome);
  let points = 0,
    biomass = 0;
  const steps = mutationRoute(goal).map((id) => {
    const mutation = mutationById[id],
      installed = genome.mutations.includes(id);
    if (!installed) {
      points += mutation.cost;
      biomass += mutation.biomass;
      genome = mutatedGenome(genome, id);
    }
    return {
      id,
      installed,
      reason: installed ? null : mutationReason(state, id),
      bodyIssue: validateBody(genome),
    };
  });
  return {
    goal,
    steps,
    points,
    biomass,
    genome,
    issue: steps.find((s) => s.bodyIssue)?.bodyIssue ?? null,
  };
}
