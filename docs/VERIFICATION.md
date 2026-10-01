# Verification - 2026-10-01

Lifeform 0.2.0 was checked locally on Windows with Node.js 24.18.0. This verifies the playable prototype across biology, society, industry and space; it does not establish commercial release readiness.

| Check                                  | Result                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Simulation and persistence suite       | 55 passing tests                                                                                                                 |
| Browser regression suite               | 16 passing tests across desktop and mobile Chromium                                                                              |
| Strict TypeScript and production build | Passed                                                                                                                           |
| Formatting and patch whitespace        | Passed                                                                                                                           |
| Production smoke test                  | Feeding, mutation, export, society import and completed space survey passed; no browser errors                                   |
| Production isolation                   | Developer UI and `window.lifeform` absent                                                                                        |
| Asset loading                          | No external runtime requests; fonts bundled locally                                                                              |
| Viewports                              | 1440x1000, 768x1024, 390x664 and 320x568; no horizontal overflow                                                                 |
| Save compatibility                     | Schema 1-6 migrations, schema 7 roundtrip, original exported v3 save, backup recovery and malformed-input rejection passed       |
| Procedural replay                      | All 66 starting-path/world-rule combinations validated; seeded simulation, society, missions and generated content replay tested |

Browser tests exercise adaptation search, all eleven diagnostic overlays, organ drag placement, inherited traits and variations, remapped keys, challenge starts, crafting, construction, jobs, space missions, movement, touch controls, mutation, reproduction, succession, saves, settings, discoveries, map, extinction and restart.

## Performance sample

The headless profiler ran 600 simulated seconds / 18,000 fixed steps with a moving, invulnerable observer. The final sampled run took 2,865 ms total. Step median: 0.130 ms; p95: 0.333 ms; p99: 0.550 ms; maximum: 3.352 ms. Heap growth was approximately 9.73 MB. The resulting save was 111.4 KB and passed validation.

A 120-frame production-browser sample at 1440x1000 measured a 16.7 ms median and 16.8 ms p95. The headless profile excludes rendering; the browser sample includes it. These measurements describe the current desktop environment, not physical-phone performance.

## Automated balance sample

The diagnostic bot played six seeds with each of four biological builds for 120 simulated seconds, feeding, fleeing, sprinting and reproducing. Fifteen of 24 runs survived: microbe 4/6, photosynthetic 3/6, hunter 6/6 and armored 2/6. Mean food consumed was 33.6 per run. These results exposed and helped fix full predators hunting without need and distant representative populations resisting extinction.

These are short automated scenarios with prepared builds, not evidence that progression is balanced for a human player. Results and causes are saved in `artifacts/balance.json` and `artifacts/balance.csv`.

## Inspection and remaining release work

Desktop and mobile screenshots were inspected for the habitat, body editor, society, space, larger text and narrow layouts. Screenshots and exported saves remain in the Git-ignored `artifacts/` directory. The current production export is `production-v7-save.json`; the original schema 3 export is retained separately for migration checks.

Physical-phone testing, broader browser/accessibility coverage and human balance/fun playtests remain release work. The [playtest guide](PLAYTEST.md) defines those checks. The [implementation ledger](IMPLEMENTATION.md) records the implemented mechanics, aggregate simulation choices, optional features and long-term content targets.
