import { archetypes } from './biology/archetype';
import { DEBUG_LAYERS } from './presentation/debug-overlay';
import { activePressure } from './world/pressures';
import { DEFAULT_KEYS, validBindings } from './core/controls';
import './style.css';
import './presentation/theme.css';
import './presentation/graphs.css';
import { mutationTreePanel, speciesTreePanel, branchDetailPanel } from './presentation/graphs';
import { createGame } from './world/generation';
import { Simulation, emptyInput } from './simulation/ecosystem';
import { phenotype } from './biology/body';
import { applyMutation, removeMutation } from './biology/mutation';
import {
  reproduce,
  reproductionReason,
  inheritControl,
  lineagePopulation,
} from './biology/reproduction';
import { saveGame, loadGame, encodeSave, decodeSave } from './core/save';
import { debugCommand } from './core/debug';
import { legacyRecord, record } from './core/history';
import { TUNING } from './data/content';
import type { GameState, ActionResult, Settings } from './core/types';
import { WorldRenderer } from './presentation/world';
import { drawPreview } from './presentation/creature';
import { AudioFeedback } from './presentation/audio';
import { icon, escapeHtml as esc } from './presentation/icons';
import * as ui from './presentation/ui';
import * as evolutionUI from './presentation/evolution-ui';
import * as replayUI from './presentation/replay-ui';
import * as replay from './progression/replay';
import * as societyUI from './presentation/society-ui';
import * as society from './society/society';
import * as space from './space/space';
import { spacePanel } from './presentation/space-ui';
import type { MissionKind } from './space/types';
import { buildNest, stockNest, speciate } from './progression/lineage';
import { investigate, climate, regionAt } from './world/regions';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = ui.shell();
const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let storage: Storage | null = null;
try {
  storage = window.localStorage;
} catch {
  /* export remains available */
}
const loaded = storage
  ? loadGame(storage)
  : {
      state: null,
      warning: 'Browser storage is unavailable. Export a save to keep your progress.',
    };
let sim = new Simulation(loaded.state ?? createGame());
const renderer = new WorldRenderer(get<HTMLCanvasElement>('world'), sim.state);
const audio = new AudioFeedback();
const input = emptyInput();
const dialog = get<HTMLDialogElement>('dialog');
const keys = new Set<string>();
let started = false,
  paused = false,
  speed = 1,
  view = 'habitat',
  stageVisible = true;
let saveProtected = !!loaded.warning && !loaded.state;
let toastTimeout = 0,
  lastPanels = '',
  lastEventId = 0,
  lastFood = 0,
  lastDeath = 0;
let lastAudioCue = -10;
let bannerTimeout = 0;
let previousFrame = performance.now(),
  accumulator = 0,
  uiElapsed = 0,
  autosaveElapsed = 0;
let extinctionShown = sim.state.lineage.extinct;
let lastStepMs = 0,
  maxStepMs = 0;

