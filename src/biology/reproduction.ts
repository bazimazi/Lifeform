import { phenotype } from './body';
import { record } from '../core/history';
import { creature } from '../world/generation';
import { clamp } from '../core/random';
import { TUNING } from '../data/content';
import type { ActionResult, GameState } from '../core/types';

export function lineagePopulation(state: GameState): number {
  return state.lineage.archive.filter((x) => x.died === null).length;
}
export function reproductionReason(state: GameState): string | null {
  const p = state.player,
    stats = phenotype(p.genome);
  if (state.lineage.extinct) return 'This lineage is extinct.';
  if (p.juvenile > 0 || p.age < TUNING.reproductionAge)
    return 'Grow a little longer. Reproduction begins at age 12 seconds.';
  if (p.reproductionCooldown > 0)
    return `Your body needs ${Math.ceil(p.reproductionCooldown)} seconds to recover.`;
  if (p.health < stats.health * TUNING.minimumBirthHealthRatio)
    return 'Recover to at least 40% health before reproducing.';
  if (p.energy < TUNING.reproductionEnergy * stats.reproductionCost + TUNING.reproductionReserve)
    return 'Find food first. Reproduction needs energy plus a small reserve.';
  if (state.lineage.biomass < TUNING.reproductionBiomass * stats.reproductionCost)
    return 'Gather more biomass by eating.';
  if (lineagePopulation(state) + stats.offspringCount > TUNING.maxLineage)
    return 'Your territory is at its population limit.';
  return null;
}
export function reproduce(state: GameState): ActionResult {
  const reason = reproductionReason(state);
  if (reason) return { ok: false, message: reason };
  const p = state.player,
    stats = phenotype(p.genome);
  p.energy -= TUNING.reproductionEnergy * stats.reproductionCost;
  state.lineage.biomass -= TUNING.reproductionBiomass * stats.reproductionCost;
  p.reproductionCooldown = TUNING.reproductionCooldown;
  for (let i = 0; i < stats.offspringCount; i++) {
    const id = `velari-${state.nextId++}`;
    const child = creature(
      id,
      'player',
      p.genome,
      clamp(p.x - 45 - i * 25, 25, state.world.width - 25),
      clamp(p.y + 35, 25, state.world.height - 25),
      p.generation + 1,
    );
    child.juvenile = stats.growthTime;
    child.energy = TUNING.offspringEnergy;
    state.creatures.push(child);
    state.lineage.archive.push({
      id,
      generation: child.generation,
      genome: structuredClone(child.genome),
      born: state.time,
      died: null,
      cause: null,
      parent: p.id,
    });
    state.telemetry.births++;
  }
  state.lineage.peak = Math.max(state.lineage.peak, lineagePopulation(state));
  state.lineage.legacy += 2;
  record(
    state,
    'birth',
    'The lineage continues',
    `${stats.offspringCount === 1 ? 'An offspring inherits' : 'Two offspring inherit'} your ${p.genome.mutations.length} adaptations. Generation ${p.generation + 1} begins.`,
  );
  return { ok: true, message: 'A new generation. Your offspring will grow beside you.' };
}
export function inheritControl(state: GameState, id: string): ActionResult {
  const child = state.creatures.find((c) => c.id === id && c.speciesId === 'player');
  if (!child) return { ok: false, message: 'That member of your lineage is no longer alive.' };
  if (child.juvenile > 0)
    return {
      ok: false,
      message: `This offspring matures in ${Math.ceil(child.juvenile)} seconds.`,
    };
  const old = state.player;
  state.creatures = state.creatures.filter((c) => c.id !== id);
  state.creatures.push(old);
  state.player = child;
  record(
    state,
    'inheritance',
    'A different pair of eyes',
    `You now guide generation ${child.generation}. The previous individual remains part of the ecosystem.`,
  );
  return { ok: true, message: `Now guiding generation ${child.generation}.` };
}
