# Verification — 2026-10-01

The first biological vertical slice was checked locally on Windows with Node.js 24.18.0.

| Check                                  | Result                                                                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Simulation suite                       | 27 passing tests                                                                                                          |
| Browser regression suite               | 10 passing tests across desktop and mobile Chromium                                                                       |
| Strict TypeScript and production build | Passed                                                                                                                    |
| Prettier check                         | Passed                                                                                                                    |
| Production smoke test                  | Feeding, mutation, save export and responsive screens passed; no browser errors                                           |
| Production isolation                   | Developer UI and `window.lifeform` absent                                                                                 |
| Asset loading                          | No external runtime requests in browser tests; fonts bundled locally                                                      |
| Viewport inspection                    | 1440×1000, 768×1024, 390×664, 320×568; no horizontal overflow                                                             |
| Mobile control placement               | Quick actions fit above fixed navigation at 390×664 and 320×568                                                           |
| Save compatibility                     | v1 and v2 migration, v3 roundtrip, backup recovery, invalid input rejection, and deterministic replay across seeds passed |

## Performance sample

The headless profiler ran 600 simulated seconds / 18,000 fixed steps with a moving, invulnerable observer. The final sampled run took approximately 374 ms total. Step median: 0.017 ms; p95: 0.035 ms; p99: 0.084 ms. The resulting save was approximately 58 KB and passed validation.

A 120-frame production-browser sample at 1440×1000 averaged 16.57 ms per animation frame, with a 16.8 ms p95. These are measurements on the current desktop environment, not a guarantee for physical mobile devices. The profile excludes rendering; the browser sample includes it.

## Inspection and remaining release work

Desktop and mobile screenshots were inspected, including the initial world, active play, large-text mode and the 320-pixel layout. Local screenshots and the production save export are in the Git-ignored `artifacts/` directory.

This establishes a functioning prototype. Physical-phone testing, broader browser/accessibility coverage, and human 10–20-minute balance/fun playtests remain release work. The [playtest guide](PLAYTEST.md) defines the questions to resolve before expanding to another era.
