import type { Creature, GameState, Resource, Vec } from '../core/types';
import { phenotype, dietFor } from '../biology/body';
import { distance, random } from '../core/random';
import { speciesById, resourceById } from '../data/content';
import type { SpatialGrid } from '../world/spatial';

export interface UtilityGoal {
  score: number;
  name: string;
  target: Vec;
}
export function chooseGoal(
  state: GameState,
  c: Creature,
  agents: SpatialGrid<Creature>,
  resources: SpatialGrid<Resource>,
): UtilityGoal {
  const stats = phenotype(c.genome),
    definition = speciesById[c.speciesId];
  const near = agents.query(c, stats.vision).filter((x) => x.id !== c.id && x.health > 0);
  const preyIds = definition?.prey ?? [];
  const predatorIds = definition?.predators ?? ['stalker', 'hunter'];
  const goals: UtilityGoal[] = [];
  const isPlayerHunter = state.player.genome.organs.includes('jaw');
  for (const other of near) {
    if (predatorIds.includes(other.speciesId) && (other.speciesId !== 'player' || isPlayerHunter)) {
      const d = distance(c, other);
      goals.push({
        score: 1.5 - d / stats.vision + (c.health < stats.health / 2 ? 0.5 : 0),
        name: 'flee',
        target: { x: c.x + (c.x - other.x) * 2, y: c.y + (c.y - other.y) * 2 },
      });
    }
    if (preyIds.includes(other.speciesId) && other.juvenile >= 0) {
      // Small predators avoid a well-armored or stronger target.
      const opponent = phenotype(other.genome);
      const risk = opponent.defense >= stats.attack * 0.7 ? 0.6 : 0;
      goals.push({
        score:
          1 -
          c.energy / stats.energy +
          (definition?.aggression ?? 0) * 0.45 -
          (distance(c, other) / stats.vision) * 0.3 -
          risk,
        name: 'hunt',
        target: other,
      });
    }
  }
  const diet = definition?.diet ?? dietFor(c.genome);
  for (const food of resources.query(c, stats.vision)) {
    if (!food.active || !diet.includes(resourceById[food.type].diet)) continue;
    goals.push({
      score: 0.4 + (1 - c.energy / stats.energy) * 0.6 - (distance(c, food) / stats.vision) * 0.3,
      name: 'feed',
      target: food,
    });
  }
  if (c.speciesId === 'player' && distance(c, state.player) > 130) {
    goals.push({
      score: c.juvenile > 0 ? 0.85 : 0.5,
      name: 'follow',
      target: { x: state.player.x - 60, y: state.player.y + 35 },
    });
  }
  if (distance(c, c.intent) < 30 || c.behavior !== 'wander') {
    c.intent = {
      x: c.x + (random(state.rng, 'simulation') - 0.5) * 350,
      y: c.y + (random(state.rng, 'simulation') - 0.5) * 350,
    };
  }
  goals.push({ score: 0.08, name: 'wander', target: c.intent });
  return goals.reduce((best, goal) => (goal.score > best.score ? goal : best));
}
