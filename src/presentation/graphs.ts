import type { GameState } from '../core/types';
import { MUTATIONS, mutationById, organById } from '../data/content';
import { planMutation } from '../biology/planning';
import { phenotype } from '../biology/body';
import { icon, escapeHtml as esc } from './icons';

interface GraphEntry {
  id: string;
  parents: string[];
  content: string;
  className: string;
  action: string;
  goal?: string;
}

/** HTML buttons preserve keyboard navigation; SVG only paints their connections. */
function graph(entries: GraphEntry[], label: string) {
  const levels = new Map<string, number>(),
    pending = new Map(entries.map((e) => [e.id, e]));
  while (pending.size) {
    let advanced = false;
    for (const [id, e] of pending) {
      if (e.parents.some((p) => pending.has(p))) continue;
      levels.set(
        id,
        e.parents.length ? Math.max(...e.parents.map((p) => levels.get(p) ?? -1)) + 1 : 0,
      );
      pending.delete(id);
      advanced = true;
    }
    if (!advanced) throw new Error('A visual ancestry graph cannot contain a cycle.');
  }
  const counts = new Map<number, number>();
  const nodes = entries.map((e) => {
    const level = levels.get(e.id)!,
      row = counts.get(level) ?? 0;
    counts.set(level, row + 1);
    return { ...e, x: level * 252 + 12, y: row * 128 + 12 };
  });
  const width = Math.max(244, ...nodes.map((n) => n.x + 232));
  const height = Math.max(132, ...nodes.map((n) => n.y + 120));
  const paths = nodes
    .flatMap((n) =>
      n.parents.map((parent) => {
        const p = nodes.find((node) => node.id === parent);
        if (!p) return '';
        return `<path d="M ${p.x + 220} ${p.y + 52} C ${p.x + 238} ${p.y + 52}, ${n.x - 18} ${n.y + 52}, ${n.x} ${n.y + 52}" />`;
      }),
    )
    .join('');
  return `<div class="graph-scroll" tabindex="0" role="region" aria-label="${esc(label)}"><div class="evolution-graph" style="width:${width}px;height:${height}px"><svg width="${width}" height="${height}" aria-hidden="true">${paths}</svg>${nodes.map((n) => `<button class="graph-node ${n.className}" style="left:${n.x}px;top:${n.y}px" data-action="${n.action}" data-value="${esc(n.id)}" ${n.goal ? `data-tree-goal="${esc(n.goal)}"` : ''}>${n.content}</button>`).join('')}</div></div>`;
}

export function mutationTreePanel(state: GameState, goal: string) {
  if (!mutationById[goal]) goal = 'associative-brain';
  const plan = planMutation(state, goal),
    categories = [...new Set(MUTATIONS.map((m) => m.category))];
  const entries: GraphEntry[] = plan.steps.map((step) => {
    const m = mutationById[step.id];
    return {
      id: m.id,
      parents: m.requires,
      action: 'mutation-preview',
      goal,
      className: `${step.installed ? 'complete' : step.reason ? 'locked' : 'available'} ${m.id === goal ? 'target' : ''}`,
      content: `<span class="graph-kicker">${icon(m.icon)} ${esc(m.category)} · ${step.installed ? 'ADAPTED' : step.reason ? 'LOCKED' : 'AVAILABLE'}</span><strong>${esc(m.name)}</strong><small>${step.installed ? 'Inherited in this body' : `${m.cost} point${m.cost === 1 ? '' : 's'} · ${m.biomass} biomass`}</small>`,
    };
  });
  const children = MUTATIONS.filter((m) => m.requires.includes(goal));
  return `<p class="dialog-intro">Follow connected prerequisites toward a new ability. Select any node to inspect its tradeoffs. Swipe or scroll the diagram sideways on small screens.</p><label class="field-label" for="evolution-goal">EXPLORE AN EVOLUTIONARY GOAL</label><select id="evolution-goal">${categories
    .map(
      (c) =>
        `<optgroup label="${esc(c)}">${MUTATIONS.filter((m) => m.category === c)
          .map(
            (m) =>
              `<option value="${m.id}" ${m.id === goal ? 'selected' : ''}>${esc(m.name)}</option>`,
          )
          .join('')}</optgroup>`,
    )
    .join(
      '',
    )}</select><div class="route-totals"><span><b>${plan.points}</b> remaining points</span><span><b>${plan.biomass}</b> biomass</span><span><b>${phenotype(plan.genome).mass}</b> projected mass</span></div>${graph(entries, 'Mutation prerequisites, from ancestors to selected goal')}<ol class="route-checklist">${plan.steps.map((s) => `<li class="${s.installed ? 'complete' : ''}"><span>${icon(s.installed ? 'check' : 'branch')}</span><div><b>${esc(mutationById[s.id].name)}</b><small>${esc(s.installed ? 'Already in this body.' : (s.reason ?? 'Ready to adapt now.'))}</small></div><button class="text-button" data-action="mutation-preview" data-value="${s.id}" data-tree-goal="${goal}">Inspect ${icon('arrow')}</button></li>`).join('')}</ol>${plan.issue ? `<p class="requirement">Body constraint along this route: ${esc(plan.issue)} Reshape conflicting adaptations before proceeding.</p>` : '<p class="dialog-note">This route fits the current body. Each adaptation is purchased separately; the plan spends nothing. Costs exclude unrelated adaptations and changes to your genome.</p>'}${children.length ? `<h3 class="subheading">Where this could lead</h3><div class="button-row">${children.map((m) => `<button class="secondary-button" data-action="mutation-tree" data-value="${m.id}">${esc(m.name)} ${icon('arrow')}</button>`).join('')}</div>` : ''}<button class="text-button" data-action="mutations">Browse all adaptations ${icon('arrow')}</button>`;
}

