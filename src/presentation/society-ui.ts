import type { GameState } from '../core/types';
import { MATERIALS, PROFESSIONS, type Cost } from '../society/types';
import { BUILDINGS, TECHNOLOGIES, TOOLS, techById, toolById } from '../data/society';
import { intelligenceReason, researchReason, housing } from '../society/society';
import { escapeHtml as esc, icon } from './icons';
export const costLabel = (cost: Cost) =>
  Object.entries(cost)
    .map(([m, n]) => `${n} ${m}`)
    .join(' / ');
export function societyView(s: GameState) {
  const q = s.society,
    reason = intelligenceReason(s),
    advanced = intelligenceReason(s, true);
  return `<div class="secondary-heading"><span class="eyebrow">${esc(q.era.toUpperCase())} / THE SAME LINEAGE</span><h2>Life learns to build.</h2><p class="muted">Biology shapes food, work, shelter, and survival. Management pauses time; return to the habitat to let your plans unfold.</p></div>${reason ? `<div class="system-note">${esc(reason)}<br>Path: light-sensitive eye → associative brain; jointed legs → manipulating digits. Social memory and vocal language unlock society.</div>` : ''}<div class="economy-stock">${MATERIALS.map((m) => `<div><span>${m}</span><b>${Math.floor(q.stock[m])}</b><small>+${q.production[m].toFixed(2)} / −${q.consumption[m].toFixed(2)} per second</small></div>`).join('')}<div><span>Knowledge</span><b>${Math.floor(q.knowledge)}</b><small>${q.learning} learned experiences</small></div></div>
 <div class="button-row"><button class="secondary-button" data-action="society-gather-menu">Gather materials</button><button class="secondary-button" data-action="society-craft-menu">Craft tools</button><button class="secondary-button" data-action="society-research-menu">Research</button><button class="secondary-button" data-action="society-convert">Store 5 biomass as food</button><button class="text-button" data-action="view" data-value="habitat">Return to living world ${icon('arrow')}</button></div>
 ${q.research ? `<p class="system-note">Research: ${esc(techById[q.research.id].name)} · ${Math.ceil(q.research.remaining)} seconds remaining</p>` : ''}
 <h3 class="subheading">Beyond the home world</h3><button class="secondary-button" data-action="space">Space exploration & frontier research</button><p class="muted">Research science, flight, and rocketry to begin orbital expeditions. Your descendants carry their biological adaptations with them.</p><h3 class="subheading">Carried tools</h3><div class="organ-chips">${q.tools.map((t) => `<span>${esc(toolById[t.id].name)} · ${Math.ceil(t.durability)} uses</span>`).join('') || '<span>No crafted tools yet</span>'}</div>${q.tools.some((t) => t.id === 'remedy') ? '<button class="secondary-button" data-action="society-heal">Use herbal remedy</button>' : ''}
 <h3 class="subheading">Learned places</h3><div class="organ-chips">${
   q.memory
     .slice(-8)
     .map(
       (m, i) =>
         `<button class="text-button" data-action="society-memory" data-value="${Math.max(0, q.memory.length - 8) + i}">${esc(m.resource)} · ${m.visits} visits</button>`,
     )
     .join('') || '<span>Memory records useful places as you feed and gather.</span>'
 }</div>
 <h3 class="subheading">Settlements & professions</h3>${q.settlements
   .map(
     (t) =>
       `<article class="town-card"><div class="section-heading"><h3>${esc(t.name)}</h3><span>${t.lost ? 'ABANDONED' : t.population >= 20 ? 'CITY' : 'SETTLEMENT'}</span></div><p>${t.population} citizens / ${housing(t)} housing · Health ${Math.round(t.health)} · Stability ${Math.round(t.stability)}</p><p class="muted">${esc(s.evolution.regions.find((r) => r.id === t.regionId)?.name ?? '')} · ${esc(
         Object.entries(t.buildings)
           .map(([id, n]) => `${n} ${BUILDINGS.find((b) => b.id === id)?.name}`)
           .join(', '),
       )}</p>${t.lost ? '' : `<div class="button-row"><button class="secondary-button" data-action="society-build-menu" data-value="${t.id}">Construct</button><button class="secondary-button" data-action="society-visit" data-value="${t.id}">Travel home</button></div>${t.queue ? `<p>Building ${esc(BUILDINGS.find((b) => b.id === t.queue!.building)?.name ?? '')} · ${Math.ceil(t.queue.remaining)}s</p>` : ''}<div class="profession-grid">${PROFESSIONS.map((j) => `<div><span>${j}</span><button data-action="society-job" data-value="${t.id}:${j}:-1" aria-label="Remove ${j}">−</button><b>${t.jobs[j]}</b><button data-action="society-job" data-value="${t.id}:${j}:1" aria-label="Assign ${j}">+</button></div>`).join('')}</div>`}</article>`,
   )
   .join('')}
 <form id="settlement-form"><label class="field-label" for="town-name">FOUND A SETTLEMENT AT YOUR LOCATION</label><input id="town-name" name="name" maxlength="40" placeholder="First Haven" required /><p class="dialog-note">${esc(advanced ?? 'Needs three living relatives, 12 food, 8 wood, and 8 fiber. Biological abilities are preserved in each settlement.')}</p><button class="primary-button" type="submit" ${advanced ? 'disabled' : ''}>Found settlement</button></form>
 <h3 class="subheading">Neighbors & exchange</h3>${
   q.neighbors
     .map(
       (n) =>
         `<article class="town-card"><h3>${esc(n.name)}</h3><p>${esc(n.culture)} · Relations ${n.relations} · ${n.conflict ? 'Border conflict' : n.trade ? 'Trading regularly' : 'At peace'}</p><div class="button-row">${[
           ['gift', 'Gift 5 food'],
           ['trade', `Trade 5 food for 8 ${n.specialty}`],
           ['route', n.trade ? 'Pause route' : 'Open trade route'],
           ['territory', 'Contest territory'],
         ]
           .map(
             ([a, label]) =>
               `<button class="secondary-button" data-action="society-diplomacy" data-value="${n.id}:${a}">${esc(label)}</button>`,
           )
           .join('')}</div></article>`,
     )
     .join('') || '<p class="muted">A settled lineage will encounter neighboring societies.</p>'
 }
 <h3 class="subheading">Culture from your history</h3><div class="town-card"><p><b>${esc(q.culture.language)}</b> · ${esc(q.culture.architecture)}</p><p>${esc(q.culture.traditions.join(' · '))}</p><p>${esc(q.culture.mythology)}</p><p>${esc(q.culture.art)} · ${esc(q.culture.music)}</p><p>Pollution: ${q.pollution.toFixed(1)} / Law: ${q.culture.law} / Government: ${q.culture.government}</p><div class="button-row">${['council', 'stewardship', 'assembly'].map((v) => `<button class="secondary-button" data-action="society-policy" data-value="government:${v}">${v}</button>`).join('')}${['balanced', 'conservation', 'expansion'].map((v) => `<button class="secondary-button" data-action="society-policy" data-value="law:${v}">${v}</button>`).join('')}</div><p class="dialog-note">Council supports stability. Stewardship favors growth. Assembly accelerates knowledge. Conservation reduces pollution and output; expansion increases production.</p></div>`;
}
export function gatherMenu(s: GameState) {
  return `<p class="dialog-intro">Gather where your creature stands. Habitat and tools affect yield. Gathering costs energy and takes 3 seconds to recover.</p><div class="button-row">${MATERIALS.filter(
    (m) => !['metal', 'energy'].includes(m),
  )
    .map(
      (m) =>
        `<button class="secondary-button" data-action="society-gather" data-value="${m}">Gather ${m}</button>`,
    )
    .join('')}</div><p>${esc(intelligenceReason(s) ?? 'Your hands and brain are ready.')}</p>`;
}
export function craftMenu(s: GameState) {
  return TOOLS.map(
    (t) =>
      `<article class="town-card"><h3>${esc(t.name)}</h3><p>${esc(t.description)}</p><p class="muted">${costLabel(t.cost)} / ${techById[t.technology].name}</p><button class="secondary-button" data-action="society-craft" data-value="${t.id}" ${s.society.technologies.includes(t.technology) ? '' : 'disabled'}>Craft</button></article>`,
  ).join('');
}
export function researchMenu(s: GameState) {
  return TECHNOLOGIES.map((t) => {
    const known = s.society.technologies.includes(t.id),
      reason = researchReason(s, t.id);
    return `<article class="town-card"><span class="tiny-label">${t.era} / ${known ? 'LEARNED' : t.requires.map((id) => techById[id].name).join(' + ') || 'FOUNDATION'}</span><h3>${t.name}</h3><p>${t.description}</p><p class="muted">${t.knowledge} knowledge / ${costLabel(t.cost)} / ${Math.ceil(t.seconds)}s</p>${known ? '' : `<button class="secondary-button" data-action="society-research" data-value="${t.id}" ${reason ? 'disabled' : ''}>Research</button>${reason ? `<p class="dialog-note">${esc(reason)}</p>` : ''}`}</article>`;
  }).join('');
}
export function buildMenu(s: GameState, townId: string) {
  return BUILDINGS.map(
    (b) =>
      `<article class="town-card"><h3>${b.name}</h3><p>${b.description || 'Supports infrastructure and trade.'}</p><p class="muted">${costLabel(b.cost)} / ${techById[b.technology].name}</p><button class="secondary-button" data-action="society-build" data-value="${townId}:${b.id}" ${s.society.technologies.includes(b.technology) ? '' : 'disabled'}>Build</button></article>`,
  ).join('');
}
