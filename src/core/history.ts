import type { GameState, LegacyRecord } from './types';
import { TUNING } from '../data/content';

export function record(state: GameState, type: string, title: string, detail: string) {
  state.history.push({
    id: state.nextId++,
    time: state.time,
    generation: state.player.generation,
    type,
    title,
    detail,
  });
  if (state.history.length > TUNING.historyLimit) state.history.shift();
}
export function legacyRecord(state: GameState, cause: string): LegacyRecord {
  return {
    name: state.lineage.name,
    seed: state.seed,
    duration: state.time,
    peak: state.lineage.peak,
    adaptations: [...state.discoveries.mutations],
    cause,
    archive: structuredClone(state.lineage.archive),
    history: structuredClone(state.history),
    evolution: structuredClone(state.evolution),
  };
}
