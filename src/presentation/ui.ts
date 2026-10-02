import { buildFeedback } from './build-feedback';
import { DEFAULT_KEYS, type KeyBindings } from '../core/controls';
import { startOptions } from './replay-ui';
import type { GameState, Genome, Stats } from '../core/types';
import { phenotype, mutatedGenome, dietFor } from '../biology/body';
import { mutationReason, previewMutation } from '../biology/mutation';
import { lineagePopulation } from '../biology/reproduction';
import {
  MUTATIONS,
  mutationById,
  ORGANS,
  organById,
  SPECIES,
  RESOURCES,
  TUNING,
} from '../data/content';
import { icon, escapeHtml as esc } from './icons';

export function shell() {
  return `<header class="topbar">
    <a class="brand" href="#" data-action="view" data-value="habitat" aria-label="Lifeform home">${icon('cell')}<span>LIFEFORM<small>AN EVOLUTIONARY SANDBOX</small></span></a>
    <nav class="navigation" aria-label="Main navigation">
      ${[
        ['habitat', 'habitat', 'Habitat'],
        ['creature', 'cell', 'Creature'],
        ['lineage', 'branch', 'Lineage'],
        ['discovery', 'book', 'Discoveries'],
        ['society', 'habitat', 'Society'],
      ]
        .map(
          ([id, i, label]) =>
            `<button data-action="view" data-value="${id}" class="nav-button ${id === 'habitat' ? 'active' : ''}">${icon(i)}<span>${label}</span></button>`,
        )
        .join('')}
    </nav>
    <div class="top-actions"><span class="save-status" id="save-status">Autosave enabled</span><button class="icon-button" data-action="save" title="Save lineage" aria-label="Save lineage">${icon('save')}</button><button class="icon-button" data-action="help" title="How to play" aria-label="How to play">${icon('help')}</button><button class="icon-button" data-action="settings" title="Settings" aria-label="Settings">${icon('settings')}</button></div>
  </header>
  <main class="app-content">
    <section class="chapter-bar"><div class="intro"><div class="chapter-emblem">01</div><div><div class="eyebrow">CHAPTER 01 / BIOLOGY</div><h1>The first spark</h1></div></div><ol class="era-track" aria-label="Evolutionary eras">${[
      ['biology', '01', 'Origin'],
      ['intelligence', '02', 'Intelligence'],
      ['tribal', '03', 'Society'],
      ['civilization', '04', 'Civilization'],
      ['industrial', '05', 'Industry'],
      ['space', '06', 'Beyond'],
    ]
      .map(
        ([era, number, label]) =>
          `<li data-era="${era}"><span>${number}</span><b>${label}</b><i></i></li>`,
      )
      .join(
        '',
      )}</ol><div class="world-summary"><span class="live-label"><span class="tiny-dot"></span> LIVING WORLD</span><div><span id="world-age">00:00</span><span class="divider">·</span><span id="total-species">10 species</span></div></div></section>
    <div class="game-layout">
      <aside class="organism-panel panel" aria-label="Creature status"><div class="character-header"><div class="specimen"><canvas id="specimen" data-preview="current" aria-label="Your organism and its installed organs"></canvas></div><div class="organism-name"><span class="generation" id="generation">GEN 01</span><h2 id="lineage-name">Velari</h2><span id="organism-subtitle">A small beginning</span></div></div><div class="vitals"><div class="vital-label"><span>${icon('heart')} Health</span><b id="health-value">70 / 70</b></div><div class="meter health"><span id="health-bar"></span></div><div class="vital-label"><span>${icon('bolt')} Energy</span><b id="energy-value">82 / 100</b></div><div class="meter energy"><span id="energy-bar"></span></div><div class="small-stat"><span id="hunger-value">Satiated</span><span><span id="stamina-value">100%</span> stamina</span></div></div><div class="lineage-mini"><div>${icon('branch')}<span>Living relatives</span><strong id="population-value">1</strong></div></div><details class="creature-details"><summary>Creature details ${icon('plus')}</summary><span class="specimen-caption">PRIMORDIAL ORGANISM</span><div class="small-stat"><span>Age</span><span id="age-value">0 seconds</span></div><div class="body-summary" id="body-summary"></div><p id="lineage-hint">One life. A thousand possibilities.</p><button class="text-button blueprint-button" data-action="view" data-value="creature">Inspect your biology ${icon('arrow')}</button></details></aside>
      <section class="habitat-panel panel" id="habitat-panel" aria-label="Playable habitat">
        <div class="habitat-heading"><div><span class="tiny-dot"></span><h2>Primordial shallows</h2><span class="habitat-tag">HOME</span></div><button class="icon-button" data-action="map" aria-label="Open world map" title="World map">${icon('map')}</button></div>
        <div class="world-stage" id="world-stage"><canvas id="world" tabindex="0" aria-label="Living world. Move with WASD or arrow keys, or click a destination. Space eats or attacks. Shift sprints."></canvas><div class="environment-badge" id="environment-badge">${icon('sun')}<span>Gentle waters<small>A good place to begin</small></span></div><div class="mobile-vitals" aria-label="Current health and energy"><div>${icon('heart')}<span class="mini-meter"><i id="mobile-health"></i></span><b id="mobile-health-value">70</b></div><div>${icon('bolt')}<span class="mini-meter"><i id="mobile-energy"></i></span><b id="mobile-energy-value">82</b></div><div title="Sprint stamina">${icon('wave')}<span class="mini-meter"><i id="mobile-stamina"></i></span><b id="mobile-stamina-value">100</b></div></div><div class="world-tools"><button class="icon-button" data-action="zoom-in" aria-label="Zoom in">${icon('plus')}</button><button class="icon-button" data-action="zoom-out" aria-label="Zoom out">${icon('minus')}</button><button class="icon-button" data-action="vision" aria-label="Toggle perception radius" title="Perception radius">${icon('eye')}</button></div><button class="minimap" data-action="map" aria-label="Open explored world map"><span>N</span><canvas id="minimap" width="156" height="116"></canvas><small>WORLD MAP ${icon('expand')}</small></button><div id="welcome" class="welcome-card"><span class="welcome-emblem">${icon('cell')}</span><span class="eyebrow">YOUR EVOLUTION STARTS HERE</span><h3>Small creature.<br><em>Big adventure.</em></h3><p>Eat. Evolve. Leave a lineage.<br>We’ll guide you one discovery at a time.</p><button class="primary-button" data-action="begin">Begin your lineage ${icon('arrow')}</button><span class="welcome-controls">${icon('map')} Click to move · WASD also works</span></div><div id="paused-badge" class="paused-badge" hidden><span>WORLD PAUSED</span><button class="text-button" data-action="pause">Resume ${icon('play')}</button></div><div class="touch-controls"><div id="joystick" class="joystick" aria-label="Virtual movement joystick"><span></span></div><button id="touch-action" class="touch-action" aria-label="Eat or attack">${icon('jaw')}</button><button id="touch-sprint" class="touch-sprint" aria-label="Hold to sprint">${icon('bolt')}</button></div><div class="field-tip" id="field-tip" hidden>Click anywhere to swim. Follow the marked food.</div><div id="event-banner" class="event-banner" role="status" hidden></div></div>
        <div class="world-controlbar"><div class="time-controls"><button class="icon-button" data-action="pause" id="pause-button" aria-label="Pause or resume">${icon('play')}</button><button class="speed-button active" data-action="speed" data-value="1">1×</button><button class="speed-button" data-action="speed" data-value="2">2×</button><button class="speed-button" data-action="speed" data-value="4">4×</button></div><span class="control-hint"><kbd>W A S D</kbd> move <span>·</span> <kbd>SPACE</kbd> eat / attack</span><span class="control-hint mobile-hint">Tap the water to swim</span><button class="text-button" data-action="help">Controls ${icon('help')}</button></div>
        <div class="mobile-quickbar"><button data-action="choose-adaptation">${icon('cell')} Adapt your body</button><button data-action="reproduce" aria-label="Reproduce offspring">${icon('branch')} Reproduce</button></div>
      </section>
      <section id="secondary-panel" class="secondary-panel panel" hidden></section>
      <aside class="evolution-panel"><section class="objective-card" aria-label="Current quest"><div class="quest-heading"><span class="quest-symbol">${icon('book')}</span><div><span class="eyebrow">YOUR NEXT MOVE</span><span id="quest-number" class="quest-number">FIRST STEPS · 01 / 03</span></div><span class="quest-status" id="quest-status">ACTIVE</span></div><h3 id="objective-title">Find your first meal</h3><p id="objective-detail">Follow the marked food. You eat automatically when close enough.</p><div class="quest-progress"><span id="quest-progress-text">0 / 1 food eaten</span><div class="meter"><span id="quest-progress-bar"></span></div></div><button id="quest-action" class="primary-button quest-action" data-action="quest">Show me food ${icon('arrow')}</button><p class="quest-reward" id="quest-reward">Food gives you energy and biomass.</p><div class="objective-steps" aria-label="First steps"><span id="goal-food">01 <b>Eat</b></span><i></i><span id="goal-adapt">02 <b>Evolve</b></span><i></i><span id="goal-birth">03 <b>Multiply</b></span></div></section><div class="panel evolution-inner"><div class="currency-row"><span title="Spend evolution points on adaptations">${icon('cell')} <strong id="mutation-points">1</strong><small>POINTS</small></span><span title="Collect biomass by eating">${icon('drop')}<strong id="biomass-value">6</strong><small>BIOMASS</small></span></div><details class="quick-adaptations"><summary>Available adaptations ${icon('plus')}</summary><div id="mutation-cards"></div></details><button class="text-button all-adaptations" data-action="mutations">Explore all adaptations <span>${MUTATIONS.length}</span>${icon('arrow')}</button></div></aside>
    </div>
    <footer class="bottom-bar"><div class="latest-event">${icon('book')}<span id="latest-event">Your adventure is waiting.</span></div><div class="action-dock" aria-label="Gameplay actions"><button class="dock-button" id="bite-button" aria-label="Hold to eat or attack"><span class="dock-icon">${icon('jaw')}</span><span>Bite<small>HOLD / SPACE</small></span></button><button class="dock-button evolve-button" data-action="choose-adaptation"><span class="dock-icon">${icon('cell')}</span><span>Evolve<small id="evolve-hint">CHOOSE AN UPGRADE</small></span><i id="evolve-ready" class="dock-notification" hidden></i></button><button class="dock-button reproduce-button" data-action="reproduce"><span class="dock-icon">${icon('branch')}</span><span>Reproduce<small id="birth-cost">10 biomass</small></span></button><button class="dock-button" data-action="map"><span class="dock-icon">${icon('map')}</span><span>Explore<small>WORLD MAP</small></span></button></div><div class="footnote"><button data-action="world-settings" class="seed-button">SEED <span id="seed-label">FIRST-LIGHT</span></button>${import.meta.env.DEV ? '<button data-action="debug" class="seed-button">DEVELOPER TOOLS</button>' : ''}</div></footer>
  </main><div id="toast" role="status" aria-live="polite" hidden></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog><input type="file" id="import-file" accept="application/json,.json" hidden />`;
}
export function mutationCard(s: GameState, id: string, compact = false) {
  const m = mutationById[id],
    installed = s.player.genome.mutations.includes(id),
    reason = mutationReason(s, id);
  return `<button class="mutation-card ${compact ? 'compact' : ''} ${installed ? 'installed' : ''} ${reason && !installed ? 'unavailable' : ''}" data-action="mutation-preview" data-value="${id}"><span class="mutation-icon ${m.category.toLowerCase()}">${icon(m.icon)}</span><span class="mutation-copy"><span class="mutation-category">${esc(m.category)} ${installed ? '· ADAPTED' : !reason ? '· READY' : '· PREVIEW'}</span><strong>${esc(m.name)}</strong>${compact ? '' : `<span class="mutation-description">${esc(m.description)}</span>`}<span class="mutation-benefit">${esc(m.benefit)}</span><span class="mutation-tradeoff">${esc(m.tradeoff)}</span><span class="mutation-cost">${installed ? 'Installed in your body' : `${m.cost} point${m.cost === 1 ? '' : 's'} · ${m.biomass} biomass`}</span></span><span class="mutation-chevron">${icon(installed ? 'check' : 'arrow')}</span></button>`;
}
export function suggestedMutations(s: GameState) {
  const available = MUTATIONS.filter(
    (m) =>
      !s.player.genome.mutations.includes(m.id) &&
      m.requires.every((x) => s.player.genome.mutations.includes(x)) &&
      !m.excludes.some((x) => s.player.genome.mutations.includes(x)),
  ).sort((a, b) => Number(!!mutationReason(s, a.id)) - Number(!!mutationReason(s, b.id)));
  return (
    available
      .slice(0, 3)
      .map((m) => mutationCard(s, m.id, true))
      .join('') ||
    '<p class="empty-message">Your body has found its own path. Inspect your biology to reshape it.</p>'
  );
}
export function chooseAdaptationDialog(s: GameState) {
  return dialogFrame(
    'Choose your next adaptation',
    `<p class="dialog-intro">Pick a direction for your creature. Select a card to preview its body and tradeoffs before spending anything.</p><div class="adaptation-wallet">${icon('cell')} ${s.lineage.points} evolution points <span>·</span> ${Math.floor(s.lineage.biomass)} biomass</div><div class="recommended-adaptations">${suggestedMutations(s)}</div><button class="text-button" data-action="mutations">Explore all ${MUTATIONS.length} adaptations ${icon('arrow')}</button>`,
  );
}
export function bodySummary(genome: Genome) {
  const stats = phenotype(genome);
  return `<div class="section-heading"><span class="eyebrow">BIOLOGICAL BLUEPRINT</span><span>${genome.organs.length} organs</span></div><div class="organ-chips">${genome.organs.map((id) => `<span title="${esc(organById[id].description)}">${esc(organById[id].name)}</span>`).join('')}</div><div class="small-stat"><span>Body budget</span><span>${stats.mass} / ${TUNING.bodyBudget}</span></div><div class="meter mass"><span style="width:${(stats.mass / TUNING.bodyBudget) * 100}%"></span></div>`;
}
const statLabels: Partial<Record<keyof Stats, string>> = {
  health: 'Health',
  energy: 'Energy capacity',
  speed: 'Base movement speed',
  attack: 'Attack',
  defense: 'Defense',
  vision: 'Perception',
  mass: 'Body mass',
  metabolism: 'Energy use / sec',
  photosynthesis: 'Sun energy / sec',
  toxinResistance: 'Toxin resistance',
  venom: 'Venom',
  regeneration: 'Healing / sec',
  reproductionCost: 'Birth cost multiplier',
  offspringCount: 'Offspring per birth',
  growthTime: 'Maturation time / sec',
  swimming: 'Swimming',
  walking: 'Walking',
  flight: 'Flight',
  climbing: 'Climbing',
  lift: 'Lift',
  heatTolerance: 'Heat limit / °C',
  coldTolerance: 'Cold protection / °C',
  pressureTolerance: 'Pressure tolerance',
  oxygenEfficiency: 'Air efficiency',
  waterStorage: 'Water storage',
  immunity: 'Immunity',
  stealth: 'Stealth',
  smell: 'Smell',
  hearing: 'Hearing',
  intelligence: 'Intelligence',
  communication: 'Communication',
  manipulation: 'Manipulation',
  sociality: 'Sociality',
  memory: 'Memory',
  electricity: 'Electricity',
  projectile: 'Ranged reach',
  burrowing: 'Burrowing',
};
export function statGrid(stats: Stats, before?: Stats, essentials = false) {
  return `<div class="stat-grid">${(Object.keys(statLabels) as (keyof Stats)[])
    .filter(
      (k) =>
        (!before &&
          (!essentials ||
            ['health', 'energy', 'speed', 'attack', 'defense', 'vision', 'mass'].includes(k))) ||
        (before &&
          (stats[k] !== before[k] ||
            (essentials &&
              [
                'health',
                'energy',
                'speed',
                'attack',
                'defense',
                'vision',
                'mass',
                'metabolism',
                'heatTolerance',
                'coldTolerance',
                'swimming',
                'flight',
                'climbing',
              ].includes(k)))),
    )
    .map(
      (k) =>
        `<div><span>${statLabels[k]}</span><strong>${before ? `<small>${formatStat(before[k])} → </small>` : ''}${formatStat(stats[k])}${before && stats[k] !== before[k] ? `<em class="stat-delta">${stats[k] > before[k] ? '+' : ''}${formatStat(stats[k] - before[k])}${before[k] !== 0 ? ` (${Math.round(((stats[k] - before[k]) / Math.abs(before[k])) * 100)}%)` : ''}</em>` : ''}</strong></div>`,
    )
    .join('')}</div>`;
}
const formatStat = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));
export function mutationDialog(s: GameState, id: string, treeGoal = '') {
  const m = mutationById[id],
    returnToTree = `<button class="text-button" data-action="mutation-tree" data-value="${esc(treeGoal || id)}">${treeGoal ? 'Back to evolution tree' : 'Show prerequisite tree'} ${icon('branch')}</button>`,
    preview = previewMutation(s, id),
    reason = mutationReason(s, id);
  return dialogFrame(
    m.name,
    `<div class="mutation-detail"><canvas class="mutation-preview-canvas" data-preview="${id}" aria-label="Preview organism after mutation"></canvas><div><span class="eyebrow">${esc(m.category)} ADAPTATION</span><p>${esc(m.description)}</p><p class="mutation-benefit">${esc(m.benefit)}</p><p class="mutation-tradeoff">${esc(m.tradeoff)}</p></div></div>${statGrid(preview.after, preview.before)}<div class="dialog-note">Body mass: ${preview.after.mass} / ${TUNING.bodyBudget}. Offspring inherit this adaptation; existing relatives keep their own genomes.</div>${reason ? `<p class="requirement">${esc(reason)}</p>` : ''}<button class="primary-button wide" data-action="mutate" data-value="${id}" ${reason ? 'disabled' : ''}>${icon('branch')} Adapt · ${m.cost} point + ${m.biomass} biomass</button><details class="advanced-section"><summary>Habitat suitability &amp; body analysis ${icon('plus')}</summary>${buildFeedback(s, s.player.genome, mutatedGenome(s.player.genome, id))}</details>${returnToTree}`,
  );
}
export function adaptationsDialog(s: GameState) {
  return dialogFrame(
    'What could you become?',
    `<p class="dialog-intro">${MUTATIONS.length} adaptations. Branching possibilities. Every advantage asks something of your body.</p><button class="secondary-button evolution-tree-entry" data-action="mutation-tree">Explore the evolution tree ${icon('branch')}</button><label class="field-label" for="mutation-search">FIND AN ADAPTATION</label><input id="mutation-search" type="search" placeholder="Search organs, benefits or categories" /><div class="mutation-gallery">${MUTATIONS.map((m) => mutationCard(s, m.id, true)).join('')}</div>`,
    'wide-dialog',
  );
}
export function creatureView(s: GameState) {
  const stats = phenotype(s.player.genome);
  return `<div class="view-heading"><span class="eyebrow">THE CREATURE IS THE CHARACTER</span><h2>Your biological blueprint.</h2><p>Every organ changes how you live. Every body has its limits.</p></div><div class="creature-overview"><canvas data-preview="current" aria-label="Current body configuration"></canvas><div><h3>${esc(s.lineage.name)}</h3><p>${dietFor(s.player.genome).join(' · ')}</p><span class="pill">${stats.mass} / ${TUNING.bodyBudget} body mass</span><span class="pill">${s.player.genome.organs.length} organs</span></div></div>${statGrid(stats, undefined, true)}<details class="advanced-section"><summary>All creature stats ${icon('plus')}</summary>${statGrid(stats)}</details><h3 class="subheading">Installed organs <span>${s.player.genome.organs.length} / ${ORGANS.length} types</span></h3><div class="organ-list">${s.player.genome.organs.map((id) => `<div>${icon('cell')}<span><b>${organById[id].name}</b><small>${organById[id].description}</small></span></div>`).join('')}</div><h3 class="subheading">Your adaptations</h3>${s.player.genome.mutations.length ? `<p class="muted">Removing an adaptation frees its body budget. Rebuilding uses a new mutation point.</p>${s.player.genome.mutations.map((id) => `<div class="adaptation-row"><span>${esc(mutationById[id].name)}</span><button class="text-button" data-action="remove-mutation" data-value="${id}">Remove ${icon('minus')}</button></div>`).join('')}` : '<p class="empty-message">A simple body with an unwritten future. Choose your first adaptation.</p>'}<button class="primary-button" data-action="mutations">Explore adaptations ${icon('arrow')}</button>`;
}
export function lineageView(s: GameState) {
  const generations = [...new Set(s.lineage.archive.map((a) => a.generation))].sort(
    (a, b) => a - b,
  );
  return `<div class="view-heading"><span class="eyebrow">THE HISTORY OF THE ${esc(s.lineage.name.toUpperCase())}</span><h2>One life becomes many.</h2><p>An individual may die. The story can go on.</p></div><div class="lineage-stats"><div><strong>${lineagePopulation(s)}</strong><span>living relatives</span></div><div><strong>${Math.max(...generations)}</strong><span>generations</span></div><div><strong>${s.lineage.legacy}</strong><span>legacy marks</span></div></div><button class="secondary-button evolution-tree-entry" data-action="species-tree">Explore the species tree ${icon('branch')}</button><div class="family-tree">${generations
    .map(
      (g) =>
        `<div class="generation-row"><span class="eyebrow">GEN ${String(g).padStart(2, '0')}</span><div>${s.lineage.archive
          .filter((a) => a.generation === g)
          .map((a) => {
            const living = s.creatures.find((c) => c.id === a.id);
            return `<article class="ancestor ${a.id === s.player.id ? 'current' : ''} ${a.died !== null ? 'deceased' : ''}">${icon('cell')}<b>${a.id === s.player.id ? 'You are here' : a.died !== null ? 'An ancestor' : living?.juvenile ? 'Growing offspring' : 'Living relative'}</b><small>${a.genome.mutations.length} adaptations · ${a.parent ? `child of ${esc(a.parent)}` : 'first ancestor'}</small>${a.died !== null ? `<small>${esc(a.cause ?? '')}</small>` : living ? `<button class="text-button" data-action="inherit" data-value="${a.id}" ${living.juvenile > 0 ? 'disabled' : ''}>${living.juvenile > 0 ? `Matures in ${Math.ceil(living.juvenile)}s` : 'Continue as this individual'} ${icon('arrow')}</button>` : '<span class="tiny-label">GUIDING THIS LIFE</span>'}</article>`;
          })
          .join('')}</div></div>`,
    )
    .join('')}</div><h3 class="subheading">A journal, written by life</h3><div class="journal">${[
    ...s.history,
  ]
    .reverse()
    .slice(0, 60)
    .map(
      (h) =>
        `<article><span class="journal-icon">${icon(h.type === 'birth' || h.type === 'inheritance' ? 'branch' : h.type === 'mutation' ? 'cell' : h.type === 'environment' ? 'sun' : 'book')}</span><div><span class="tiny-label">${timeLabel(h.time)} · GENERATION ${h.generation}</span><h4>${esc(h.title)}</h4><p>${esc(h.detail)}</p></div></article>`,
    )
    .join(
      '',
    )}</div>${s.legacies.length ? `<h3 class="subheading">Earlier lineages</h3>${s.legacies.map((l) => `<div class="legacy-row"><b>${esc(l.name)}</b><span>${timeLabel(l.duration)} · peak ${l.peak} · ${l.adaptations.length} adaptations</span><small>${esc(l.cause)}</small><details><summary>Read this lineage archive · ${l.archive.length} individuals</summary><div class="legacy-history">${l.history.map((h) => `<p><b>${timeLabel(h.time)} ? ${esc(h.title)}</b><br>${esc(h.detail)}</p>`).join('') || '<p>This older save contains a summary only.</p>'}</div></details></div>`).join('')}` : ''}`;
}
export function discoveryView(s: GameState) {
  return `<div class="view-heading"><span class="eyebrow">A FIELD GUIDE TO YOUR WORLD</span><h2>Curiosity is an adaptation.</h2><p>Get close. Find out what lives here, and how everything connects.</p></div><h3 class="subheading">Life across the habitats <span>${s.discoveries.species.length} / ${SPECIES.length}</span></h3><div class="species-gallery">${SPECIES.map(
    (species) => {
      const known = s.discoveries.species.includes(species.id),
        pop = s.populations.find((p) => p.speciesId === species.id)!;
      return `<article class="species-card ${known ? '' : 'undiscovered'}"><span style="color:${species.color}">${icon(known ? 'cell' : 'help')}</span><div><span class="tiny-label">${known ? esc(species.epithet) : 'A LIFE STILL UNKNOWN'}</span><h3>${known ? esc(species.name) : 'An undiscovered organism'}</h3><p>${known ? esc(species.description) : 'Explore the shallows to encounter this species.'}</p>${known ? `<div class="small-stat"><span>Population ${pop.count}</span><span>${species.diet.join(' · ')}</span></div><small class="muted">${esc(pop.cause)}</small>` : ''}</div></article>`;
    },
  ).join(
    '',
  )}</div><h3 class="subheading">Food & resources <span>${s.discoveries.resources.length} / ${RESOURCES.length}</span></h3><div class="resource-gallery">${RESOURCES.map((r) => `<div><span class="resource-dot" style="background:${r.color}"></span><b>${s.discoveries.resources.includes(r.id) ? esc(r.name) : '???'}</b><small>${s.discoveries.resources.includes(r.id) ? `${r.energy} energy · ${r.biomass} biomass` : 'Consume to discover'}</small></div>`).join('')}</div><h3 class="subheading">The local food web</h3><div class="food-web">${['Sunlight', 'Algae & microbes', 'Grazers & filter feeders', 'Predators', 'Scavengers & detritus'].map((name, i) => `<span>${name}</span>${i < 4 ? icon('arrow') : ''}`).join('')}</div><p class="muted">Carrion becomes detritus. Food shortages affect grazers first, then their predators. You are part of this cycle.</p>`;
}
export function dialogFrame(title: string, body: string, className = '') {
  return `<div class="dialog-content ${className}"><div class="dialog-heading"><h2 id="dialog-title">${esc(title)}</h2><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon('close')}</button></div>${body}</div>`;
}
export function settingsDialog(s: GameState) {
  return dialogFrame(
    'Make yourself at home.',
    `<p class="dialog-intro">The world pauses while you’re here.</p><div class="settings-list">${[
      ['reducedMotion', 'Reduced motion', 'Keep the water and cellular animation still.'],
      ['particles', 'Ambient particles', 'Tiny details in the water.'],
      [
        'sound',
        'Biological sounds',
        'Cues for food, hunger, movement, danger, birth and milestones.',
      ],
      ['vibration', 'Vibration', 'Brief biological feedback on supported devices.'],
      ['textScale', 'Larger text', 'Give labels and descriptions more room.'],
      ['leftHanded', 'Left-handed controls', 'Swap the joystick and action buttons.'],
    ]
      .map(
        ([key, name, help]) =>
          `<label><span><b>${name}</b><small>${help}</small></span><input type="checkbox" data-setting="${key}" ${s.settings[key as keyof typeof s.settings] ? 'checked' : ''} /></label>`,
      )
      .join(
        '',
      )}<label><span><b>Control style</b><small>Hybrid and touch modes automatically eat nearby food.</small></span><select data-setting="control" aria-label="Control style"><option value="hybrid" ${s.settings.control === 'hybrid' ? 'selected' : ''}>Hybrid</option><option value="direct" ${s.settings.control === 'direct' ? 'selected' : ''}>Direct + action</option><option value="touch" ${s.settings.control === 'touch' ? 'selected' : ''}>Tap to move</option></select></label></div><h3 class="subheading">Your keyboard</h3><form id="keybindings-form"><div class="body-editor">${Object.keys(
      DEFAULT_KEYS,
    )
      .map(
        (k) =>
          `<label>${k}<input name="${k}" maxlength="10" value="${esc((s.settings.keys ?? DEFAULT_KEYS)[k as keyof KeyBindings] === ' ' ? 'space' : (s.settings.keys ?? DEFAULT_KEYS)[k as keyof KeyBindings])}" /></label>`,
      )
      .join(
        '',
      )}</div><button class="secondary-button" type="submit">Save keyboard controls</button></form><h3 class="subheading">Your lineage, kept safe</h3><p class="muted">Autosaves stay in this browser. Export a copy to carry your world elsewhere.</p><div class="button-row"><button class="secondary-button" data-action="export">Export save</button><button class="secondary-button" data-action="import">Import save</button><button class="text-button" data-action="world-settings">World seed ${icon('arrow')}</button></div>`,
  );
}
export function helpDialog() {
  return dialogFrame(
    'A small guide to staying alive.',
    `<div class="help-steps"><article><b>01</b><div><h3>Follow your appetite.</h3><p>Use WASD, arrow keys, the touch joystick, or tap a destination. Glowing food fits your diet. Hybrid controls eat automatically; Space or the bite button also eats or attacks.</p></div></article><article><b>02</b><div><h3>Let your body change.</h3><p>Eat four foods, discover a species, or explore four territories to earn mutation points. Preview the benefits, energy costs, and body mass before adapting. Incompatible branches make each body distinct.</p></div></article><article><b>03</b><div><h3>Leave something living.</h3><p>At age 12 seconds, with enough energy and biomass, reproduce. Your offspring inherit your current body and mature in 30 seconds. Keep them fed and away from predators.</p></div></article><article><b>04</b><div><h3>Keep the story going.</h3><p>If you die, control passes to a living relative. The lineage screen also lets you switch to a mature relative. If nobody survives, your legacy remains for the next beginning.</p></div></article></div><div class="keyboard-guide"><span><kbd>WASD / ↑↓←→</kbd> Move</span><span><kbd>SPACE</kbd> Eat / attack</span><span><kbd>SHIFT</kbd> Sprint</span><span><kbd>P</kbd> Pause</span><span><kbd>R</kbd> Reproduce</span></div><p class="dialog-note">Menus and hidden browser tabs pause the world. In direct mode, use Space or the bite button to feed. You can select a control style in Settings.</p><button class="primary-button wide" data-action="close-dialog">Back to the shallows ${icon('arrow')}</button>`,
  );
}
export function worldSettingsDialog(s: GameState) {
  return dialogFrame(
    'Another beginning.',
    `<p class="dialog-intro">A seed creates a reproducible world. Starting again retires this living world into your legacy; export it first if you want to return.</p><form id="new-world-form"><label class="field-label" for="world-seed">WORLD SEED</label><input id="world-seed" name="seed" type="text" maxlength="80" value="${esc(s.seed)}" required autocomplete="off" />${startOptions(s)}<div class="button-row"><button class="secondary-button" type="button" data-action="export">Export current world</button><button class="primary-button" type="submit">Start a new lineage ${icon('arrow')}</button></div></form>`,
  );
}
export function extinctionDialog(s: GameState) {
  return dialogFrame(
    'A life ends. A story remains.',
    `<div class="extinction-art">${icon('branch')}</div><p class="dialog-intro">The last ${esc(s.lineage.name)} has died. Your genetic discoveries and ${s.lineage.legacy} legacy marks are preserved.</p><div class="lineage-stats"><div><strong>${s.lineage.peak}</strong><span>peak population</span></div><div><strong>${s.discoveries.mutations.length}</strong><span>adaptations found</span></div><div><strong>${timeLabel(s.time)}</strong><span>world time</span></div></div><p class="dialog-note">Cause: ${esc(s.legacies.at(-1)?.cause ?? 'Unknown')}. Reproduce early to give the next individual a chance to carry your lineage onward.</p><button class="primary-button wide" data-action="world-settings">Begin another lineage ${icon('arrow')}</button><button class="text-button wide" data-action="view" data-value="lineage">Read your history</button>`,
  );
}
export function timeLabel(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}
export function previewGenome(s: GameState, value: string): Genome {
  if (value.startsWith('branch:'))
    return s.evolution.branches.find((b) => b.id === value.slice(7))?.genome ?? s.player.genome;
  return value === 'current' ? s.player.genome : mutatedGenome(s.player.genome, value);
}
