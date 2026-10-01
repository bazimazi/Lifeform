import type { GameState, Vec } from '../core/types';
import { phenotype } from '../biology/body';
import { speciesById } from '../data/content';
import { climate } from '../world/regions';
import { distance } from '../core/random';
export const DEBUG_LAYERS = [
  'food zones',
  'predator territories',
  'species territories',
  'navigation',
  'vision',
  'smell',
  'population density',
  'migration',
  'food chains',
  'temperature',
  'disease spread',
];
export function drawDebug(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  layers: Set<string>,
  visible: (p: Vec) => boolean,
) {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.font = '11px Segoe UI';
  ctx.textAlign = 'center';
  const circle = (p: Vec, r: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  const line = (a: Vec, b: Vec, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  };
  for (const region of s.evolution.regions) {
    const center = { x: region.x + region.width / 2, y: region.y + region.height / 2 };
    if (layers.has('temperature')) {
      const temp = climate(s, center).temperature;
      ctx.fillStyle = temp > 32 ? '#ee885522' : temp < 10 ? '#88bbee22' : '#88bb9922';
      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.fillStyle = '#f3e5cb';
      ctx.fillText(`${temp.toFixed(1)} C`, center.x, center.y - 30);
    }
    if (layers.has('population density')) {
      ctx.fillStyle = '#e4d6a9';
      ctx.fillText(
        `${Object.values(region.population).reduce((a, b) => a + b, 0)} organisms`,
        center.x,
        center.y,
      );
    }
    if (layers.has('species territories')) {
      ctx.strokeStyle = '#a8c6c4';
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      Object.entries(region.population)
        .filter(([, n]) => n > 0)
        .slice(0, 10)
        .forEach(([id, n], i) => {
          ctx.fillStyle = speciesById[id]?.color ?? '#ddd';
          ctx.fillText(`${id}: ${n}`, center.x, center.y + 20 + i * 15);
        });
    }
  }
  if (layers.has('food zones'))
    for (const r of s.resources) if (r.active && visible(r)) circle(r, 34, '#a8e69d88');
  const creatures = [s.player, ...s.creatures];
  for (const c of creatures) {
    if (!visible(c)) continue;
    const p = phenotype(c.genome);
    if (layers.has('vision')) circle(c, p.vision, '#b9df9460');
    if (layers.has('smell') && p.smell) circle(c, p.smell, '#d6b28a70');
    if (layers.has('navigation') || (layers.has('migration') && c.behavior === 'migrate')) {
      line(c, c.intent, '#d5d4ac');
      ctx.fillStyle = '#eeebca';
      ctx.fillText(c.behavior, c.x, c.y - 45);
    }
    if (layers.has('predator territories') && speciesById[c.speciesId]?.prey.includes('player'))
      circle(c, p.vision, '#e7a18a80');
    if (layers.has('food chains')) {
      const prey = creatures
        .filter((x) => speciesById[c.speciesId]?.prey.includes(x.speciesId))
        .sort((a, b) => distance(c, a) - distance(c, b))[0];
      if (prey) line(c, prey, '#d7a89850');
    }
    if (layers.has('disease spread') && s.evolution.statuses[c.id]?.length) {
      circle(c, 65, '#d0a3d5');
      ctx.fillStyle = '#dec3e6';
      ctx.fillText(s.evolution.statuses[c.id].map((x) => x.id).join(','), c.x, c.y + 50);
    }
  }
  ctx.restore();
}
