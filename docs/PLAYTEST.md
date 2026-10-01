# Vertical slice playtest

## A first session

1. Start `npm run dev` and open `http://127.0.0.1:5173`.
2. Begin the lineage. Swim toward the food trail to the right; hybrid controls consume edible resources automatically.
3. Preview an eye, shell or jaw. Compare its stats and body cost, then adapt.
4. Feed, explore and discover neighbors. Four foods or four new territories earn a point; a newly encountered species also earns one.
5. At age 12 seconds, with sufficient energy and biomass, reproduce. Base cost: 28 energy and 10 biomass, with a 10-energy reserve required.
6. Keep the offspring near food. It matures in 30 seconds, or 18 with parental care. Use Lineage to guide it when mature.
7. Try hunting with a jaw, fleeing with a tail, or surviving with a shell and photosynthesis. Sprint consumes stamina.
8. Watch a drought or bloom after roughly three minutes. Inspect the food and population changes in Discoveries or the developer observatory.
9. Save and reload. Export and import the world. In local development, test succession with `/die` after reproducing.

## Questions for human playtesting

- Does the first meal make sense without reading the help screen?
- Can a player explain why a mutation changed movement, diet or survivability?
- Does each side of an incompatible branch feel useful?
- Can a new player produce a first offspring within three minutes?
- Is a predator encounter readable and escapable on a small screen?
- Does inheriting an offspring feel like continuity rather than a reset?
- Does a drought encourage a different choice rather than simply more feeding?
- After 10–20 minutes, does the player want to see what the lineage becomes?

Automated checks can verify mechanics and regressions. They do not establish that a 20-minute session is fun; that remains the gate before extending this slice.

## Verification commands

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
npm run profile
npm run format:check
```

Browser tests cover desktop Chromium and Chromium with an iPhone-sized touch viewport. They exercise pointer/keyboard/joystick movement, mobile control placement, local-only assets, mutation previews, reproduction, succession, save recovery paths, map/discovery/settings screens and new seeded worlds. Screenshots are written to `artifacts/`; traces on failure go to `test-results/`. These directories are ignored by Git.

The headless profiler simulates ten minutes with an invulnerable moving observer, then validates the resulting save. It reports step latency, heap delta, save size and simulation counts. This measures the simulation on the current desktop CPU, not mobile GPU/render performance. Browser rendering also needs checking on physical phones before release.

## Current prototype limits

- One shallow-water biome; terrain rocks and plants are scenery, not collision obstacles.
- Asexual inheritance; no mating, recessive genes or speciation yet.
- Two environmental pressures; venom and starvation supply the first survival conditions.
- No gamepad mapping, vibration, native app packaging or installable offline PWA yet.
- Soft synthesized cues, not a composed soundtrack.
- No cloud sync, server analytics, purchases, accounts or daily tasks.
- Browsers pause when the habitat is not visible. This prototype does not simulate offline progress.
- Historical journals retain the most recent 500 events for each lineage; individual genomes remain in the archive.
- A full native-device accessibility and long-session balance audit is still needed before a public release.
