# LIFEFORM

**Build a living creature. Leave a lineage.**

A playable, mobile-friendly evolutionary sandbox. Guide a primitive organism through a seeded shallow-water ecosystem, evolve a body with meaningful tradeoffs, reproduce, and continue through its descendants.

This repository implements the first biological vertical slice of the [product brief](docs/PRODUCT_BRIEF.md).

## Run

Node.js 22.12 or newer is required.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. No backend or account is needed. Fonts, illustrations and sounds are served or generated locally.

```sh
npm run build
npm run preview
```

The production build is static content in `dist/`. Serve it over HTTP; opening `index.html` directly as a file is not supported.

## Play

| Input                    | Action                                          |
| ------------------------ | ----------------------------------------------- |
| WASD / arrow keys        | Swim                                            |
| Click or tap the water   | Swim to a destination                           |
| Touch joystick           | Direct movement on mobile                       |
| Space / bite button      | Eat compatible food or attack a nearby creature |
| Shift / lightning button | Sprint while stamina lasts                      |
| R / Reproduce            | Create offspring when mature and well fed       |
| P / play-pause button    | Pause or resume                                 |
| 1× / 2× / 4×             | Adjust simulation speed                         |

Hybrid controls automatically eat nearby food. Settings also offer direct movement with manual feeding, and tap-to-move with automatic feeding. Menus, hidden tabs, and scrolling the habitat out of view pause the world.

Food supplies energy and biomass. Discovering species, exploring territories and eating earns mutation opportunities. Preview an adaptation before installing it; organs determine speed, senses, diet, attack, defense, energy use and reproduction. The body has an 18-unit mass budget, and some evolutionary paths conflict.

At age 12 seconds, a healthy creature with enough energy and biomass can reproduce. Offspring inherit its current genome and grow nearby. If the controlled individual dies, a living relative takes over. With no survivors, the lineage remains in the legacy archive.

## What's in the slice

- One deterministic world and one primordial-shallows biome.
- One controllable lineage, five AI species, ten food/resource types, ten organs and twenty mutations.
- Movement, sprinting, feeding, hunting, venom, starvation, regeneration and sunlight energy.
- Utility-based wildlife decisions and aggregate distant population accounting.
- Drought and food-bloom pressures, discoveries and an explicit food web.
- Mutation previews, organ inspection/removal and biological budget validation.
- Reproduction, growth, inherited genomes, voluntary succession and continuation after death.
- Family tree, historical journal, earlier lineage archives and local development diagnostics.
- Responsive canvas/DOM presentation, touch controls, sound toggle, reduced motion, particle toggle, larger text and left-handed controls.
- Versioned autosaves, recovery backup, save export/import and migrations from earlier schemas.

## Saves

Progress stays in this browser. Autosave runs approximately every 12 seconds of active real play, after important actions, and when leaving the tab. Settings includes **Export save** and **Import save** for moving worlds between browsers or keeping a durable copy. Export before clearing browser storage.

Starting a new world retires the current lineage into its legacy. The new seed creates a fresh ecosystem while earlier genomes, retained journals, discoveries and legacy marks remain archived.

## Development and verification

```sh
npm test                     # 27 simulation, biology, determinism and persistence tests
npm run build                # Strict TypeScript check and production bundle
npx playwright install chromium
npm run test:browser         # 10 desktop/mobile browser regressions
npm run profile              # Ten-minute headless simulation benchmark
npm run format:check
```

The development build exposes **Developer tools** in the footer. It shows population counts, food fitness, births/deaths, mutation usage and simulation timing. Commands include:

```text
/energy 90
/biomass 30
/points 5
/mutation predatory-jaw
/reproduce
/drought
/bloom
/advance 30
/die
/spawn grazer
/population stalker 4
```

In development only, `window.lifeform.snapshot()` returns a copy of the state; `window.lifeform.command(text)` and `window.lifeform.metrics()` support local regression testing and balancing. The production build excludes this interface and developer UI.

See [architecture and content workflow](docs/ARCHITECTURE.md), [playtest guide and current limits](docs/PLAYTEST.md), and [third-party notices](docs/THIRD_PARTY.md).

This is a prototype for playtesting the biological loop. Civilization and later eras should follow only after that loop earns them.

## License

Code: [MIT](LICENSE). Bundled DM Sans and Manrope fonts: SIL Open Font License 1.1; full notices are in `public/licenses/` and included in production builds.
