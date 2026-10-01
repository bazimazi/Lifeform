import type { Creature, Genome } from '../core/types';
import { phenotype } from '../biology/body';
import { organById } from '../data/content';

export function drawOrganism(
  ctx: CanvasRenderingContext2D,
  genome: Genome,
  x: number,
  y: number,
  color: string,
  time: number,
  angle: number,
  scale = 1,
  player = false,
  juvenile = false,
) {
  const stats = phenotype(genome),
    organs = new Set(genome.organs.map((id) => organById[id].visual));
  const radius = (18 + stats.mass * 1.15) * (juvenile ? 0.7 : 1);
  const pulse = 1 + Math.sin(time * 2.4 + x) * 0.025;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale * pulse, scale / pulse);
  if (player) {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 3.5);
    glow.addColorStop(0, '#b8e99828');
    glow.addColorStop(1, '#b8e99800');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (organs.has('tail')) {
    ctx.beginPath();
    ctx.moveTo(-radius * 0.8, 0);
    ctx.bezierCurveTo(
      -radius * 1.7,
      Math.sin(time * 7) * radius,
      -radius * 2.2,
      Math.cos(time * 7) * radius * 0.8,
      -radius * 3,
      Math.sin(time * 7 + 2) * radius * 0.5,
    );
    ctx.strokeStyle = color + 'aa';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#d1eedb99';
    ctx.stroke();
  }
  if (organs.has('cilia')) {
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 1.13, Math.sin(a) * radius * 0.84);
      const bend = Math.sin(time * 6 + i * 0.7) * 0.12;
      ctx.lineTo(
        Math.cos(a + bend) * (radius + 9) * 1.13,
        Math.sin(a + bend) * (radius + 9) * 0.84,
      );
      ctx.stroke();
    }
  }
  const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.4, 0, 0, 0, radius * 1.4);
  gradient.addColorStop(0, color + 'd8');
  gradient.addColorStop(0.65, color + '60');
  gradient.addColorStop(1, color + '22');
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const wobble = 1 + 0.075 * Math.sin(a * 3 + time * 1.6) + 0.035 * Math.cos(a * 5 - time);
    const px = Math.cos(a) * radius * 1.15 * wobble,
      py = Math.sin(a) * radius * 0.85 * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = color + 'd0';
  ctx.lineWidth = player ? 1.8 : 1.2;
  ctx.stroke();
  ctx.save();
  ctx.scale(0.91, 0.89);
  ctx.strokeStyle = color + '45';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  if (organs.has('shell')) {
    ctx.strokeStyle = '#e0cf9eaa';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(-2, 0, radius * 0.94, radius * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const a = (i / 4) * Math.PI;
      ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius * 0.8);
      ctx.lineTo(-Math.cos(a) * radius, -Math.sin(a) * radius * 0.8);
      ctx.strokeStyle = '#e0cf9e44';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // Internal organelles move subtly inside the membrane.
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + 0.1 * Math.sin(time + i);
    const r = radius * (0.3 + (i % 3) * 0.13);
    ctx.fillStyle = i % 2 === 0 ? color + '88' : '#e4f3cf55';
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(a) * r,
      Math.sin(a) * r * 0.7,
      3 + (i % 3),
      2 + (i % 2),
      a,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const nucleus = ctx.createRadialGradient(-4, -2, 0, 0, 0, radius * 0.45);
  nucleus.addColorStop(0, '#d4edb7');
  nucleus.addColorStop(0.45, color);
  nucleus.addColorStop(1, '#315f52');
  ctx.beginPath();
  ctx.ellipse(-radius * 0.16, 1, radius * 0.38, radius * 0.32, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = nucleus;
  ctx.fill();
  ctx.strokeStyle = '#cce9ad66';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#214c4277';
  ctx.beginPath();
  ctx.arc(-radius * 0.22, 1, radius * 0.14, 0, Math.PI * 2);
  ctx.fill();
  if (organs.has('chloroplast')) {
    ctx.fillStyle = '#b5e27eaa';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.7;
      ctx.beginPath();
      ctx.ellipse(
        Math.cos(a) * radius * 0.65,
        Math.sin(a) * radius * 0.55,
        6,
        3.5,
        a + 1,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  if (organs.has('eye')) {
    const count = genome.mutations.includes('compound-eye') ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const ey = (i - (count - 1) / 2) * 8;
      ctx.beginPath();
      ctx.arc(radius * 0.64, ey, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#deebc3';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(radius * 0.71, ey, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = '#193b35';
      ctx.fill();
    }
  }
  if (organs.has('jaw')) {
    ctx.strokeStyle = '#f5e9bbcc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(radius * 0.85, -9);
    ctx.lineTo(radius * 1.38, -5);
    ctx.lineTo(radius * 1.22, -1);
    ctx.moveTo(radius * 0.85, 9);
    ctx.lineTo(radius * 1.38, 5);
    ctx.lineTo(radius * 1.22, 1);
    ctx.stroke();
  }
  if (organs.has('venom')) {
    ctx.fillStyle = '#b99bdccc';
    ctx.beginPath();
    ctx.ellipse(-radius * 0.5, radius * 0.5, 7, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (organs.has('brood')) {
    ctx.strokeStyle = color + 'bb';
    ctx.fillStyle = color + '55';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(-radius * 0.9, (i ? 1 : -1) * radius * 0.45, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
export function drawPreview(canvas: HTMLCanvasElement, genome: Genome, time: number) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2),
    width = canvas.clientWidth,
    height = canvas.clientHeight;
  if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
    canvas.width = width * ratio;
    canvas.height = height * ratio;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#b8e99812';
  ctx.lineWidth = 1;
  for (const r of [48, 76]) {
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([2, 5]);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);
  drawOrganism(ctx, genome, width / 2 + 4, height / 2, '#b8e998', time, -0.32, 1.85, true);
}
export function creatureRadius(creature: Creature) {
  return 18 + phenotype(creature.genome).mass * 1.15;
}
