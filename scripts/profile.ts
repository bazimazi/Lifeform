import { performance } from 'node:perf_hooks';
import { createGame } from '../src/world/generation';
import { Simulation, emptyInput } from '../src/simulation/ecosystem';
import { TUNING } from '../src/data/content';
import { encodeSave, decodeSave } from '../src/core/save';

const state = createGame('PROFILE-01');
const sim = new Simulation(state);
const durations: number[] = [];
const beforeHeap = process.memoryUsage().heapUsed;
const started = performance.now();
for (let i = 0; i < (60 * 10) / TUNING.step; i++) {
  // A survivable moving observer exercises AI, resources, events, and populations for ten minutes.
  state.player.health = 10000;
  state.player.energy = 100;
  const angle = i * TUNING.step * 0.07;
  const before = performance.now();
  sim.step({ ...emptyInput(), x: Math.cos(angle), y: Math.sin(angle) });
  durations.push(performance.now() - before);
}
durations.sort((a, b) => a - b);
state.player.health = 70;
const save = encodeSave(state);
decodeSave(save);
console.log(
  JSON.stringify(
    {
      simulatedSeconds: state.time,
      ticks: state.tick,
      elapsedMs: Number((performance.now() - started).toFixed(2)),
      stepMedianMs: Number(durations[Math.floor(durations.length * 0.5)].toFixed(3)),
      stepP95Ms: Number(durations[Math.floor(durations.length * 0.95)].toFixed(3)),
      stepP99Ms: Number(durations[Math.floor(durations.length * 0.99)].toFixed(3)),
      stepMaxMs: Number(durations.at(-1)!.toFixed(3)),
      heapDeltaMB: Number(((process.memoryUsage().heapUsed - beforeHeap) / 1024 / 1024).toFixed(2)),
      saveKB: Number((save.length / 1024).toFixed(1)),
      ...sim.getMetrics(),
    },
    null,
    2,
  ),
);