export function branchPopulation(s: GameState, id: string) {
  const branch = s.evolution.branches.find((b) => b.id === id);
  if (!branch) return { individuals: 0, citizens: 0, colonists: 0, total: 0 };
  const individuals = [s.player, ...s.creatures].filter(
    (c) => c.health > 0 && c.speciesId === 'player' && branch.members.includes(c.id),
  ).length;
  const citizens = s.society.settlements
    .filter((t) => !t.lost && t.branchId === id)
    .reduce((n, t) => n + Math.floor(t.population), 0);
  const colonists = s.space.planets.reduce(
    (n, p) => n + (p.colony?.branchId === id ? Math.floor(p.colony.population) : 0),
    0,
  );
  return { individuals, citizens, colonists, total: individuals + citizens + colonists };
}

export function speciesTreePanel(s: GameState) {
  const entries: GraphEntry[] = s.evolution.branches.map((b) => ({
    id: b.id,
    parents: b.parentId ? [b.parentId] : [],
    action: 'branch-detail',
    className: `${b.extinct ? 'extinct' : 'complete'} ${b.id === s.evolution.activeBranch ? 'target' : ''}`,
    content: `<span class="graph-kicker">${icon('branch')} GEN ${b.generation} · ${b.extinct ? 'EXTINCT' : b.id === s.evolution.activeBranch ? 'YOUR SPECIES' : 'LIVING'}</span><strong>${esc(b.name)}</strong><small>${b.extinct ? esc(b.extinctionCause ?? 'Population lost') : `${branchPopulation(s, b.id).total} living · ${b.genome.mutations.length} founding adaptations`}</small>`,
  }));
  return `<p class="dialog-intro">Each connection records an actual species split. Inspect a branch to compare its founding body, descendants, population and fossil record.</p>${graph(entries, 'Connected species ancestry')}<h3 class="subheading">Fossil archive</h3><div class="fossil-gallery">${
    s.evolution.fossils
      .filter((f) => f.discovered)
      .map(
        (f) =>
          `<article class="fossil-card"><span class="eyebrow">RECOVERED GENETIC HISTORY</span><h3>${esc(f.name)}</h3><p>${f.adaptations.length} preserved adaptations · formed at ${Math.floor(f.age)} seconds</p><button class="text-button" data-action="branch-detail" data-value="${esc(f.branchId)}">Inspect extinct branch ${icon('arrow')}</button><button class="text-button" data-action="navigate-fossil" data-value="${esc(f.id)}">Return to fossil site ${icon('map')}</button></article>`,
      )
      .join('') ||
    '<p class="empty-message">No fossils recovered yet. Explore around lost populations to find their remains.</p>'
  }</div>`;
}

export function branchDetailPanel(s: GameState, id: string) {
  const b = s.evolution.branches.find((b) => b.id === id);
  if (!b) return '<p>This branch is unavailable.</p>';
  const parent = s.evolution.branches.find((p) => p.id === b.parentId),
    population = branchPopulation(s, id);
  const additions = b.genome.mutations.filter((m) => !parent?.genome.mutations.includes(m));
  const losses = parent?.genome.mutations.filter((m) => !b.genome.mutations.includes(m)) ?? [];
  const children = s.evolution.branches.filter((c) => c.parentId === id);
  return `<div class="branch-specimen"><canvas data-preview="branch:${esc(id)}" aria-label="Founding body of ${esc(b.name)}"></canvas><div><span class="eyebrow">${b.extinct ? 'EXTINCT SPECIES' : 'LIVING SPECIES'}</span><h3>${esc(b.name)}</h3><p>Generation ${b.generation} · founded at ${Math.floor(b.created)} seconds</p><p>${esc(s.evolution.regions.find((r) => r.id === b.regionId)?.name ?? 'Unknown habitat')}</p></div></div><div class="route-totals"><span><b>${population.individuals}</b> individuals</span><span><b>${population.citizens}</b> citizens</span><span><b>${population.colonists}</b> colonists</span></div>${b.extinct ? `<p class="requirement">Extinction cause: ${esc(b.extinctionCause ?? 'Population lost')}</p>` : ''}<h3 class="subheading">Founding body</h3><p class="dialog-intro">This preserved genome records the species at its split. Living individuals may have adapted further.</p><div class="organ-chips">${b.genome.organs.map((o) => `<span>${esc(organById[o].name)}</span>`).join('')}</div><h3 class="subheading">Divergence from ${esc(parent?.name ?? 'the first ancestor')}</h3><ul class="branch-differences">${additions.map((m) => `<li>Added ${esc(mutationById[m].name)}</li>`).join('')}${losses.map((m) => `<li>Lost ${esc(mutationById[m].name)}</li>`).join('')}${!additions.length && !losses.length ? '<li>The ancestral starting body.</li>' : ''}</ul>${parent ? `<button class="secondary-button" data-action="branch-detail" data-value="${esc(parent.id)}">Ancestor: ${esc(parent.name)}</button>` : ''}${children.length ? `<h3 class="subheading">Descendant species</h3><div class="button-row">${children.map((c) => `<button class="secondary-button" data-action="branch-detail" data-value="${esc(c.id)}">${esc(c.name)} ${icon('arrow')}</button>`).join('')}</div>` : ''}<div class="button-row"><button class="text-button" data-action="species-tree">Back to species tree ${icon('branch')}</button></div>`;
}
