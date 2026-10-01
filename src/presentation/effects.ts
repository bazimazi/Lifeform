import type { Creature, GameState } from '../core/types';
import { phenotype } from '../biology/body';
export function drawEffects(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  c: Creature,
  time: number,
) {
  const p = phenotype(c.genome),
    r = 20 + p.mass,
    conditions = s.evolution.statuses[c.id] ?? [];
  ctx.save();
  if (p.flight > 0) {
    ctx.fillStyle = '#00000030';
    ctx.beginPath();
    ctx.ellipse(c.x + 12, c.y + 24, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.stealth > 0.3) {
    ctx.strokeStyle = '#acd9d644';
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, r * 1.4, r, Math.sin(time) * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (!s.settings.particles) {
    ctx.restore();
    return;
  }
  if (
    c.poison > 0 ||
    conditions.some((v) => ['burning', 'bleeding', 'regenerating'].includes(v.id)) ||
    p.regeneration > 0
  ) {
    ctx.fillStyle =
      c.poison > 0
        ? '#b2a1e9'
        : conditions.some((v) => v.id === 'burning')
          ? '#efbd72'
          : conditions.some((v) => v.id === 'bleeding')
            ? '#df918c'
            : '#b8e998';
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + time * 0.8;
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(a) * (r + 7), c.y + Math.sin(a) * (r + 7), 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (p.electricity > 0 && c.attackCooldown > 0.3) {
    ctx.strokeStyle = '#f2efad';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = c.angle + (i - 3) * 0.15;
      const x = c.x + Math.cos(a) * (r + 10 + (i % 2) * 18),
        y = c.y + Math.sin(a) * (r + 10 + (i % 2) * 18);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  if (p.projectile > 0 && c.attackCooldown > 0.6) {
    ctx.strokeStyle = '#d6b59180';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(c.angle) * r, c.y + Math.sin(c.angle) * r);
    ctx.lineTo(c.x + Math.cos(c.angle) * p.projectile, c.y + Math.sin(c.angle) * p.projectile);
    ctx.stroke();
  }
  if (conditions.length && c.id === s.player.id) {
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#edceaf';
    ctx.fillText(
      conditions
        .slice(0, 3)
        .map((v) => v.id.toUpperCase())
        .join(' / '),
      c.x,
      c.y + r + 25,
    );
  }
  ctx.restore();
}
