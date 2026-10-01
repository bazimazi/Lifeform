import type { GameState } from '../core/types';
import { TRAITS } from '../progression/types';
import { objectiveValue, STARTS, CHALLENGES } from '../progression/replay';
import { escapeHtml as esc } from './icons';
export function replayPanel(s: GameState) {
  return `<h3 class="subheading">Ecological objectives</h3><p class="muted">Optional paths through a living world. Complete objectives to reveal new possibilities; fresh objectives continue across eras.</p>${
    s.progression.objectives
      .filter((o) => !o.claimed)
      .map((o) => {
        const value = Math.max(0, objectiveValue(s, o.kind) - o.baseline);
        return `<article class="town-card"><h3>${esc(o.name)}</h3><p>${Math.min(o.target, Math.floor(value))} / ${o.target} ${o.kind === 'time' ? 'seconds' : o.kind === 'travel' ? 'distance' : o.kind}</p><button class="secondary-button" data-action="objective-claim" data-value="${o.id}" ${value >= o.target ? '' : 'disabled'}>Claim discovery</button></article>`;
      })
      .join('') || '<p>Begin the simulation to reveal the first objectives.</p>'
  }<p class="muted">${s.progression.completed} objectives complete · ${s.progression.selectionEvents} natural-selection events · ${s.progression.pressureSurvived} pressures survived</p><h3 class="subheading">Beginnings discovered</h3><div class="organ-chips">${STARTS.map((p) => `<span>${s.evolution.unlocks.includes(p.id) ? 'Unlocked' : 'Unexplored'}: ${p.name}</span>`).join('')}</div><button class="secondary-button" data-action="world-settings">Choose another beginning</button>`;
}
export function adaptivePanel(s: GameState) {
  return `<h3 class="subheading">Procedural adaptations</h3><p class="muted">Choose an inherited tradeoff for 2 points and 6 biomass. A body can carry three variations. Each choice reveals a fresh set.</p><div class="region-gallery">${s.progression.variations
    .map(
      (v) =>
        `<article class="town-card"><h3>${esc(v.name)}</h3><p>${esc(v.description)}</p><p>${Object.entries(
          v.modifiers,
        )
          .map(
            ([k, n]) =>
              `${n >= 0 ? '+' : ''}${n} ${k.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}`,
          )
          .join(
            ' / ',
          )}</p><button class="secondary-button" data-action="variation-adopt" data-value="${v.id}">Adopt variation</button></article>`,
    )
    .join(
      '',
    )}</div><div class="organ-chips">${(s.player.genome.variations ?? []).map((v) => `<button class="text-button" data-action="variation-remove" data-value="${v.id}">Remove ${esc(v.name)}</button>`).join('')}</div><h3 class="subheading">Behavior is inherited, too</h3><p class="muted">Adopt up to three behaviors for 1 point and 3 biomass each. Your relatives express them in their decisions. Solitary and group behaviors cannot be combined.</p><div class="behavior-grid">${TRAITS.map((t) => `<button class="secondary-button" data-action="trait-adopt" data-value="${t}" aria-pressed="${s.player.genome.traits?.includes(t) ?? false}">${s.player.genome.traits?.includes(t) ? '✓ ' : ''}${t.replaceAll('-', ' ')}</button>`).join('')}</div>`;
}
export function startOptions(s: GameState) {
  return `<label class="field-label" for="starting-path">STARTING ORGANISM</label><select name="path" id="starting-path">${STARTS.map((p) => `<option value="${p.id}" ${s.evolution.unlocks.includes(p.id) ? '' : 'disabled'}>${p.name}${s.evolution.unlocks.includes(p.id) ? '' : ' (discover this path first)'}</option>`).join('')}</select><label class="field-label" for="world-challenge">WORLD RULES</label><select name="challenge" id="world-challenge">${CHALLENGES.map((c) => `<option value="${c.id}">${c.name} — ${c.description}</option>`).join('')}</select>`;
}
