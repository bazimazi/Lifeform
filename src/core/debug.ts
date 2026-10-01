import { phenotype } from '../biology/body';
import { applyMutation } from '../biology/mutation';
import { reproduce } from '../biology/reproduction';
import { creature } from '../world/generation';
import { speciesById, TUNING } from '../data/content';
import { clamp } from './random';
import type { ActionResult } from './types';
import type { Simulation } from '../simulation/ecosystem';

export function debugCommand(sim: Simulation, text: string): ActionResult {
  const [command, ...args] = text.trim().replace(/^\//, '').split(/\s+/);
  const s = sim.state,
    p = s.player;
  const value = Number(args.at(-1));
  switch (command) {
    case 'energy':
      if (Number.isFinite(value)) p.energy = clamp(value, 0, phenotype(p.genome).energy);
      else break;
      return ok('Energy set.');
    case 'biomass':
      if (Number.isFinite(value)) s.lineage.biomass = Math.max(0, value);
      else break;
      return ok('Biomass set.');
    case 'points':
      if (Number.isFinite(value)) s.lineage.points = Math.max(0, Math.floor(value));
      else break;
      return ok('Mutation points set.');
    case 'mutation':
      return applyMutation(s, args[0]);
    case 'reproduce':
      return reproduce(s);
    case 'drought':
    case 'bloom':
      return sim.triggerPressure(command);
    case 'die':
      sim.die(p, 'Developer test');
      return ok('Individual died.');
    case 'advance': {
      if (!Number.isFinite(value) || value < 0 || value > 3600)
        return { ok: false, message: 'Use /advance seconds (0–3600).' };
      for (let i = 0; i < Math.round(value / TUNING.step); i++) sim.step();
      return ok(`${value} seconds simulated.`);
    }
    case 'spawn': {
      const definition = speciesById[args[0]];
      if (!definition) return { ok: false, message: 'Unknown species.' };
      const count = s.creatures.filter((c) => c.speciesId === definition.id).length;
      if (count >= TUNING.maxAgentsPerSpecies)
        return { ok: false, message: 'Representative cohort is full.' };
      s.creatures.push(
        creature(
          `${definition.id}-${s.nextId++}`,
          definition.id,
          definition.genome,
          clamp(p.x + 160, 25, s.world.width - 25),
          p.y,
        ),
      );
      const population = s.populations.find((x) => x.speciesId === definition.id)!;
      population.count++;
      population.births++;
      sim.refresh();
      return ok('Species spawned.');
    }
    case 'population': {
      const population = s.populations.find((x) => x.speciesId === args[0]);
      if (!population || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) break;
      const members = s.creatures.filter((c) => c.speciesId === population.speciesId);
      if (value < members.length)
        s.creatures = s.creatures.filter(
          (c) => c.speciesId !== population.speciesId || members.indexOf(c) < value,
        );
      population.count = value;
      population.cause = 'Developer population adjustment';
      sim.refresh();
      return ok('Population set.');
    }
  }
  return {
    ok: false,
    message:
      'Commands: /energy N, /biomass N, /points N, /mutation ID, /reproduce, /drought, /bloom, /die, /advance seconds, /spawn ID, /population ID N',
  };
}
function ok(message: string): ActionResult {
  return { ok: true, message };
}
