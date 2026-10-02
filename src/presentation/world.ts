import { drawDebug } from './debug-overlay';
import { drawEffects } from './effects';
import type { GameState, Resource, Vec } from '../core/types';
import { phenotype, dietFor } from '../biology/body';
import { clamp, distance, hash } from '../core/random';
import { resourceById, speciesById } from '../data/content';
import { drawOrganism, creatureRadius } from './creature';
import { regionAt, biomeById } from '../world/regions';

export class WorldRenderer {
  private ctx: CanvasRenderingContext2D;
  public camera: Vec;
  public zoom = 1;
  public showVision = false;
  public showFood = false;
  public debugLayers = new Set<string>();
  private width = 1;
  private height = 1;
  private scale = 1;
  private worldWidth = 2400;
  private worldHeight = 1800;
  private habitatArt = new Image();
  public target: Vec | null = null;
  public guidedFood: Resource | null = null;
  constructor(
    public canvas: HTMLCanvasElement,
    state: GameState,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.habitatArt.src = '/art/primordial-tidepool.png';
    this.camera = { x: state.player.x, y: state.player.y };
  }
  screenToWorld(x: number, y: number): Vec {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clamp(
        this.camera.x + (x - rect.left - this.width / 2) / this.scale,
        25,
        this.worldWidth - 25,
      ),
      y: clamp(
        this.camera.y + (y - rect.top - this.height / 2) / this.scale,
        25,
        this.worldHeight - 25,
      ),
    };
  }
  draw(state: GameState, time: number, realDt: number) {
    this.worldWidth = state.world.width;
    this.worldHeight = state.world.height;
    const ctx = this.ctx,
      width = this.canvas.clientWidth,
      height = this.canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (
      this.canvas.width !== Math.round(width * dpr) ||
      this.canvas.height !== Math.round(height * dpr)
    ) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    this.width = width;
    this.height = height;
    const body = phenotype(state.player.genome),
      adaptive =
        1 +
        Math.max(0, body.mass - 5) * 0.025 +
        Math.max(0, body.speed - 135) * 0.0015 +
        (state.player.attackCooldown > 0 ? 0.08 : 0);
    this.scale =
      (Math.max(width / (width < 600 ? 640 : 1030), height / 940) * this.zoom) / adaptive;
    const ease = state.settings.reducedMotion ? 1 : Math.min(1, realDt * 5);
    this.camera.x += (state.player.x - this.camera.x) * ease;
    this.camera.y += (state.player.y - this.camera.y) * ease;
    const t = state.settings.reducedMotion ? 0 : time;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const water = ctx.createRadialGradient(
      width * 0.48,
      height * 0.46,
      0,
      width * 0.5,
      height * 0.5,
      width * 0.8,
    );
    water.addColorStop(0, biomeById[regionAt(state, state.player).biomeId].color);
    water.addColorStop(0.6, '#193430');
    water.addColorStop(1, '#101f21');
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);
    // Atmospheric backdrop sits below all interactive resources and organisms.
    if (
      this.habitatArt.complete &&
      this.habitatArt.naturalWidth &&
      biomeById[regionAt(state, state.player).biomeId].aquatic
    ) {
      const fit = Math.max(width / this.habitatArt.width, height / this.habitatArt.height) * 1.08;
      const artWidth = this.habitatArt.width * fit,
        artHeight = this.habitatArt.height * fit;
      const driftX = Math.sin(this.camera.x / 900) * width * 0.025;
      const driftY = Math.sin(this.camera.y / 900) * height * 0.025;
      ctx.globalAlpha = 0.74;
      ctx.drawImage(
        this.habitatArt,
        (width - artWidth) / 2 + driftX,
        (height - artHeight) / 2 + driftY,
        artWidth,
        artHeight,
      );
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#03151e33';
      ctx.fillRect(0, 0, width, height);
    }
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.camera.x, -this.camera.y);
    for (const region of state.evolution.regions) {
      ctx.fillStyle = biomeById[region.biomeId].color + '18';
      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.strokeStyle = biomeById[region.biomeId].accent + '12';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 15]);
      ctx.strokeRect(region.x, region.y, region.width, region.height);
      ctx.setLineDash([]);
    }
    const visible = (p: Vec, pad = 100) =>
      Math.abs(p.x - this.camera.x) < width / this.scale / 2 + pad &&
      Math.abs(p.y - this.camera.y) < height / this.scale / 2 + pad;
    // Quiet bathymetric contours make the water feel like a place, not a grid.
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#81b2990c';
    for (let i = 0; i < 22; i++) {
      ctx.beginPath();
      for (let x = -100; x < state.world.width + 100; x += 25) {
        const y = i * 110 + Math.sin(x / 220 + i * 0.42) * 80 + Math.sin(x / 460 + t * 0.08) * 36;
        if (x === -100) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (const f of state.world.features) {
      if (!visible(f, f.size + 120)) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      if (f.kind === 'patch') {
        const glow = ctx.createRadialGradient(0, 0, 5, 0, 0, f.size);
        glow.addColorStop(0, '#91af641d');
        glow.addColorStop(1, '#91af6400');
        ctx.fillStyle = glow;
        ctx.fillRect(-f.size, -f.size, f.size * 2, f.size * 2);
      } else if (f.kind === 'rock') {
        ctx.fillStyle = '#101f2288';
        ctx.strokeStyle = '#82a48f16';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let j = 0; j < 7; j++) {
          const a = (j / 6) * Math.PI * 2,
            r = f.size * (0.75 + (j % 2) * 0.25);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.75);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-f.size * 0.4, -f.size * 0.3);
        ctx.lineTo(f.size * 0.3, -f.size * 0.5);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#86a47425';
        ctx.lineWidth = 2;
        for (let j = 0; j < 5; j++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(
            (j - 2) * 7 + Math.sin(t + f.x) * 4,
            -f.size * 0.6,
            (j - 2) * 12,
            -f.size * (1 + j * 0.14),
          );
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    const diet = dietFor(state.player.genome);
    for (const r of state.resources) {
      if (!r.active || !visible(r)) continue;
      const def = resourceById[r.type],
        edible = diet.includes(def.diet);
      const radius = def.radius,
        wave = Math.sin(t * 1.6 + r.id * 4) * 2;
      ctx.save();
      ctx.translate(r.x, r.y + wave);
      ctx.rotate(r.id * 1.7 + t * 0.05);
      if (edible) {
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 3);
        glow.addColorStop(0, def.color + '25');
        glow.addColorStop(1, def.color + '00');
        ctx.fillStyle = glow;
        ctx.fillRect(-radius * 3, -radius * 3, radius * 6, radius * 6);
      }
      ctx.fillStyle = def.color + (edible ? 'b8' : '66');
      ctx.strokeStyle = def.color + '55';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (def.diet === 'mineral') {
        ctx.moveTo(0, -radius);
        ctx.lineTo(radius, 0);
        ctx.lineTo(0, radius);
        ctx.lineTo(-radius, 0);
        ctx.closePath();
      } else if (def.diet === 'algae') {
        for (let j = 0; j < 5; j++) {
          const a = (j / 4) * Math.PI * 2;
          ctx.ellipse(
            Math.cos(a) * radius * 0.45,
            Math.sin(a) * radius * 0.45,
            radius * 0.6,
            radius * 0.4,
            a,
            0,
            Math.PI * 2,
          );
        }
      } else ctx.ellipse(0, 0, radius, radius * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f0f1c58a';
      ctx.beginPath();
      ctx.arc(-2, -2, 1.4, 0, Math.PI * 2);
      ctx.fill();
      if (this.showFood && edible) {
        ctx.beginPath();
        ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#b8e99866';
        ctx.stroke();
      }
      ctx.restore();
    }
    if (state.settings.particles) {
      for (let i = 0; i < 160; i++) {
        const x = hash(`particle-x${i}`) % state.world.width,
          y = hash(`particle-y${i}`) % state.world.height;
        if (!visible({ x, y })) continue;
        ctx.fillStyle = i % 3 === 0 ? '#c9dfb929' : '#b3d3c412';
        ctx.beginPath();
        ctx.arc(
          x + Math.sin(t * 0.15 + i) * 12,
          y + Math.cos(t * 0.18 + i) * 10,
          i % 4 === 0 ? 2 : 1,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    const p = state.player;
    for (const river of state.world.terrain?.rivers ?? []) {
      ctx.beginPath();
      river.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = '#729b9c12';
      ctx.lineWidth = 55;
      ctx.stroke();
      ctx.strokeStyle = '#83b0b120';
      ctx.lineWidth = 24;
      ctx.stroke();
    }
    for (const town of state.society.settlements) {
      ctx.fillStyle = town.lost ? '#78716888' : '#d3c69c88';
      ctx.strokeStyle = '#e5d7ab';
      ctx.lineWidth = 2;
      const count = Math.min(
        12,
        Object.values(town.buildings).reduce((a, b) => a + b, 0),
      );
      for (let n = 0; n < count; n++) {
        const x = town.x + ((n % 4) - 1.5) * 25,
          y = town.y + Math.floor(n / 4) * 25;
        ctx.fillRect(x, y, 18, 18);
        ctx.strokeRect(x, y, 18, 18);
      }
      ctx.fillStyle = '#f5e6bd';
      ctx.font = '13px Segoe UI';
      ctx.textAlign = 'center';
      ctx.fillText(town.name + (town.lost ? ' (ruins)' : ''), town.x, town.y - 15);
    }
    for (const nest of state.evolution.nests) {
      ctx.strokeStyle = '#ccb58d88';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(nest.x, nest.y, 48, 33, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = '11px Segoe UI';
      ctx.fillStyle = '#cfbf9a';
      ctx.textAlign = 'center';
      ctx.fillText(`NEST · ${Math.floor(nest.food)} FOOD`, nest.x, nest.y + 50);
    }
    for (const fossil of state.evolution.fossils) {
      if (!visible(fossil) || (!fossil.discovered && distance(fossil, p) > body.vision)) continue;
      ctx.save();
      ctx.translate(fossil.x, fossil.y);
      ctx.strokeStyle = fossil.discovered ? '#ebdcb3cc' : '#bdc9c488';
      ctx.fillStyle = '#15242dbb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 21, 15, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(11, 0);
      for (let rib = -7; rib <= 7; rib += 7) {
        ctx.moveTo(rib, -7);
        ctx.lineTo(rib, 7);
      }
      ctx.stroke();
      ctx.font = '10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ebdcb3';
      ctx.fillText(fossil.discovered ? 'RECOVERED FOSSIL' : 'ANCIENT REMAINS', 0, 31);
      ctx.restore();
    }
    for (const site of state.evolution.regions.flatMap((r) => r.sites))
      if (site.discovered && !site.investigated) {
        ctx.strokeStyle = '#d6c28d66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(site.x, site.y, 20, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '10px Segoe UI';
        ctx.fillStyle = '#d6c28d';
        ctx.textAlign = 'center';
        ctx.fillText(site.kind.toUpperCase(), site.x, site.y + 36);
      }
    if (this.showVision) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, phenotype(p.genome).vision, 0, Math.PI * 2);
      ctx.strokeStyle = '#b8e99840';
      ctx.fillStyle = '#b8e99804';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 8]);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const c of state.creatures) {
      if (!visible(c) || c.health <= 0) continue;
      const color = c.speciesId === 'player' ? '#b8e998' : speciesById[c.speciesId].color;
      drawOrganism(
        ctx,
        c.genome,
        c.x,
        c.y,
        color,
        t + c.age * 0.01,
        c.angle,
        1,
        false,
        c.juvenile > 0,
      );
      drawEffects(ctx, state, c, t);
      const known = c.speciesId === 'player' || state.discoveries.species.includes(c.speciesId);
      if (distance(c, p) < phenotype(p.genome).vision && known) {
        ctx.font = '10px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = color + '99';
        ctx.fillText(
          c.speciesId === 'player'
            ? `GEN ${c.generation} · ${c.juvenile > 0 ? 'JUVENILE' : 'KIN'}`
            : state.progression.apex?.id === c.id
              ? 'ANCIENT GIANT'
              : speciesById[c.speciesId].name.toUpperCase(),
          c.x,
          c.y + creatureRadius(c) + 18,
        );
      }
      const hp = c.health / phenotype(c.genome).health;
      if (hp < 0.99) {
        ctx.fillStyle = '#0007';
        ctx.fillRect(c.x - 17, c.y - 37, 34, 3);
        ctx.fillStyle = color;
        ctx.fillRect(c.x - 17, c.y - 37, 34 * hp, 3);
      }
    }
    if (p.health > 0) {
      ctx.setLineDash([2, 7]);
      ctx.strokeStyle = '#b8e99835';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawOrganism(ctx, p.genome, p.x, p.y, '#b8e998', t, p.angle, 1.22, true, p.juvenile > 0);
      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9e9c2';
      drawEffects(ctx, state, p, t);
      ctx.fillText('YOU', p.x, p.y - creatureRadius(p) - 36);
      ctx.beginPath();
      ctx.moveTo(p.x - 3, p.y - 48);
      ctx.lineTo(p.x, p.y - 44);
      ctx.lineTo(p.x + 3, p.y - 48);
      ctx.strokeStyle = '#b8e99888';
      ctx.stroke();
    }
    if (this.guidedFood?.active && p.health > 0) {
      const food = this.guidedFood;
      const pulse = state.settings.reducedMotion ? 0 : Math.sin(t * 3) * 3;
      ctx.save();
      ctx.strokeStyle = '#f5cc82dd';
      ctx.fillStyle = '#f5cc8218';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(food.x, food.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(food.x, food.y, 22 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 10px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      const label = state.telemetry.foodEaten === 0 ? 'FIRST MEAL' : 'FOOD';
      const labelWidth = ctx.measureText(label).width + 18;
      ctx.fillStyle = '#102631ee';
      ctx.beginPath();
      ctx.roundRect(food.x - labelWidth / 2, food.y - 51, labelWidth, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#ffe4a5';
      ctx.fillText(label, food.x, food.y - 36);
      ctx.restore();
    }
    if (this.target) {
      ctx.strokeStyle = '#b8e99890';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.target.x, this.target.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.target.x - 15, this.target.y);
      ctx.lineTo(this.target.x + 15, this.target.y);
      ctx.moveTo(this.target.x, this.target.y - 15);
      ctx.lineTo(this.target.x, this.target.y + 15);
      ctx.stroke();
    }
    if (import.meta.env.DEV && this.debugLayers.size)
      drawDebug(ctx, state, this.debugLayers, visible);
    ctx.strokeStyle = '#9abd8066';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, state.world.width - 40, state.world.height - 40);
    ctx.restore();
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.18,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7,
    );
    vignette.addColorStop(0, '#0b161700');
    vignette.addColorStop(1, '#0b161780');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.font = '10px "Segoe UI", sans-serif';
    ctx.fillStyle = '#91b39b55';
    ctx.textAlign = 'left';
    ctx.fillText('A SMALL WORLD, ALREADY ALIVE', 22, height - 22);
  }
  drawMap(canvas: HTMLCanvasElement, state: GameState, large = false) {
    const ctx = canvas.getContext('2d')!,
      width = canvas.width,
      height = canvas.height;
    const sx = width / state.world.width,
      sy = height / state.world.height;
    ctx.fillStyle = '#132728';
    ctx.fillRect(0, 0, width, height);
    for (const region of state.evolution.regions) {
      ctx.fillStyle = biomeById[region.biomeId].color;
      ctx.fillRect(region.x * sx, region.y * sy, region.width * sx, region.height * sy);
      if (large) {
        ctx.fillStyle = region.discovered ? '#e2edd0' : '#b0bea6';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText(
          region.name,
          (region.x + region.width / 2) * sx,
          (region.y + region.height / 2) * sy,
        );
      }
    }
    for (const cell of state.world.visited) {
      const [x, y] = cell.split(',').map(Number);
      ctx.fillStyle = '#b8e9980d';
      ctx.fillRect(x * 300 * sx, y * 300 * sy, 300 * sx, 300 * sy);
    }
    for (const f of state.world.features) {
      if (f.kind === 'patch') {
        ctx.fillStyle = '#a0c97712';
        ctx.beginPath();
        ctx.arc(f.x * sx, f.y * sy, f.size * sx, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const c of state.creatures) {
      if (!state.discoveries.species.includes(c.speciesId) && c.speciesId !== 'player') continue;
      ctx.fillStyle = c.speciesId === 'player' ? '#b8e998' : speciesById[c.speciesId].color + '99';
      ctx.beginPath();
      ctx.arc(c.x * sx, c.y * sy, large ? 4 : 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#b8e99833';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      (this.camera.x - this.width / this.scale / 2) * sx,
      (this.camera.y - this.height / this.scale / 2) * sy,
      (this.width / this.scale) * sx,
      (this.height / this.scale) * sy,
    );
    ctx.fillStyle = '#d2f2ae';
    ctx.beginPath();
    ctx.arc(state.player.x * sx, state.player.y * sy, large ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
