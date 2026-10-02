import type { GameState } from '../core/types';
import { phenotype, dietFor } from '../biology/body';
import { reproductionReason } from '../biology/reproduction';
import { resourceById, TUNING } from '../data/content';

export function nearestFood(s: GameState) {
  const diet = dietFor(s.player.genome);
  return s.resources
    .filter((r) => r.active && diet.includes(resourceById[r.type].diet))
    .reduce<(typeof s.resources)[number] | null>(
      (nearest, r) =>
        !nearest ||
        Math.hypot(r.x - s.player.x, r.y - s.player.y) <
          Math.hypot(nearest.x - s.player.x, nearest.y - s.player.y)
          ? r
          : nearest,
      null,
    );
}

/** Guidance reflects saved milestones and the actual requirements of the current body. */
export function journey(s: GameState) {
  const fed = s.telemetry.foodEaten > 0;
  const adapted =
    s.player.genome.mutations.length > 0 ||
    Object.values(s.telemetry.mutations).some((count) => count > 0);
  const born = s.telemetry.births > 0;
  const completed = [fed, adapted, born];
  const step = completed.findIndex((done) => !done);
  const stats = phenotype(s.player.genome);
  const foodHint =
    s.settings.control === 'direct'
      ? 'Move to the marked food, then press your eat key or hold Bite.'
      : 'Move to the marked food. You eat automatically when close enough.';
  const birthCost = Math.ceil(TUNING.reproductionBiomass * stats.reproductionCost);
  const birthReason = reproductionReason(s);
  const foodNeeded =
    s.lineage.biomass < birthCost ||
    s.player.energy <
      TUNING.reproductionEnergy * stats.reproductionCost + TUNING.reproductionReserve;
  if (step === 0)
    return {
      completed,
      step,
      title: 'Find your first meal',
      detail: foodHint,
      label: 'Move to food',
      action: 'food',
      progress: '0 / 1 food eaten',
      reward: 'Food restores energy and gives biomass for upgrades.',
    };
  if (step === 1)
    return {
      completed,
      step,
      title: 'Evolve your creature',
      detail: 'Choose one adaptation. Preview what it changes, then make it part of your body.',
      label: 'Choose an adaptation',
      action: 'adapt',
      progress: `${s.lineage.points} evolution points · ${Math.floor(s.lineage.biomass)} biomass`,
      reward: 'Your new body passes on to future offspring.',
    };
  if (step === 2)
    return {
      completed,
      step,
      title: 'Start a new generation',
      detail: birthReason ?? 'You are ready. Create offspring to keep your lineage alive.',
      label: !birthReason ? 'Reproduce now' : foodNeeded ? 'Find more food' : 'Keep exploring',
      action: !birthReason ? 'reproduce' : foodNeeded ? 'food' : 'explore',
      progress: `${Math.min(birthCost, Math.floor(s.lineage.biomass))} / ${birthCost} biomass · age ${Math.floor(s.player.age)} / ${TUNING.reproductionAge}s`,
      reward: 'A living relative can carry on when your life ends.',
    };
  return {
    completed,
    step: 3,
    title: s.society.era === 'biology' ? 'Beyond the shallows' : 'Build your next chapter',
    detail:
      s.society.era === 'biology'
        ? 'Your lineage has begun. Explore a new habitat and discover what your body can become.'
        : 'Open Society to research, build, and guide your growing civilization.',
    label: s.society.era === 'biology' ? 'Explore the world' : 'Open Society',
    action: s.society.era === 'biology' ? 'explore' : 'society',
    progress: `${s.evolution.regions.filter((r) => r.discovered).length} / ${s.evolution.regions.length} habitats discovered`,
    reward: 'New habitats reveal new food, species, and opportunities.',
  };
}