function running() {
  return (
    started &&
    !paused &&
    view === 'habitat' &&
    stageVisible &&
    !dialog.open &&
    !document.hidden &&
    !sim.state.lineage.extinct
  );
}
function notify(message: string, error = false) {
  const toast = get('toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.hidden = false;
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => (toast.hidden = true), error ? 9000 : 5000);
}
function showDialog(html: string) {
  dialog.innerHTML = html;
  if (!dialog.open) dialog.showModal();
  clearControls();
  // Updating an open dialog should also place keyboard focus inside its new content.
  dialog.querySelector<HTMLButtonElement>('button')?.focus();
}
function result(action: ActionResult, sound?: 'mutation' | 'birth') {
  notify(action.message, !action.ok);
  if (action.ok) {
    if (sound && sim.state.settings.sound) audio.play(sound);
    if (sound && sim.state.settings.vibration) navigator.vibrate?.(35);
    sim.refresh();
    refreshPanels(true);
    save();
  }
}
function save() {
  if (saveProtected) {
    notify(
      'The unreadable save is protected. Export this world, or start a new lineage explicitly before replacing it.',
      true,
    );
    return;
  }
  if (!storage) {
    notify('Browser storage is unavailable. Export a save file to keep your progress.', true);
    return;
  }
  const saved = saveGame(sim.state, storage);
  get('save-status').textContent = saved.ok ? 'Lineage saved' : 'Save unavailable';
  if (!saved.ok) notify(saved.message, true);
}
function clearControls() {
  keys.clear();
  input.x = 0;
  input.y = 0;
  input.action = false;
  input.sprint = false;
  input.target = null;
  renderer.target = null;
  stickX = 0;
  stickY = 0;
  touchAction = false;
  touchSprint = false;
  (get('joystick').firstElementChild as HTMLElement).style.transform = '';
}
function setView(next: string) {
  if (!['habitat', 'creature', 'lineage', 'discovery', 'society'].includes(next)) return;
  view = next;
  clearControls();
  if (dialog.open) dialog.close();
  get('habitat-panel').hidden = view !== 'habitat';
  get('secondary-panel').hidden = view === 'habitat';
  document.querySelectorAll<HTMLButtonElement>('.nav-button').forEach((b) => {
    b.classList.toggle('active', b.dataset.value === view);
    b.setAttribute('aria-current', b.dataset.value === view ? 'page' : 'false');
  });
  refreshPanels(true);
}
function refreshPanels(force = false) {
  const s = sim.state;
  const key = `${s.player.id}:${s.player.genome.mutations.join(',')}:${s.lineage.points}:${Math.floor(s.lineage.biomass)}:${s.history.at(-1)?.id}:${view}`;
  if (!force && key === lastPanels) return;
  lastPanels = key;
  get('body-summary').innerHTML = ui.bodySummary(s.player.genome);
  get('mutation-cards').innerHTML = ui.suggestedMutations(s);
  if (view !== 'habitat')
    get('secondary-panel').innerHTML =
      view === 'creature'
        ? ui.creatureView(s) + evolutionUI.geneticsPanel(s) + replayUI.adaptivePanel(s)
        : view === 'lineage'
          ? ui.lineageView(s) + evolutionUI.branchesPanel(s)
          : view === 'society'
            ? societyUI.societyView(s)
            : ui.discoveryView(s) + replayUI.replayPanel(s);
}
function updateHud() {
  const s = sim.state,
    p = s.player,
    stats = phenotype(p.genome);
  const caption = document.querySelector('.specimen-caption');
  if (caption) caption.textContent = archetypes(p.genome).join(' / ') || 'PRIMORDIAL ORGANISM';
  get('generation').textContent = `GEN ${String(p.generation).padStart(2, '0')}`;
  get('lineage-name').textContent = s.lineage.name;
  get('organism-subtitle').textContent =
    p.poison > 0
      ? `Venom ? ${Math.ceil(p.poison)}s remaining`
      : p.juvenile > 0
        ? 'A new life, still growing'
        : p.genome.mutations.length === 0
          ? 'A small beginning'
          : `${p.genome.mutations.length} choices made you`;
  get('health-value').textContent = `${Math.ceil(p.health)} / ${stats.health}`;
  get('energy-value').textContent = `${Math.ceil(p.energy)} / ${stats.energy}`;
  get('health-bar').style.width = `${Math.max(0, (p.health / stats.health) * 100)}%`;
  get('energy-bar').style.width = `${(p.energy / stats.energy) * 100}%`;
  get('mobile-health').style.width = `${Math.max(0, (p.health / stats.health) * 100)}%`;
  get('mobile-energy').style.width = `${(p.energy / stats.energy) * 100}%`;
  get('mobile-health-value').textContent = `${Math.ceil(p.health)}`;
  get('mobile-energy-value').textContent = `${Math.ceil(p.energy)}`;
  get('hunger-value').textContent =
    p.energy / stats.energy > 0.6
      ? 'Satiated'
      : p.energy / stats.energy > 0.25
        ? 'An appetite'
        : p.energy > 0
          ? 'Hungry · find food'
          : 'Starving';
  get('hunger-value').classList.toggle('danger-text', p.energy / stats.energy < 0.25);
  get('stamina-value').textContent = `${Math.ceil(p.stamina)}%`;
  get('mobile-stamina').style.width = `${p.stamina}%`;
  get('mobile-stamina-value').textContent = `${Math.ceil(p.stamina)}`;
  get('age-value').textContent =
    `${Math.floor(p.age)} seconds${p.juvenile > 0 ? ' · juvenile' : ''}`;
  get('population-value').textContent = `${lineagePopulation(s)}`;
  get('lineage-hint').textContent =
    lineagePopulation(s) > 1
      ? 'The future has a little company.'
      : 'One life. A thousand possibilities.';
  const habitatTitle = document.querySelector('.habitat-heading h2');
  if (habitatTitle) habitatTitle.textContent = s.world.biome;
  const eraLabel = document.querySelector('.intro .eyebrow');
  if (eraLabel) eraLabel.textContent = s.society.era.toUpperCase() + ' / A CONTINUING LINEAGE';
  const eras = ['biology', 'intelligence', 'tribal', 'civilization', 'industrial', 'space'];
  const eraIndex = eras.indexOf(s.society.era);
  document.querySelectorAll<HTMLElement>('.era-track [data-era]').forEach((step) => {
    const index = eras.indexOf(step.dataset.era!);
    step.classList.toggle('reached', index <= eraIndex);
    if (index === eraIndex) step.setAttribute('aria-current', 'step');
    else step.removeAttribute('aria-current');
  });
  get('world-age').textContent = ui.timeLabel(s.time);
  get('mutation-points').textContent = `${s.lineage.points}`;
  get('biomass-value').textContent = `${Math.floor(s.lineage.biomass)}`;
  get('total-species').textContent = `${s.populations.filter((p) => p.count > 0).length} species`;
  get('seed-label').textContent = s.seed;
  get('latest-event').textContent = s.history.at(-1)?.title ?? 'A new beginning.';
  get('birth-cost').textContent =
    `${Math.ceil(TUNING.reproductionBiomass * stats.reproductionCost)} biomass`;
  const reason = reproductionReason(s);
  document.querySelectorAll<HTMLButtonElement>('[data-action="reproduce"]').forEach((button) => {
    button.classList.toggle('ready', !reason);
    button.title = reason ?? 'Create offspring that inherit your current body.';
  });
  get('pause-button').innerHTML = icon(running() ? 'pause' : 'play');
  get('pause-button').setAttribute('aria-label', running() ? 'Pause world' : 'Resume world');
  get('paused-badge').hidden = !started || running() || s.lineage.extinct;
  get('welcome').hidden = started || s.lineage.extinct;
  const pressure = activePressure(s);
  const local = climate(s, p);
  get('environment-badge').innerHTML =
    `${icon(local.biome.aquatic ? 'drop' : 'sun')}<span>${esc(pressure?.name ?? local.biome.name)}<small>${local.temperature.toFixed(0)} C / ${pressure ? `${Math.ceil(s.pressure!.remaining)}s remaining` : regionAt(s, p).name}</small></span>`;
  get('environment-badge').classList.toggle('pressure', !!pressure);
  document.body.classList.toggle('large-text', s.settings.textScale);
  document.body.classList.toggle('left-handed', s.settings.leftHanded);
  document.body.classList.toggle('reduced-motion', s.settings.reducedMotion);
  document.body.dataset.control = s.settings.control;
  const fed = s.telemetry.foodEaten > 0,
    adapted = p.genome.mutations.length > 0,
    born = s.telemetry.births > 0;
  get('goal-food').classList.toggle('complete', fed);
  get('goal-adapt').classList.toggle('complete', adapted);
  get('goal-birth').classList.toggle('complete', born);
  get('objective-title').textContent = !fed
    ? 'Find your first meal.'
    : !adapted
      ? 'Choose a new possibility.'
      : !born
        ? 'Leave a new generation.'
        : 'See how far life can go.';
  get('objective-detail').textContent = !fed
    ? 'Swim toward the glowing algae. Every small discovery opens a new possibility.'
    : !adapted
      ? 'Use your mutation points. Preview a new organ, and feel the difference it makes.'
      : !born
        ? 'Gather 10 biomass, grow for 12 seconds, and reproduce. Protect your young as they grow.'
        : 'Explore new habitats, adapt to their pressures, and establish a new species branch.';
  refreshPanels();
  if ((s.history.at(-1)?.id ?? 0) > lastEventId) {
    const last = s.history.at(-1)!;
    if (started && ['inheritance', 'environment', 'opportunity'].includes(last.type))
      notify(last.title);
    if (started && ['milestone', 'travel', 'environment'].includes(last.type)) {
      if (s.settings.sound)
        audio.play(
          last.type === 'milestone' ? 'milestone' : last.type === 'travel' ? 'travel' : 'danger',
        );
      if (s.settings.vibration) navigator.vibrate?.(last.type === 'milestone' ? [40, 60, 40] : 40);
      if (last.type === 'milestone') {
        const banner = get('event-banner');
        banner.textContent = last.title;
        banner.hidden = false;
        window.clearTimeout(bannerTimeout);
        bannerTimeout = window.setTimeout(() => (banner.hidden = true), 6000);
      }
    }
    lastEventId = s.history.at(-1)?.id ?? 0;
  }
  if (s.settings.sound && s.telemetry.foodEaten > lastFood) audio.play('food');
  if (s.settings.sound && s.telemetry.deaths > lastDeath) audio.play('death');
  if (s.settings.sound && running() && s.time - lastAudioCue > 4) {
    const nearby = s.creatures.find(
      (c) =>
        c.speciesId !== 'player' &&
        phenotype(c.genome).attack > 8 &&
        Math.hypot(c.x - p.x, c.y - p.y) < 180,
    );
    const food = s.resources.some((r) => r.active && Math.hypot(r.x - p.x, r.y - p.y) < 100);
    const cue =
      p.health < stats.health * 0.3
        ? 'heartbeat'
        : p.energy < stats.energy * 0.25
          ? 'hunger'
          : nearby
            ? 'predator'
            : food
              ? 'nearby-food'
              : Math.hypot(input.x, input.y) > 0.1
                ? 'movement'
                : null;
    if (cue) {
      audio.play(cue);
      lastAudioCue = s.time;
    }
  }
  lastFood = s.telemetry.foodEaten;
  lastDeath = s.telemetry.deaths;
  if (s.lineage.extinct && !extinctionShown) {
    extinctionShown = true;
    save();
    showDialog(ui.extinctionDialog(s));
  }
}

