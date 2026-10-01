import type { GameState } from '../core/types';
import type { MissionKind } from '../space/types';
import { suitability, launchReason, MISSION_COSTS } from '../space/space';
import { escapeHtml as esc } from './icons';
import { costLabel } from './society-ui';
export function spacePanel(s: GameState) {
  const q = s.space,
    latest = q.planets.filter((p) => p.id.startsWith(`system-${q.system}-`));
  return `<p class="dialog-intro">The same lineage, under another sky. Launches, colonies, mining, and scientific discoveries continue on the living world's clock.</p><svg class="star-map" viewBox="0 0 720 260" role="img" aria-label="Current star system with six destinations"><defs><radialGradient id="star-glow"><stop stop-color="#ffe3a0"/><stop offset="1" stop-color="#d29e4100"/></radialGradient></defs><rect width="720" height="260" fill="#0b1820"/>${Array.from({ length: 45 }, (_, i) => `<circle cx="${(i * 173 + 21) % 720}" cy="${(i * 83 + 17) % 260}" r="1" fill="#d7e9e780"/>`).join('')}<circle cx="50" cy="120" r="50" fill="url(#star-glow)"/>${latest.map((p, i) => `<ellipse cx="50" cy="120" rx="${100 + i * 105}" ry="${38 + i * 20}" fill="none" stroke="#d3e0d012"/><circle cx="${135 + i * 100}" cy="${95 + (i % 2) * 60}" r="${p.kind === 'asteroid' ? 7 : 14 + i}" fill="${p.temperature > 35 ? '#d49c78' : p.temperature < 0 ? '#9ec4d0' : '#98bd91'}"/><text x="${135 + i * 100}" y="${140 + (i % 2) * 60}" text-anchor="middle" fill="#d5e5d7" font-size="10">${esc(p.name)}</text>`).join('')}</svg><div class="economy-stock"><div><span>Launches</span><b>${q.launches}</b></div><div><span>Orbital habitats</span><b>${q.orbitalHabitats}</b></div><div><span>Alien life catalogued</span><b>${q.discoveries}</b></div><div><span>Efficiency research</span><b>+${q.improvement * 5}%</b></div></div><div class="button-row"><button class="secondary-button" data-action="space-launch" data-value="orbit:orbit" ${launchReason(s, 'orbit', 'orbit') ? 'disabled' : ''}>Build orbital habitat</button><button class="secondary-button" data-action="space-frontier">Explore another system</button><button class="secondary-button" data-action="space-research">Research a new frontier</button></div><p class="dialog-note">${esc(launchReason(s, 'orbit', 'orbit') ?? costLabel(MISSION_COSTS.orbit))}</p>${q.research ? `<p class="system-note">${esc(q.research.name)} · ${Math.ceil(q.research.remaining)}s remaining</p>` : ''}${q.missions.map((m) => `<p class="system-note">${m.kind} → ${esc(q.planets.find((p) => p.id === m.target)?.name ?? 'Home orbit')} · ${Math.ceil(m.remaining)} seconds until arrival</p>`).join('')}<div class="planet-grid">${q.planets
    .map(
      (p) =>
        `<article class="town-card"><span class="tiny-label">${p.kind.toUpperCase()} / ${p.surveyed ? 'SURVEYED' : 'UNKNOWN'}</span><h3>${esc(p.name)}</h3>${p.surveyed ? `<p>${p.temperature} °C · ${p.gravity.toFixed(1)} g · ${Math.round(p.water * 100)}% water · ${Math.round(p.oxygen * 100)}% oxygen</p><p>Biological suitability ${Math.round(suitability(p, s.player.genome) * 100)}% · ${p.mines} mines · Engineering ${p.terraforming * 100}%</p><div class="organ-chips">${p.life.map((l) => `<span>${esc(l.name)} / ${esc(l.niche)}</span>`).join('')}</div>${p.colony ? `<p>${Math.floor(p.colony.population)} colonists · Health ${Math.ceil(p.colony.health)} · Food ${Math.floor(p.colony.food)} · Water ${Math.floor(p.colony.water)}</p>` : ''}` : '<p>A survey reveals climate, resources, and life.</p>'}<div class="mission-list">${(
          ['survey', 'mine', 'colonize', 'supply', 'terraform'] as MissionKind[]
        )
          .filter((kind) => (kind === 'survey' ? !p.surveyed : p.surveyed))
          .map((kind) => {
            const reason = launchReason(s, kind, p.id);
            return `<div><button class="secondary-button" data-action="space-launch" data-value="${kind}:${p.id}" ${reason ? 'disabled' : ''}>${kind}</button><small>${esc(reason ?? costLabel(MISSION_COSTS[kind]))}</small></div>`;
          })
          .join('')}</div></article>`,
    )
    .join('')}</div><h3 class="subheading">Expedition journal</h3>${q.log
    .slice(-15)
    .reverse()
    .map(
      (l) => `<article class="town-card"><h3>${esc(l.title)}</h3><p>${esc(l.detail)}</p></article>`,
    )
    .join('')}`;
}
