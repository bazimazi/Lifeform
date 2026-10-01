import { writeFileSync, mkdirSync } from 'node:fs';
import { createGame } from '../src/world/generation';
import { Simulation, emptyInput } from '../src/simulation/ecosystem';
import { applyMutation } from '../src/biology/mutation';
import { reproductionReason, reproduce } from '../src/biology/reproduction';
import { chooseGoal } from '../src/simulation/ai';
import { SpatialGrid } from '../src/world/spatial';
import type { Creature, Resource } from '../src/core/types';
import { phenotype } from '../src/biology/body';
const builds: Record<string, string[]> = {
  microbe: [],
  photosynthetic: ['sun-cell'],
  hunter: ['predatory-jaw', 'light-eye'],
  armored: ['mineral-shell', 'sun-cell'],
};
const rows: {
  seed: number;
  build: string;
  seconds: number;
  extinct: boolean;
  births: number;
  deaths: number;
  food: number;
  peak: number;
  cause: string;
  population: number;
}[] = [];
for (let seed = 1; seed <= 6; seed++)
  for (const [build, mutations] of Object.entries(builds)) {
    const s = createGame(`BALANCE-${seed}`);
    s.lineage.points = 10;
    s.lineage.biomass = 40;
    for (const id of mutations) applyMutation(s, id);
    const sim = new Simulation(s),
      agents = new SpatialGrid<Creature>(),
      foods = new SpatialGrid<Resource>();
    let goal = { x: s.player.x, y: s.player.y },
      fleeing = false;
    for (let tick = 0; tick < 3600 && !s.lineage.extinct; tick++) {
      if (tick % 15 === 0) {
        agents.rebuild([s.player, ...s.creatures]);
        foods.rebuild(s.resources.filter((r) => r.active));
        const choice = chooseGoal(s, s.player, agents, foods);
        goal = choice.target;
        fleeing = choice.name === 'flee';
        if (!reproductionReason(s)) reproduce(s);
      }
      sim.step({
        ...emptyInput(),
        sprint: fleeing,
        target: { x: goal.x, y: goal.y },
        action: build === 'hunter' && s.player.energy < phenotype(s.player.genome).energy * 0.6,
      });
    }
    rows.push({
      seed,
      build,
      seconds: +s.time.toFixed(1),
      extinct: s.lineage.extinct,
      births: s.telemetry.births,
      deaths: s.telemetry.deaths,
      food: s.telemetry.foodEaten,
      peak: s.lineage.peak,
      cause: s.legacies.at(-1)?.cause ?? 'Surviving',
      population: s.populations.reduce((n, p) => n + p.count, 0),
    });
  }
mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/balance.json', JSON.stringify(rows, null, 2));
const keys = Object.keys(rows[0]);
writeFileSync(
  'artifacts/balance.csv',
  [
    keys.join(','),
    ...rows.map((r) => keys.map((k) => JSON.stringify(r[k as keyof typeof r])).join(',')),
  ].join('\n'),
);
console.log(
  JSON.stringify(
    {
      runs: rows.length,
      surviving: rows.filter((r) => !r.extinct).length,
      averageFood: rows.reduce((n, r) => n + r.food, 0) / rows.length,
      byBuild: Object.keys(builds).map((build) => ({
        build,
        surviving: rows.filter((r) => r.build === build && !r.extinct).length,
        runs: 6,
      })),
      files: ['artifacts/balance.json', 'artifacts/balance.csv'],
    },
    null,
    2,
  ),
);
