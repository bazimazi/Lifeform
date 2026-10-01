import type { GameState } from '../core/types';
import { phenotype } from '../biology/body';
import { expressedGenes } from '../biology/genetics';
import { BIOMES, DISEASES } from '../data/biology';
import { regionAt, climate, traversal } from '../world/regions';
import { speciationReason } from '../progression/lineage';
import { icon, escapeHtml as esc } from './icons';
import { distance } from '../core/random';

export function geneticsPanel(state: GameState) {
  const stats = phenotype(state.player.genome),
    local = climate(state, state.player);
  return `<h3 class="subheading">A body in its environment</h3><div class="stat-grid">${[
    ['Habitat', local.biome.name],
    ['Temperature', `${local.temperature.toFixed(1)} °C`],
    ['Traversal', traversal(state, state.player, state.player).reason ?? 'Well adapted'],
    ['Air efficiency', stats.oxygenEfficiency.toFixed(1)],
    ['Heat tolerance', `${stats.heatTolerance} °C`],
    ['Cold protection', `${stats.coldTolerance} °C`],
    ['Immunity', `${Math.round(stats.immunity * 100)}%`],
    ['Pressure tolerance', stats.pressureTolerance.toFixed(1)],
    ['Flight / lift', `${stats.flight.toFixed(1)} / ${stats.lift.toFixed(1)}`],
    ['Intelligence', stats.intelligence.toFixed(0)],
    ['Communication', stats.communication.toFixed(0)],
    ['Manipulation', stats.manipulation.toFixed(0)],
  ]
    .map(([key, value]) => `<div><span>${key}</span><strong>${esc(value)}</strong></div>`)
    .join(
      '',
    )}</div><h3 class="subheading">Genes behind the phenotype</h3><p class="muted">Offspring receive one allele from each mating parent. Asexual reproduction preserves the current genome. Small inherited changes can create a different phenotype.</p><div class="gene-list">${expressedGenes(
    state.player.genome,
  )
    .map(
      (g) =>
        `<div><b>${g.name}</b><span>${g.description}</span><small>Expression ${g.value > 0 ? '+' : ''}${g.value.toFixed(1)}</small></div>`,
    )
    .join(
      '',
    )}</div><button class="secondary-button" data-action="mating">Choose a mating partner ${icon('branch')}</button><h3 class="subheading">Conditions & partnerships</h3><div class="organ-chips">${(state.evolution.statuses[state.player.id] ?? []).map((s) => `<span>${esc(DISEASES.find((d) => d.id === s.id)?.name ?? s.id)} · ${Math.ceil(s.remaining)}s · ${esc(s.source)}</span>`).join('') || '<span>No active infections</span>'}${state.evolution.symbioses.map((id) => `<span>Partnership: ${esc(id)}</span>`).join('')}</div><h3 class="subheading">Appearance & organ placement</h3><p class="muted">Choose an organ, then drag inside this preview or adjust its position below. The core and mouth anchor the body.</p><canvas id="body-placement-preview" data-preview="current" aria-label="Drag selected organ to position it"></canvas><div class="body-editor"><label>Color <input type="color" id="body-color" value="${state.player.genome.appearance?.color ?? '#b8e998'}" /></label><label>Body proportions <input type="range" id="body-proportions" min="0.7" max="1.4" step="0.05" value="${state.player.genome.appearance?.proportions ?? 1}" /></label><label>Organ <select id="placement-organ">${state.player.genome.organs
    .filter((id) => !['core', 'mouth'].includes(id))
    .map((id) => `<option value="${id}">${id}</option>`)
    .join(
      '',
    )}</select></label><label>Horizontal placement <input type="range" id="placement-x" min="-1" max="1" step="0.1" value="0" /></label><label>Vertical placement <input type="range" id="placement-y" min="-1" max="1" step="0.1" value="0" /></label><button class="secondary-button" data-action="appearance">Apply body design</button></div>`;
}
export function matingPanel(state: GameState) {
  const mates = state.creatures.filter((c) => c.speciesId === 'player');
  return `<p class="dialog-intro">Mating combines gameplay genes while preserving the controlled parent's installed organs. Both parents must be mature, nearby, and well fed.</p>${mates.map((m) => `<article class="species-card"><span>${icon('cell')}</span><div><h3>Generation ${m.generation} · ${esc(m.id)}</h3><p>${Math.round(distance(m, state.player))} units away · ${Math.floor(m.energy)} energy · ${m.juvenile > 0 ? `${Math.ceil(m.juvenile)}s until mature` : 'mature'}</p><button class="secondary-button" data-action="mate" data-value="${m.id}">Mate with this individual</button></div></article>`).join('') || '<p class="empty-message">There are no living relatives yet. Reproduce asexually first to establish a population.</p>'}<button class="text-button" data-action="reproduce">Reproduce asexually instead ${icon('branch')}</button>`;
}
export function branchesPanel(state: GameState) {
  const reason = speciationReason(state);
  return `<h3 class="subheading">Species, not just individuals</h3><div class="branch-tree">${state.evolution.branches.map((b) => `<article class="ancestor ${b.id === state.evolution.activeBranch ? 'current' : ''} ${b.extinct ? 'deceased' : ''}">${icon('branch')}<b>${esc(b.name)}</b><small>${b.parentId ? `Descended from ${esc(state.evolution.branches.find((p) => p.id === b.parentId)?.name ?? 'ancestor')}` : 'Original species'} · ${state.lineage.archive.filter((a) => b.members.includes(a.id) && a.died === null).length} living</small><small>${b.extinct ? esc(b.extinctionCause ?? 'Extinct') : esc(state.evolution.regions.find((r) => r.id === b.regionId)?.name ?? 'Unknown habitat')}</small></article>`).join('')}</div><form id="speciation-form"><label class="field-label" for="branch-name">NAME A NEW SPECIES BRANCH</label><input id="branch-name" name="name" maxlength="40" placeholder="Velari silvestris" required /><p class="dialog-note">${esc(reason ?? 'Your population has diverged enough to establish a new branch.')}</p><button class="primary-button" type="submit" ${reason ? 'disabled' : ''}>Establish a species branch</button></form><h3 class="subheading">Nests and food stores</h3><button class="secondary-button" data-action="build-nest">Build a nest here · ${phenotype(state.player.genome).burrowing ? 4 : 8} biomass</button>${state.evolution.nests.map((n) => `<div class="adaptation-row"><span>${esc(state.evolution.regions.find((r) => r.id === n.regionId)?.name ?? 'Nest')} · ${Math.floor(n.food)} food · ${Math.floor(n.health)} health</span><button class="text-button" data-action="stock-nest" data-value="${n.id}">Store 5 biomass</button></div>`).join('')}<h3 class="subheading">Evolutionary milestones</h3><div class="organ-chips">${state.evolution.milestones.map((m) => `<span>${esc(m)}</span>`).join('') || '<span>The next first is still ahead.</span>'}</div>`;
}
export function worldPanel(state: GameState) {
  const current = regionAt(state, state.player);
  return `<p class="dialog-intro">${state.evolution.discoveries.length} / ${BIOMES.length} biomes discovered. Travel is continuous: a body built for water needs new adaptations on land.</p><canvas id="large-map" class="large-map" width="720" height="540" aria-label="Regions, species and discovered habitats"></canvas><div class="region-gallery">${state.evolution.regions
    .map((r) => {
      const b = BIOMES.find((b) => b.id === r.biomeId)!;
      return `<article class="species-card"><span style="color:${b.accent}">${icon(b.aquatic ? 'wave' : b.elevation > 0.5 ? 'habitat' : 'sun')}</span><div><span class="tiny-label">${r.id === current.id ? 'YOU ARE HERE' : r.discovered ? 'DISCOVERED' : 'UNEXPLORED'}</span><h3>${esc(b.name)}</h3><p>${esc(b.description)}</p><p>${b.temperature} °C · ${b.aquatic ? 'Aquatic' : 'Terrestrial'} · ${b.toxicity > 0.1 ? 'Toxic' : 'Low toxicity'}</p><button class="text-button" data-action="navigate-region" data-value="${r.id}">Travel toward this habitat ${icon('arrow')}</button>${r.sites
        .filter((s) => s.discovered)
        .map(
          (s) =>
            `<div class="site-row"><b>${esc(s.name)}</b><small>${s.investigated ? 'Investigated' : `${Math.round(distance(s, state.player))} units away`}</small>${s.investigated ? '' : `<button class="text-button" data-action="navigate-site" data-value="${s.id}">Approach</button><button class="text-button" data-action="investigate" data-value="${s.id}">Investigate</button>`}</div>`,
        )
        .join('')}</div></article>`;
    })
    .join('')}</div>`;
}
