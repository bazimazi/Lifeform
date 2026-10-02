import type { GameState, Genome } from '../core/types';
import { dietFor, phenotype } from '../biology/body';
import { environmentalExposure } from '../biology/conditions';
import { regionAt, traversal, biomeById } from '../world/regions';
import { TUNING } from '../data/content';
import { escapeHtml as esc } from './icons';

export function habitatForecast(s: GameState, genome: Genome) {
  const current = regionAt(s, s.player);
  return s.evolution.regions.map((r) => {
    const point = r.id === current.id ? s.player : { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    const c = { ...s.player, ...point, genome };
    const exposure = environmentalExposure(s, c);
    return {
      id: r.id,
      name: biomeById[r.biomeId].name,
      current: r.id === current.id,
      movement: traversal(s, c, point),
      energyDrain: exposure.stress,
      healthDrain: Math.max(0, exposure.stress - 0.2),
      temperature: exposure.local.temperature,
    };
  });
}

export function buildFeedback(s: GameState, before: Genome, after: Genome) {
  const a = phenotype(before),
    b = phenotype(after),
    previous = habitatForecast(s, before),
    next = habitatForecast(s, after);
  const foodsBefore = dietFor(before),
    foodsAfter = dietFor(after);
  const added = foodsAfter.filter((f) => !foodsBefore.includes(f)),
    lost = foodsBefore.filter((f) => !foodsAfter.includes(f));
  return `<section class="build-feedback" aria-label="Diet and habitat preview"><h3 class="subheading">What this body needs</h3><div class="food-forecast"><p><b>Food sources:</b> ${foodsAfter.map(esc).join(', ') || 'None'}${added.length ? `<span>New: ${added.map(esc).join(', ')}</span>` : ''}${lost.length ? `<span>Lost: ${lost.map(esc).join(', ')}</span>` : ''}</p><p><b>Base energy use:</b> ${(TUNING.baseEnergyDrain + a.metabolism).toFixed(2)} → ${(TUNING.baseEnergyDrain + b.metabolism).toFixed(2)} / sec</p><small>Movement, climate and conditions add costs. Photosynthesis offsets energy use when light is available.</small></div><details class="habitat-forecast" open><summary>Habitat readiness · before → after</summary><p>Current weather and body. Remote habitats use their center point; shelter, disease, movement and local water can change actual survival.</p><div class="forecast-grid">${next.map((n, i) => `<article class="${n.healthDrain > 0 ? 'hazardous' : ''}"><b>${esc(n.name)}${n.current ? ' · HERE' : ''}</b><small>${n.temperature.toFixed(0)} °C</small><span>Travel ${previous[i].movement.multiplier.toFixed(2)}× → ${n.movement.multiplier.toFixed(2)}×</span><span>Exposure ${previous[i].energyDrain.toFixed(2)} → ${n.energyDrain.toFixed(2)} energy / sec</span><span>Damage ${previous[i].healthDrain.toFixed(2)} → ${n.healthDrain.toFixed(2)} health / sec</span><small>${esc(n.movement.reason ?? (n.healthDrain > 0 ? 'Movement is possible; climate still harms this body.' : 'No traversal barrier.'))}</small></article>`).join('')}</div></details></section>`;
}
