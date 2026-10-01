import type { GameState } from '../core/types';
import { PRESSURES } from '../data/content';
export function activePressure(state: GameState) {
  const base = PRESSURES.find((p) => p.id === state.pressure?.id);
  if (!base) return undefined;
  const severity = state.pressure?.severity ?? 1;
  return {
    ...base,
    name: state.pressure?.name ?? base.name,
    growth: Math.max(0.05, 1 + (base.growth - 1) * severity),
    light: Math.max(0, 1 + (base.light - 1) * severity),
    foodFitnessPenalty: base.foodFitnessPenalty * severity,
    temperature: (base.temperature ?? 0) * severity,
    toxicity: (base.toxicity ?? 0) * severity,
    water: (base.water ?? 0) * severity,
    damage: (base.damage ?? 0) * severity,
  };
}