app.addEventListener('click', (event) => {
  const button = (event.target as Element).closest<HTMLElement>('[data-action]');
  if (!button || (button instanceof HTMLButtonElement && button.disabled)) return;
  event.preventDefault();
  const action = button.dataset.action,
    value = button.dataset.value ?? '';
  switch (action) {
    case 'begin':
      if (!started) {
        sim.state.telemetry.sessions = (sim.state.telemetry.sessions ?? 0) + 1;
        record(
          sim.state,
          'session',
          'A new observation begins',
          'The lineage returns to the living world.',
        );
      }
      started = true;
      paused = false;
      get<HTMLCanvasElement>('world').focus({ preventScroll: true });
      break;
    case 'view':
      setView(value);
      break;
    case 'pause':
      if (!started) started = true;
      else paused = !paused;
      clearControls();
      break;
    case 'speed':
      speed = Number(value);
      document
        .querySelectorAll('.speed-button')
        .forEach((b) => b.classList.toggle('active', (b as HTMLElement).dataset.value === value));
      break;
    case 'zoom-in':
      renderer.zoom = Math.min(1.6, renderer.zoom + 0.15);
      break;
    case 'zoom-out':
      renderer.zoom = Math.max(0.65, renderer.zoom - 0.15);
      break;
    case 'vision':
      renderer.showVision = !renderer.showVision;
      button.classList.toggle('active', renderer.showVision);
      break;
    case 'mutation-preview':
      showDialog(ui.mutationDialog(sim.state, value, button.dataset.treeGoal));
      break;
    case 'mutation-tree':
      showDialog(
        ui.dialogFrame('The evolution tree', mutationTreePanel(sim.state, value), 'graph-dialog'),
      );
      break;
    case 'species-tree':
      showDialog(
        ui.dialogFrame('Every branch has a story', speciesTreePanel(sim.state), 'graph-dialog'),
      );
      break;
    case 'branch-detail':
      showDialog(ui.dialogFrame('A species through time', branchDetailPanel(sim.state, value)));
      break;
    case 'mutations':
      showDialog(ui.adaptationsDialog(sim.state));
      break;
    case 'mutate': {
      const change = applyMutation(sim.state, value);
      if (change.ok) dialog.close();
      result(change, 'mutation');
      break;
    }
    case 'remove-mutation':
      result(removeMutation(sim.state, value));
      break;
    case 'reproduce':
      result(reproduce(sim.state), 'birth');
      break;
    case 'inherit':
      result(inheritControl(sim.state, value));
      break;
    case 'help':
      showDialog(ui.helpDialog());
      break;
    case 'settings':
      showDialog(ui.settingsDialog(sim.state));
      break;
    case 'world-settings':
      showDialog(ui.worldSettingsDialog(sim.state));
      break;
    case 'close-dialog':
      dialog.close();
      break;
    case 'save':
      save();
      break;
    case 'export':
      exportSave();
      break;
    case 'import':
      get<HTMLInputElement>('import-file').click();
      break;
    case 'map':
      showDialog(ui.dialogFrame('A world worth knowing.', evolutionUI.worldPanel(sim.state)));
      break;
    case 'mating':
      showDialog(ui.dialogFrame('The next generation', evolutionUI.matingPanel(sim.state)));
      break;
    case 'mate':
      result(reproduce(sim.state, value), 'birth');
      break;
    case 'build-nest':
      result(buildNest(sim.state));
      break;
    case 'stock-nest':
      result(stockNest(sim.state, value, 5));
      break;
    case 'investigate':
      result(investigate(sim.state, value));
      showDialog(ui.dialogFrame('A world worth knowing.', evolutionUI.worldPanel(sim.state)));
      break;
    case 'navigate-region':
    case 'navigate-fossil':
    case 'navigate-site': {
      const r = sim.state.evolution.regions.find((r) => r.id === value);
      const target =
        action === 'navigate-region' && r
          ? { x: r.x + r.width / 2, y: r.y + r.height / 2 }
          : action === 'navigate-fossil'
            ? sim.state.evolution.fossils.find((f) => f.id === value && f.discovered)
            : sim.state.evolution.regions.flatMap((r) => r.sites).find((s) => s.id === value);
      if (target) {
        setView('habitat');
        started = true;
        paused = false;
        input.target = { x: target.x, y: target.y };
      }
      break;
    }
    case 'appearance': {
      const p = sim.state.player,
        organ = get<HTMLSelectElement>('placement-organ').value;
      p.genome.appearance = {
        color: get<HTMLInputElement>('body-color').value,
        proportions: Number(get<HTMLInputElement>('body-proportions').value),
        placements: {
          ...p.genome.appearance?.placements,
          [organ]: {
            x: Number(get<HTMLInputElement>('placement-x').value),
            y: Number(get<HTMLInputElement>('placement-y').value),
          },
        },
      };
      const ancestor = sim.state.lineage.archive.find((a) => a.id === p.id);
      if (ancestor) ancestor.genome = structuredClone(p.genome);
      result({ ok: true, message: 'Body design saved and inherited by future offspring.' });
      break;
    }
    case 'objective-claim':
      result(replay.claimObjective(sim.state, value));
      break;
    case 'variation-adopt':
      result(replay.adoptVariation(sim.state, value), 'mutation');
      break;
    case 'variation-remove':
      result(replay.removeVariation(sim.state, value));
      break;
    case 'trait-adopt':
      result(replay.adoptTrait(sim.state, value));
      break;
    case 'space':
      showDialog(ui.dialogFrame('A lineage among the stars', spacePanel(sim.state)));
      break;
    case 'space-launch': {
      const [kind, target] = value.split(':');
      result(space.launch(sim.state, kind as MissionKind, target));
      showDialog(ui.dialogFrame('A lineage among the stars', spacePanel(sim.state)));
      break;
    }
    case 'space-frontier':
      result(space.frontier(sim.state));
      showDialog(ui.dialogFrame('A lineage among the stars', spacePanel(sim.state)));
      break;
    case 'space-research':
      result(space.researchFrontier(sim.state));
      showDialog(ui.dialogFrame('A lineage among the stars', spacePanel(sim.state)));
      break;
    case 'society-gather-menu':
      showDialog(ui.dialogFrame('Gather from your habitat', societyUI.gatherMenu(sim.state)));
      break;
    case 'society-craft-menu':
      showDialog(ui.dialogFrame('Tools extend the body', societyUI.craftMenu(sim.state)));
      break;
    case 'society-research-menu':
      showDialog(ui.dialogFrame('Knowledge across generations', societyUI.researchMenu(sim.state)));
      break;
    case 'society-build-menu':
      showDialog(ui.dialogFrame('Transform the habitat', societyUI.buildMenu(sim.state, value)));
      break;
    case 'society-gather':
      result(society.gather(sim.state, value));
      break;
    case 'society-craft':
      result(society.craft(sim.state, value));
      break;
    case 'society-research':
      result(society.research(sim.state, value));
      if (sim.state.society.research) dialog.close();
      break;
    case 'society-convert':
      result(society.convertBiomass(sim.state));
      break;
    case 'society-heal':
      result(society.heal(sim.state));
      break;
    case 'society-build': {
      const [town, id] = value.split(':');
      result(society.construct(sim.state, town, id));
      dialog.close();
      break;
    }
    case 'society-job': {
      const [town, job, delta] = value.split(':');
      result(society.assignProfession(sim.state, town, job, Number(delta)));
      break;
    }
    case 'society-policy': {
      const [kind, id] = value.split(':');
      result(society.policy(sim.state, kind, id));
      break;
    }
    case 'society-diplomacy': {
      const [id, action] = value.split(':');
      result(society.diplomacy(sim.state, id, action));
      break;
    }
    case 'society-visit':
    case 'society-memory': {
      const target =
        action === 'society-visit'
          ? sim.state.society.settlements.find((t) => t.id === value)
          : sim.state.society.memory[Number(value)];
      if (target) {
        setView('habitat');
        started = true;
        paused = false;
        input.target = { x: target.x, y: target.y };
      }
      break;
    }
    case 'debug-layer':
      if (import.meta.env.DEV) {
        if (renderer.debugLayers.has(value)) renderer.debugLayers.delete(value);
        else renderer.debugLayers.add(value);
        showDebug();
      }
      break;
    case 'debug':
      if (import.meta.env.DEV) showDebug();
      break;
    case 'debug-command':
      if (import.meta.env.DEV) {
        result(debugCommand(sim, value));
        showDebug();
      }
      break;
  }
  updateHud();
});
app.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement;
  if (target.id === 'evolution-goal') {
    showDialog(
      ui.dialogFrame(
        'The evolution tree',
        mutationTreePanel(sim.state, target.value),
        'graph-dialog',
      ),
    );
    get<HTMLSelectElement>('evolution-goal').focus();
    return;
  }
  if (target.id === 'placement-organ') {
    const p = sim.state.player.genome.appearance?.placements[target.value] ?? { x: 0, y: 0 };
    get<HTMLInputElement>('placement-x').value = String(p.x);
    get<HTMLInputElement>('placement-y').value = String(p.y);
  }
  const key = target.dataset.setting as keyof Settings | undefined;
  if (!key) return;
  if (key === 'control' && ['hybrid', 'direct', 'touch'].includes(target.value))
    sim.state.settings.control = target.value as Settings['control'];
  else if (
    target instanceof HTMLInputElement &&
    target.type === 'checkbox' &&
    key !== 'control' &&
    key !== 'keys'
  )
    sim.state.settings[key] = target.checked;
  updateHud();
  save();
});
app.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement;
  if (target.id === 'mutation-search') {
    const text = target.value.toLowerCase();
    dialog
      .querySelectorAll<HTMLElement>('.mutation-card')
      .forEach((card) => (card.hidden = !card.textContent?.toLowerCase().includes(text)));
  }
});
let organDrag: number | null = null;
function positionOrgan(event: PointerEvent) {
  const canvas = get<HTMLCanvasElement>('body-placement-preview');
  if (!canvas) return;
  const r = canvas.getBoundingClientRect(),
    x = Math.max(-1, Math.min(1, (event.clientX - r.left - r.width / 2) / (r.width * 0.35))),
    y = Math.max(-1, Math.min(1, (event.clientY - r.top - r.height / 2) / (r.height * 0.35)));
  get<HTMLInputElement>('placement-x').value = String(Math.round(x * 10) / 10);
  get<HTMLInputElement>('placement-y').value = String(Math.round(y * 10) / 10);
  const g = sim.state.player.genome,
    id = get<HTMLSelectElement>('placement-organ').value;
  g.appearance ??= { color: '#b8e998', proportions: 1, placements: {} };
  g.appearance.placements[id] = { x, y };
}
app.addEventListener('pointerdown', (event) => {
  if ((event.target as HTMLElement).id !== 'body-placement-preview') return;
  organDrag = event.pointerId;
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  positionOrgan(event);
});
app.addEventListener('pointermove', (event) => {
  if (event.pointerId === organDrag) positionOrgan(event);
});
app.addEventListener('pointerup', (event) => {
  if (event.pointerId !== organDrag) return;
  organDrag = null;
  const a = sim.state.lineage.archive.find((a) => a.id === sim.state.player.id);
  if (a) a.genome = structuredClone(sim.state.player.genome);
  save();
});
app.addEventListener('pointercancel', () => {
  organDrag = null;
});
app.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  if (form.id === 'keybindings-form') {
    const values = new FormData(form);
    const bindings = Object.fromEntries(
      Object.keys(DEFAULT_KEYS).map((k) => {
        const v = String(values.get(k) ?? '').toLowerCase();
        return [k, v === 'space' ? ' ' : v];
      }),
    );
    if (!validBindings(bindings)) {
      notify('Use distinct letter, number, arrow, shift, or space keys.', true);
      return;
    }
    sim.state.settings.keys = bindings;
    save();
    notify('Keyboard controls saved.');
  } else if (form.id === 'new-world-form') {
    const seed = String(new FormData(form).get('seed') ?? '').trim();
    if (!seed) return;
    const old = sim.state,
      next = createGame(seed);
    next.legacies = structuredClone(old.legacies);
    if (!old.lineage.extinct) next.legacies.push(legacyRecord(old, 'Retired by the player'));
    next.lineage.legacy = old.lineage.legacy;
    next.discoveries = structuredClone(old.discoveries);
    next.settings = structuredClone(old.settings);
    next.evolution.unlocks = [...new Set(old.evolution.unlocks)];
    const options = new FormData(form);
    const setup = replay.configureStart(
      next,
      String(options.get('path') ?? 'microbe'),
      String(options.get('challenge') ?? 'normal'),
      next.evolution.unlocks,
    );
    if (!setup.ok) {
      notify(setup.message, true);
      return;
    }
    replaceWorld(next);
    saveProtected = false;
    save();
    dialog.close();
    notify('A new beginning. Your earlier lineages remain in the archive.');
  } else if (form.id === 'settlement-form') {
    result(society.foundSettlement(sim.state, String(new FormData(form).get('name') ?? '')));
  } else if (form.id === 'speciation-form') {
    result(speciate(sim.state, String(new FormData(form).get('name') ?? '')));
  } else if (form.id === 'debug-form' && import.meta.env.DEV) {
    result(debugCommand(sim, String(new FormData(form).get('command'))));
    showDebug();
  }
});
function replaceWorld(state: GameState) {
  sim = new Simulation(state);
  clearControls();
  started = false;
  paused = false;
  accumulator = 0;
  renderer.camera = { x: state.player.x, y: state.player.y };
  lastEventId = state.history.at(-1)?.id ?? 0;
  lastFood = state.telemetry.foodEaten;
  lastDeath = state.telemetry.deaths;
  extinctionShown = false;
  setView('habitat');
  refreshPanels(true);
  updateHud();
}
function exportSave() {
  try {
    const blob = new Blob([encodeSave(sim.state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = `lifeform-${sim.state.seed.replace(/[^a-z0-9-]/gi, '_')}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Your world has been exported.');
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not export this world.', true);
  }
}
get<HTMLInputElement>('import-file').addEventListener('change', async (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 8_000_000) throw new Error('This save is too large to import.');
    const next = decodeSave(await file.text());
    // Validation completes before the current world is replaced.
    replaceWorld(next);
    saveProtected = false;
    save();
    notify('Your lineage has returned.');
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Could not import this save.', true);
  }
  input.value = '';
});
function showDebug() {
  if (!import.meta.env.DEV) return;
  const s = sim.state,
    metrics = sim.getMetrics();
  showDialog(
    ui.dialogFrame(
      'Simulation observatory',
      `<p class="dialog-intro">Local development tools. The world is paused. No telemetry leaves this browser.</p><div class="debug-metrics">${Object.entries(
        {
          ...metrics,
          sessions: s.telemetry.sessions ?? 0,
          'active play seconds': Math.floor(s.telemetry.activeSeconds ?? 0),
          'average session seconds': Math.floor(
            (s.telemetry.activeSeconds ?? 0) / Math.max(1, s.telemetry.sessions ?? 0),
          ),
          ...Object.fromEntries(
            Object.entries(s.telemetry.first ?? {}).map(([k, v]) => ['first ' + k, Math.floor(v)]),
          ),
          'last step ms': lastStepMs.toFixed(2),
          'max step ms': maxStepMs.toFixed(2),
          'food eaten': s.telemetry.foodEaten,
          births: s.telemetry.births,
          deaths: s.telemetry.deaths,
          'longest life': Math.round(s.telemetry.lifespan),
          'mutation choices': Object.values(s.telemetry.mutations).reduce((a, b) => a + b, 0),
        },
      )
        .map(([k, v]) => `<span>${k}<b>${v}</b></span>`)
        .join(
          '',
        )}</div><div class="behavior-grid">${DEBUG_LAYERS.map((layer) => `<button class="secondary-button" data-action="debug-layer" data-value="${layer}" aria-pressed="${renderer.debugLayers.has(layer)}">${layer}</button>`).join('')}</div><div class="table-scroll"><table><thead><tr><th>Species</th><th>Pop.</th><th>Births</th><th>Deaths</th><th>Food</th><th>Fitness</th></tr></thead><tbody>${s.populations.map((p) => `<tr><td>${p.speciesId}</td><td>${p.count}</td><td>${p.births}</td><td>${p.deaths}</td><td>${p.food.toFixed(2)}</td><td>${p.fitness.toFixed(2)}</td></tr>`).join('')}</tbody></table></div><div class="button-row">${[
        ['drought', 'Drought'],
        ['bloom', 'Food bloom'],
        ['advance 30', '+30 seconds'],
        ['die', 'Test succession'],
      ]
        .map(
          ([cmd, label]) =>
            `<button class="secondary-button" data-action="debug-command" data-value="${cmd}">${label}</button>`,
        )
        .join(
          '',
        )}</div><form id="debug-form"><label class="field-label" for="debug-command">COMMAND</label><input name="command" id="debug-command" placeholder="/points 5" autocomplete="off" /><button class="primary-button" type="submit">Run command</button></form><p class="dialog-note">/energy N · /biomass N · /points N · /mutation ID · /reproduce · /drought · /bloom · /die · /advance seconds · /spawn ID · /population ID N</p><div class="button-row"><button class="text-button" data-action="vision">Toggle perception</button></div>`,
    ),
  );
}

const editable = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (!!target.closest('input, select, textarea') || target.isContentEditable);
window.addEventListener('keydown', (event) => {
  if (editable(event.target) || dialog.open) return;
  const key = event.key.toLowerCase(),
    bindings = sim.state.settings.keys ?? DEFAULT_KEYS;
  if (
    [
      ' ',
      'arrowup',
      'arrowdown',
      'arrowleft',
      'arrowright',
      'w',
      'a',
      's',
      'd',
      'shift',
      'p',
      'r',
    ].includes(key) ||
    Object.values(bindings).includes(key)
  )
    event.preventDefault();
  if (!event.repeat && key === bindings.pause) {
    if (!started) started = true;
    else paused = !paused;
    clearControls();
    updateHud();
    return;
  }
  if (!event.repeat && key === bindings.reproduce && started) {
    result(reproduce(sim.state), 'birth');
    return;
  }
  keys.add(key);
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', clearControls);
document.addEventListener('visibilitychange', () => {
  clearControls();
  accumulator = 0;
  if (document.hidden && started && !saveProtected) save();
});
window.addEventListener('pagehide', () => {
  if (started && !saveProtected) {
    record(
      sim.state,
      'session-end',
      'An observation ends',
      'Progress is retained for the next visit.',
    );
    save();
  }
});
dialog.addEventListener('close', () => {
  clearControls();
  updateHud();
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      dialog.close();
  }
});
get<HTMLCanvasElement>('world').addEventListener('pointerdown', (event) => {
  if (!running()) return;
  input.target = renderer.screenToWorld(event.clientX, event.clientY);
  renderer.target = input.target;
  get<HTMLCanvasElement>('world').focus({ preventScroll: true });
});
let stickX = 0,
  stickY = 0,
  stickPointer: number | null = null,
  touchAction = false,
  touchSprint = false;
const joystick = get('joystick');
function moveStick(event: PointerEvent) {
  const rect = joystick.getBoundingClientRect(),
    dx = event.clientX - rect.left - rect.width / 2,
    dy = event.clientY - rect.top - rect.height / 2;
  const length = Math.max(1, Math.hypot(dx, dy) / 33);
  stickX = dx / length / 33;
  stickY = dy / length / 33;
  input.target = null;
  (joystick.firstElementChild as HTMLElement).style.transform =
    `translate(${stickX * 24}px, ${stickY * 24}px)`;
}
joystick.addEventListener('pointerdown', (event) => {
  stickPointer = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  moveStick(event);
});
joystick.addEventListener('pointermove', (event) => {
  if (stickPointer === event.pointerId) moveStick(event);
});
const releaseStick = () => {
  stickPointer = null;
  stickX = 0;
  stickY = 0;
  (joystick.firstElementChild as HTMLElement).style.transform = '';
};
joystick.addEventListener('pointerup', releaseStick);
joystick.addEventListener('pointercancel', releaseStick);
joystick.addEventListener('lostpointercapture', releaseStick);
for (const [id, setter] of [
  ['touch-action', (v: boolean) => (touchAction = v)],
  ['touch-sprint', (v: boolean) => (touchSprint = v)],
] as const) {
  const el = get(id);
  el.addEventListener('pointerdown', (event) => {
    el.setPointerCapture(event.pointerId);
    setter(true);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    el.addEventListener(type, () => setter(false));
}

function frame(now: number) {
  const dt = Math.min((now - previousFrame) / 1000, 0.1);
  previousFrame = now;
  if (running()) {
    sim.state.telemetry.activeSeconds = (sim.state.telemetry.activeSeconds ?? 0) + dt;
    const bindings = sim.state.settings.keys ?? DEFAULT_KEYS;
    input.x =
      (keys.has(bindings.right) || keys.has('arrowright') ? 1 : 0) -
      (keys.has(bindings.left) || keys.has('arrowleft') ? 1 : 0) +
      stickX;
    input.y =
      (keys.has(bindings.down) || keys.has('arrowdown') ? 1 : 0) -
      (keys.has(bindings.up) || keys.has('arrowup') ? 1 : 0) +
      stickY;
    input.action = keys.has(bindings.action) || touchAction;
    input.sprint = keys.has(bindings.sprint) || touchSprint;
    if (input.x || input.y) input.target = null;
    accumulator = Math.min(accumulator + dt * speed, TUNING.step * 12);
    while (accumulator >= TUNING.step) {
      const before = performance.now();
      sim.step(input);
      lastStepMs = performance.now() - before;
      maxStepMs = Math.max(maxStepMs, lastStepMs);
      accumulator -= TUNING.step;
    }
    autosaveElapsed += dt;
    if (autosaveElapsed >= TUNING.autosaveInterval) {
      autosaveElapsed = 0;
      if (!saveProtected) save();
    }
  } else accumulator = 0;
  renderer.target = input.target;
  if (view === 'habitat') {
    renderer.draw(sim.state, sim.state.time, dt);
    renderer.drawMap(get<HTMLCanvasElement>('minimap'), sim.state);
  }
  const map = document.querySelector<HTMLCanvasElement>('#large-map');
  if (map) renderer.drawMap(map, sim.state, true);
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-preview]').forEach((canvas) => {
    if (canvas.clientWidth > 0)
      drawPreview(
        canvas,
        ui.previewGenome(sim.state, canvas.dataset.preview!),
        sim.state.settings.reducedMotion ? 0 : sim.state.time,
      );
  });
  uiElapsed += dt;
  if (uiElapsed >= 0.2) {
    uiElapsed = 0;
    updateHud();
  }
  requestAnimationFrame(frame);
}
if (loaded.state)
  get('welcome').innerHTML =
    `<span class="eyebrow">YOUR STORY CONTINUES</span><h3>Welcome back to the shallows.</h3><p>Your world waited for you. Generation ${sim.state.player.generation} is ready.</p><button class="primary-button" data-action="begin">Continue your lineage ${icon('arrow')}</button>`;
if (!loaded.state && matchMedia('(prefers-reduced-motion: reduce)').matches)
  sim.state.settings.reducedMotion = true;
new IntersectionObserver(
  (entries) => {
    stageVisible = entries[0].isIntersecting;
    if (!stageVisible) clearControls();
  },
  { threshold: 0.15 },
).observe(get('world-stage'));
refreshPanels(true);
updateHud();
if (loaded.warning) notify(loaded.warning, true);
if (sim.state.lineage.extinct) showDialog(ui.extinctionDialog(sim.state));
requestAnimationFrame(frame);

if (import.meta.env.DEV) {
  // Read-only snapshots plus explicit commands support local balancing and browser regression tests.
  Object.defineProperty(window, 'lifeform', {
    value: {
      snapshot: () => structuredClone(sim.state),
      command: (command: string) => {
        const response = debugCommand(sim, command);
        sim.refresh();
        refreshPanels(true);
        updateHud();
        return response;
      },
      metrics: () => ({ ...sim.getMetrics(), lastStepMs, maxStepMs }),
    },
    configurable: true,
  });
}
