
# LIFEFORM
## Build a Living Creature

**Genre:** Evolution + Roguelite + Ecosystem Simulation + RPG + Exploration\
**Platform:** Mobile-first, expandable to PC\
**Perspective:** 2D/2.5D or lightweight 3D\
**Primary fantasy:** *"I created this creature, watched it survive, and eventually built an entire civilization from it."*

---

# 1. PRODUCT VISION

Build a long-term evolution game in which the player controls a lineage rather than a conventional character.

The game begins with an extremely primitive organism.

The player:

```text
Explore
   ↓
Find energy/resources
   ↓
Eat / absorb / hunt
   ↓
Survive environmental dangers
   ↓
Earn mutation opportunities
   ↓
Modify organism
   ↓
Reproduce
   ↓
Pass traits to offspring
   ↓
Expand population
   ↓
Discover new environments
   ↓
Encounter evolutionary pressures
   ↓
Become increasingly complex
```

Eventually the player's lineage can progress through:

```text
Primitive organism
      ↓
Multicellular organism
      ↓
Animal
      ↓
Specialized species
      ↓
Highly intelligent organism
      ↓
Early society
      ↓
Tribe
      ↓
Civilization
      ↓
Industrial civilization
      ↓
Advanced civilization
      ↓
Spacefaring civilization
```

However, **do not implement all eras initially**.

The first production milestone is:

> Make controlling, evolving, and reproducing one creature species so compelling that the game is enjoyable before civilization exists.

---

# 2. DESIGN PILLARS

Everything implemented must reinforce these pillars.

## Pillar 1 — Every mutation should matter

Mutations cannot merely be cosmetic.

A new organ should change one or more:

- movement capabilities
- energy consumption
- food sources
- combat behavior
- defense
- perception
- reproduction
- environmental tolerance
- traversal
- hunting strategy
- social behavior

Example:

```text
Eye
+ better vision
+ detects predators earlier
+ detects prey from farther away
- energy cost
```

---

## Pillar 2 — The creature is the character

Do not use a normal RPG character with creature cosmetics attached.

The organism itself is the build.

Its body determines:

- abilities
- movement
- attack
- defense
- senses
- weaknesses
- diet
- habitat
- energy requirements
- reproduction strategy

---

# 3. CORE GAME LOOP

The moment-to-moment loop:

```text
Explore
   ↓
Locate resources
   ↓
Consume resources
   ↓
Avoid / fight threats
   ↓
Accumulate biological energy
   ↓
Find mutation opportunity
   ↓
Mutate
   ↓
Continue surviving
   ↓
Reproduce
   ↓
Offspring inherit traits
   ↓
Population grows
```

The medium-term loop:

```text
Survive
→ establish territory
→ reproduce
→ specialize
→ discover biome
→ adapt
→ defeat ecological threats
→ unlock evolutionary branches
```

The long-term loop:

```text
Species development
→ biome discovery
→ evolutionary milestones
→ species tree
→ genetic archive
→ new body plans
→ new ecosystems
→ new eras
```

---

# 4. IMPORTANT ROGUELITE STRUCTURE

Do not make the entire game a conventional permadeath roguelike.

Use a **soft roguelite lineage model**.

A creature can die.

The species does not necessarily die.

For example:

```text
Individual dies
      ↓
Player continues as another member
      ↓
Species knowledge retained
      ↓
Population may have changed
      ↓
Genetic traits remain
```

This is much more appropriate for the fantasy of evolution.

The player should rarely feel:

> "I lost everything."

Instead:

> "That individual died, but the lineage continues."

Persistent progression is particularly important in roguelite design because it allows failed attempts to produce lasting progress rather than feeling completely wasted.

---

# 5. PLAYER IDENTITY

The player controls three connected layers.

## Layer A — Individual

The creature currently being controlled.

Has:

- HP
- energy
- stamina
- hunger
- age
- injuries
- temporary conditions
- current mutations
- current equipment/biological adaptations

---

## Layer B — Species

The player's biological lineage.

Contains:

- genetic traits
- species statistics
- population
- evolutionary history
- discovered mutations
- learned adaptations
- reproductive traits
- biome adaptations

---

## Layer C — Lineage

The permanent meta-progression layer.

Contains:

- discovered species
- extinct ancestors
- discovered organs
- discovered mutations
- discovered ecosystems
- evolutionary milestones
- achievements
- genetic archive
- historical events

---

# 6. THE MOST IMPORTANT SYSTEM: ORGANISM CONSTRUCTION

Build the creature using modular biological components.

Do NOT hardcode every creature.

Create a generic body architecture.

Example:

```text
Body
 ├── Core
 ├── Head
 │    ├── Mouth
 │    ├── Eyes
 │    ├── Sensory organ
 │    └── Weapon
 │
 ├── Locomotion
 │    ├── Leg
 │    ├── Fin
 │    ├── Wing
 │    └── Tentacle
 │
 ├── Defense
 │    ├── Armor
 │    ├── Spikes
 │    ├── Shell
 │    └── Camouflage
 │
 ├── Internal
 │    ├── Digestive organ
 │    ├── Energy organ
 │    ├── Respiratory organ
 │    └── Storage organ
 │
 └── Special
      ├── Poison gland
      ├── Electric organ
      ├── Regeneration organ
      └── Bioluminescence
```

Every organ is data-driven.

---

# 7. ORGAN DATA MODEL

Each organ should have a definition similar to:

```text
OrganDefinition

Id
Name
Category
BodySlot
Prerequisites

Health
Mass
EnergyCost

MovementModifier
AttackModifier
DefenseModifier

VisionModifier
HearingModifier
SmellModifier

TemperatureTolerance
PressureTolerance
ToxicityTolerance

FoodCapabilities

SpecialAbilities

MutationChildren

VisualDefinition
AnimationDefinition
AudioDefinition
```

Never put these values directly inside gameplay code.

---

# 8. BODY BUDGET

Every creature should have biological constraints.

Examples:

- body mass
- energy consumption
- oxygen requirement
- food requirement
- metabolic efficiency
- movement efficiency
- reproductive cost

This prevents players from simply selecting every powerful organ.

Example:

```text
Wings
+ flight
+ aerial mobility

BUT

+ high energy consumption
+ increased food requirement
+ fragile bones
```

This creates meaningful tradeoffs.

---

# 9. MUTATION SYSTEM

Mutations are the primary progression system.

Create mutation categories:

### Physical

- larger body
- smaller body
- longer limbs
- stronger muscles
- thicker skin
- flexible body

### Offensive

- teeth
- claws
- spikes
- venom
- electricity
- crushing jaw
- projectile attack

### Defensive

- armor
- shell
- camouflage
- regeneration
- toxin resistance

### Sensory

- vision
- night vision
- thermal vision
- smell
- vibration detection
- echolocation

### Locomotion

- walking
- crawling
- swimming
- climbing
- jumping
- gliding
- flying

### Metabolism

- photosynthesis
- carnivorous digestion
- herbivorous digestion
- omnivorous digestion
- toxin digestion
- mineral consumption

### Reproductive

- faster reproduction
- larger offspring
- multiple offspring
- eggs
- live birth
- parental care
- cloning-like reproduction

---

# 10. MUTATION TREE

Avoid a simple linear tech tree.

Create a branching evolutionary graph.

Example:

```text
Basic Mouth
     │
     ├── Small Teeth
     │      │
     │      ├── Sharp Teeth
     │      │      └── Predator Jaw
     │      │
     │      └── Serrated Teeth
     │
     ├── Filter Mouth
     │      └── Filter Feeder
     │
     └── Crushing Mouth
            └── Heavy Jaw
```

Another:

```text
Basic Locomotion
      │
      ├── Legs
      │    ├── Fast Legs
      │    ├── Strong Legs
      │    └── Climbing Legs
      │
      ├── Fins
      │    ├── Fast Swimming
      │    └── Deep Diving
      │
      └── Wings
           ├── Gliding
           ├── Flying
           └── High-Speed Flight
```

The tree should contain mutually incompatible paths.

This is what creates replayability.

---

# 11. EVOLUTIONARY SPECIALIZATIONS

Create recognizable evolutionary archetypes.

Examples:

## Predator

```text
Speed
+
Vision
+
Teeth
+
Claws
```

## Ambush Predator

```text
Camouflage
+
Stealth
+
Powerful attack
```

## Tank

```text
Armor
+
Huge HP
+
Low speed
```

## Scavenger

```text
Strong smell
+
Efficient digestion
+
Disease resistance
```

## Herbivore

```text
Large digestive system
+
Efficient plant digestion
+
Herd behavior
```

## Aquatic Hunter

```text
Fins
+
Pressure resistance
+
Underwater vision
+
Electroreception
```

## Flying Predator

```text
Wings
+
Light body
+
Vision
+
Aerial attack
```

Do not force these classes.

The player should naturally create them.

---

# 12. ECOLOGICAL RESOURCES

The world must contain a food web.

Start simple.

```text
Sunlight
 ↓
Plants
 ↓
Herbivores
 ↓
Predators
 ↓
Scavengers
 ↓
Decomposers
```

Add alternative ecosystems later.

Resources:

- sunlight
- plants
- fruit
- algae
- microorganisms
- insects
- small animals
- large animals
- carrion
- minerals
- toxic materials

Every species should have preferred food.

---

# 13. FOOD WEB SIMULATION

Represent ecological relationships explicitly.

```text
Species A
eats
Species B

Species C
competes with
Species A

Species D
parasitizes
Species A

Species E
symbiotic with
Species A
```

This produces an actual ecosystem rather than a collection of enemies.

---

# 14. SPECIES AI

AI species need goals.

Each species evaluates:

```text
Food availability
Predator threat
Competition
Temperature
Water
Shelter
Population density
Reproduction opportunity
Territory quality
```

Use utility-based decision making.

Example:

```text
IF hunger high
    seek food

IF predator detected
    flee

IF health high AND prey nearby
    hunt

IF reproductive readiness high
    seek mate

IF territory dangerous
    migrate
```

Avoid writing a giant state machine.

Use modular behavior priorities.

---

# 15. POPULATION SIMULATION

This is one of the most important performance systems.

Do NOT simulate every creature in the entire world continuously.

Use two levels.

## Near simulation

When near the player:

```text
Full AI
Physics
Movement
Combat
Animation
Perception
```

## Far simulation

When far from the player:

```text
Population counts
Food availability
Birth rate
Death rate
Migration
Predation
Environmental pressure
```

Example:

```text
Deer population = 812

Births = +41
Predation = -26
Starvation = -9
Disease = -3

New population = 815
```

This hybrid simulation is essential for a mobile game.

The underlying idea is similar to the challenges addressed by evolutionary simulators such as Thrive's automatic evolution system.

---

# 16. EVOLUTION SIMULATION

Do not simulate literal millions of generations.

Use evolutionary events.

For each species calculate:

```text
Food fitness
Combat fitness
Defense fitness
Mobility fitness
Reproduction fitness
Environmental fitness
```

Then:

```text
Fitness
→ population pressure
→ mutation probability
→ population change
```

Example:

A drought occurs.

```text
Water ↓

Aquatic species:
fitness -40%

Water-efficient species:
fitness +15%

Burrowing species:
fitness +8%

Migratory species:
fitness +12%
```

Population numbers change accordingly.

---

# 17. ENVIRONMENTAL PRESSURES

Create dynamic environmental pressures.

Examples:

- drought
- flood
- winter
- heat wave
- volcanic eruption
- wildfire
- disease outbreak
- toxic contamination
- food shortage
- predator invasion
- new species introduction
- asteroid event
- migration
- sea-level changes

These events should alter which adaptations are valuable.

---

# 18. BIOMES

Start with approximately 6.

### Grassland

Open terrain.

High visibility.

Large herbivore populations.

### Forest

Dense vegetation.

Ambush predators.

Climbing.

### Swamp

Poison.

Disease.

Slow movement.

### Ocean

Swimming.

Depth.

Pressure.

Different food layers.

### Desert

Extreme heat.

Water scarcity.

Nocturnal creatures.

### Mountain

Elevation.

Cold.

Climbing.

Later add:

- Arctic
- volcanic
- underground
- coral reef
- deep ocean
- rainforest
- caves
- alien environments

---

# 19. WORLD GENERATION

Build worlds from deterministic seeds.

```text
WorldSeed
+
BiomeSeed
+
RegionSeed
+
SpeciesSeed
```

The same seed must reproduce the same world.

Generate:

- terrain
- climate
- resources
- plants
- species
- rivers
- mountains
- caves
- migration paths
- points of interest

This makes debugging and sharing much easier.

---

# 20. REGION STRUCTURE

Use a hierarchy:

```text
World
 ├── Continent
 │    ├── Region
 │    │    ├── Biome
 │    │    │    ├── Habitat
 │    │    │    └── Territory
```

The player does not need to see the entire world.

Reveal it progressively.

---

# 21. EXPLORATION

Exploration should reveal:

- new food
- new species
- new mutations
- new environmental hazards
- hidden habitats
- rare organisms
- ancient fossils
- evolutionary events
- caves
- nests
- ruins
- unique resources

Every new region should answer:

> "What can I discover here that I could not experience before?"

---

# 22. DISCOVERY SYSTEM

Create a biological encyclopedia.

Track:

```text
Species discovered
Organ discovered
Food discovered
Disease discovered
Biome discovered
Predator discovered
Mutation discovered
Fossil discovered
Symbiosis discovered
Environmental event discovered
```

Discovery itself should be rewarding.

---

# 23. REPRODUCTION

Reproduction is the bridge between gameplay and evolution.

Player should eventually choose:

```text
Mate
→ offspring
→ inherited traits
→ mutation chance
→ phenotype
→ juvenile
→ adult
```

Introduce genetics gradually.

Early game:

```text
Mutation choice
```

Later:

```text
Parent A genes
+
Parent B genes
+
mutation
=
offspring
```

---

# 24. GENETICS

Do not create an unnecessarily realistic genetic simulator.

Use gameplay-oriented genes.

Example:

```text
Gene:
BODY_SIZE

Alleles:
Small
Medium
Large
```

Traits can be:

- dominant
- recessive
- polygenic
- mutation-driven

Later introduce:

```text
Gene combinations
+
trait interactions
=
unexpected phenotypes
```

This creates experimentation.

---

# 25. PHENOTYPE SYSTEM

Genotype determines phenotype.

Example:

```text
Gene:
WingSize = 80
BodyMass = 35
MusclePower = 70

Result:

Strong flight
High energy consumption
Good maneuverability
```

The player should be able to inspect why their creature behaves differently.

---

# 26. SPECIES SPLITTING

One of the most exciting systems should be speciation.

Example:

Your original species:

```text
Species A
```

Population migrates into two environments.

```text
Population 1 → forest
Population 2 → ocean
```

Over many generations:

```text
Species A
 ├── Species A-Forest
 └── Species A-Ocean
```

The player can eventually follow either lineage.

This creates a genuine tree of life.

---

# 27. EXTINCTION

Species can become extinct.

But avoid arbitrary punishment.

Extinction should happen because of understandable causes.

Example:

```text
Food source disappears
+
species has poor adaptation
+
population falls
=
extinction
```

The game should record:

```text
Extinct Species #42

Cause:
Global drought

Final population:
0

Last known region:
Northern Grasslands
```

This makes the world feel historical.

---

# 28. FOSSIL / HISTORY SYSTEM

Whenever a species becomes extinct, generate a historical record.

Example:

```text
Species:
Velora

Origin:
Oceanic

Peak population:
18,420

Major adaptations:
- armor
- electroreception
- deep diving

Extinction:
Massive volcanic event
```

The player should eventually be able to inspect the entire history of life.

---

# 29. SYMBIOSIS

Later introduce relationships that are neither predator nor prey.

Examples:

```text
Creature
+
cleaning organism
=
parasite removal

Plant
+
pollinating insect
=
increased reproduction

Large creature
+
small scavenger
=
mutual benefit
```

Eventually some symbiotic relationships can become evolutionary dependencies.

---

# 30. PARASITES AND DISEASE

Create a separate biological progression system.

Diseases have:

```text
Transmission
Severity
Incubation
Environmental survival
Host preference
Mutation rate
```

Creatures develop:

```text
Immune system
Disease resistance
Behavioral avoidance
Symbiotic immunity
```

Disease outbreaks become ecosystem events.

---

# 31. BEHAVIORAL EVOLUTION

Not all evolution should be physical.

Introduce behavioral traits:

- territorial
- social
- solitary
- nocturnal
- migratory
- pack hunting
- herd behavior
- parental care
- nest building
- scavenging
- cooperative hunting

Eventually intelligence emerges from this layer.

---

# 32. SOCIAL ORGANIZATION

Once creatures become sufficiently intelligent, unlock:

```text
Family
↓
Group
↓
Pack
↓
Tribe
↓
Settlement
↓
Civilization
```

Do NOT suddenly replace the creature game with a Civilization clone.

The creature remains important.

---

# 33. INTELLIGENCE THRESHOLD

Intelligence should be an evolutionary system.

Example factors:

```text
Brain complexity
+
sensory complexity
+
social behavior
+
memory
+
manipulation capability
+
communication
```

Eventually:

```text
Intelligence > threshold
```

unlocks the next era.

---

# 34. INTELLIGENCE SHOULD CHANGE GAMEPLAY

Do not merely show:

> "Congratulations! Intelligence unlocked."

Instead introduce entirely new mechanics.

Early intelligence:

- memory
- learning
- simple tools

Advanced intelligence:

- communication
- cooperation
- planning
- shelter

Civilization:

- agriculture
- construction
- specialization
- trade

---

# 35. TOOL SYSTEM

Tools should be another modular system.

Examples:

```text
Stone
Stick
Bone
Fiber
Fire
Metal
```

Tools provide:

- hunting
- gathering
- construction
- defense
- crafting
- transportation

---

# 36. PROFESSIONS

When society develops:

```text
Hunter
Gatherer
Farmer
Builder
Craftsman
Medic
Scout
Warrior
Scholar
Trader
Engineer
```

The species begins developing specialization.

---

# 37. CIVILIZATION SYSTEM

Civilization should eventually have:

```text
Population
Food
Water
Housing
Resources
Technology
Culture
Knowledge
Trade
Security
Territory
```

But preserve the biological identity.

For example:

A species with:

```text
High intelligence
+
aquatic adaptation
+
poor terrestrial movement
```

might create:

```text
Floating settlements
Underwater structures
Aquatic agriculture
Water transportation
```

The player's evolutionary choices should influence civilization.

---

# 38. TECHNOLOGY TREE

Technology should emerge from the creature's biology and environment.

Branches:

```text
Tools
 ├── Stone
 ├── Bone
 └── Metal

Agriculture
 ├── Plants
 ├── Animal domestication
 └── Aquaculture

Energy
 ├── Fire
 ├── Steam
 ├── Electricity
 └── Advanced energy

Transportation
 ├── Boats
 ├── Vehicles
 ├── Aircraft
 └── Spacecraft
```

---

# 39. CULTURAL EVOLUTION

Eventually add:

- language
- traditions
- architecture
- religion/mythology as fictional cultural systems
- art
- music
- laws
- government
- scientific institutions

These should be generated from gameplay history rather than randomly assigned.

Example:

A species repeatedly surviving floods may develop:

```text
Flood mythology
+
elevated architecture
+
water-management technology
```

---

# 40. SPACE ERA

Only implement after terrestrial gameplay is mature.

Space progression:

```text
Rocket
↓
Orbit
↓
Moon
↓
Planets
↓
Asteroid mining
↓
Orbital habitats
↓
Interplanetary civilization
↓
Advanced space civilization
```

The same lineage continues.

---

# 41. ENDLESS ENDGAME

There should never be a conventional:

> "You won."

Instead, introduce endless objectives.

Examples:

### Evolution challenges

```text
Survive extreme climate
Create flying species
Create deep-sea species
Create apex predator
Create symbiotic species
```

### Civilization challenges

```text
Build first city
Reach global civilization
Reach planetary civilization
```

### Discovery challenges

```text
Discover 100 species
Discover every biome
Discover rare mutations
```

### Survival challenges

```text
Survive mass extinction
Survive disease
Survive climate collapse
```

### Procedural challenges

Generate special worlds with unusual rules.

---

# 42. LEGACY SYSTEM

When a lineage dies completely, do not simply delete it.

Save its legacy.

Example:

```text
LINEAGE #184

Origin:
Shallow Ocean

Peak:
Terrestrial Apex Predator

Major adaptations:
- armor
- venom
- night vision

Civilization:
Never achieved

Extinction:
Ice Age

Duration:
2.7 million simulated years
```

This makes every run part of a larger personal history.

---

# 43. META-PROGRESSION

Create persistent progression outside the current lineage.

Possible currencies:

### Evolution Points

Used to unlock broad evolutionary possibilities.

### Discovery Points

Earned by discovering new species/biomes.

### Legacy Points

Earned from completing major evolutionary milestones.

Do NOT make meta-progression purely:

```text
+10% damage
+20% health
+30% speed
```

Prefer unlocking:

- new mutation categories
- new starting organisms
- new biomes
- new environmental events
- new genetic mechanics
- new species archetypes
- new world modifiers

This preserves meaningful run-level decisions instead of turning progression into an unlock treadmill.

---

# 44. STARTING ORGANISMS

Eventually allow multiple starting paths.

Examples:

```text
Microbe
Photosynthetic organism
Predatory microbe
Filter feeder
Parasitic organism
Colonial organism
```

Each produces radically different evolution paths.

---

# 45. BUILD ARCHETYPES

Track emergent builds.

Examples:

```text
The Hunter
The Giant
The Swarm
The Parasite
The Survivor
The Scavenger
The Flyer
The Deep-Sea Creature
The Tank
The Speedster
The Poisoner
The Symbiote
The Colony
```

Do not make these explicit classes.

They should be inferred from the creature's configuration.

---

# 46. PROCEDURAL EVENTS

Create a dynamic event engine.

Example:

```text
EVENT:
Severe drought

Effects:
Water availability -60%
Plant growth -30%
Migration +40%
Aquatic survival -50%

Duration:
180 seconds

Possible responses:
Migration
Mutation
Adaptation
Predation
```

Other events:

- meteor
- wildfire
- plague
- superstorm
- volcanic eruption
- invasive species
- food bloom
- ice age
- warming
- toxic bloom

---

# 47. QUEST SYSTEM

Avoid traditional RPG quests initially.

Use ecosystem objectives.

Examples:

```text
Survive 5 minutes
Eat 20 units of food
Escape three predators
Reach the northern biome
Reproduce
Produce an offspring with a mutation
Discover a rare organism
Establish territory
```

Later:

```text
Become apex predator
Survive extinction event
Create first settlement
Discover fire
Reach the ocean
```

---

# 48. BOSS / APEX CREATURES

Introduce rare apex organisms.

They are not fantasy bosses in the traditional sense.

They are ecosystem events.

Example:

```text
THE TITAN

Mass: 800
Health: 10,000
Diet: Carnivore
Territory: Northern Plains

Behavior:
Extremely territorial

Weakness:
Low mobility
```

Defeating or avoiding one becomes a major milestone.

---

# 49. COMBAT

Combat should be biologically grounded.

Actions depend on organs.

Examples:

```text
Bite
Claw
Ram
Tail strike
Poison
Electric shock
Spit
Grab
Constriction
Charge
Pounce
```

No generic RPG skill bar initially.

The creature's body determines its combat kit.

---

# 50. STATUS EFFECTS

Implement a generic status system.

Examples:

```text
Poisoned
Bleeding
Burning
Frozen
Diseased
Exhausted
Starving
Stunned
Paralyzed
Camouflaged
Regenerating
```

This will support many future mechanics.

---

# 51. MOVEMENT

Movement should feel exceptional.

The player should immediately feel the difference between:

```text
tiny worm
```

and

```text
heavy armored quadruped
```

and

```text
fast aquatic predator
```

and

```text
flying creature
```

Movement is one of the primary rewards of evolution.

---

# 52. ANIMATION PHILOSOPHY

Use procedural animation wherever practical.

Instead of manually animating every creature:

```text
Body skeleton
+
locomotion type
+
movement speed
+
limb count
+
body size
=
procedural animation
```

Create animation controllers for:

- walking
- running
- swimming
- flying
- crawling
- climbing
- attacking
- eating
- sleeping
- reproducing
- injured movement

---

# 53. VISUAL STYLE

Do not attempt photorealism.

Use:

- attractive stylized creatures
- strong silhouettes
- readable colors
- exaggerated animation
- satisfying particle effects
- subtle environmental animation

The creature must be visually recognizable even when tiny on a mobile screen.

---

# 54. MOBILE-FIRST UX

Controls should be extremely simple.

Possible control models:

### Direct

Virtual joystick + contextual action.

### Touch

Tap destination.

### Hybrid

Joystick movement + automatic context actions.

The first prototype should test all three.

Avoid filling the screen with buttons.

---

# 55. CAMERA

Use adaptive camera distance.

Small creature:

```text
closer camera
```

Large creature:

```text
farther camera
```

Fast movement:

```text
camera expands
```

Combat:

```text
camera prioritizes readability
```

---

# 56. UI

Primary HUD:

```text
Health
Energy
Hunger
Age
Current objective
Mini-map
Species population
```

Secondary screens:

```text
Creature
Mutations
Species
World
Discovery
Genetics
History
```

---

# 57. CREATURE EDITOR

The creature editor should become one of the game's major attractions.

Player can:

```text
Add organ
Remove organ
Move organ
Upgrade organ
Change body proportions
Change coloration
Change sensory configuration
```

But always enforce biological constraints.

---

# 58. EDITOR FEEDBACK

Every change must immediately show:

```text
Health
Energy
Speed
Attack
Defense
Vision
Food requirement
Mass
Temperature tolerance
Swimming
Flying
Climbing
```

Use before/after comparisons.

Example:

```text
ADD ARMOR

Defense:
+34%

Mass:
+21%

Speed:
-9%

Energy consumption:
+13%
```

---

# 59. CREATURE BUILD VALIDATION

The game should prevent impossible configurations.

Examples:

```text
Flying requires:
- wings
- sufficient lift
- acceptable mass

Swimming requires:
- aquatic locomotion OR
- sufficient buoyancy

Carnivory requires:
- appropriate digestive capability
```

Show the player why something is impossible.

---

# 60. ECONOMY

Keep the early economy biological.

Currencies:

```text
Energy
Biomass
Genetic Material
Discovery
Legacy
```

Avoid traditional gold too early.

Later civilization can introduce:

```text
Food
Materials
Currency
Knowledge
Energy
```

---

# 61. CRAFTING

Crafting should only appear when biologically/culturally appropriate.

Early:

```text
Nest
Shelter
Food storage
```

Intelligent era:

```text
Tools
Weapons
Buildings
Farming equipment
```

Civilization era:

```text
Machines
Infrastructure
Industry
```

---

# 62. SAVE SYSTEM

Save:

```text
World seed
Species tree
Current creature
Population
Biome state
Discoveries
Mutation unlocks
Events
History
Legacy
Civilization state
```

Use versioned save data.

Every save must have:

```text
SchemaVersion
```

Build migration support from the beginning.

---

# 63. DETERMINISM

All procedural systems should use explicit RNG streams.

Example:

```text
WorldRNG
SpeciesRNG
MutationRNG
EventRNG
LootRNG
SimulationRNG
```

Never use one global random generator.

This makes:

- replaying
- debugging
- balancing
- bug reports
- procedural worlds

far easier.

---

# 64. ARCHITECTURE

Separate the game into independent systems.

Recommended architecture:

```text
Core
 ├── GameState
 ├── Time
 ├── RNG
 ├── Events
 └── Save

Biology
 ├── Organ
 ├── Body
 ├── Genetics
 ├── Mutation
 ├── Phenotype
 └── Reproduction

Simulation
 ├── Ecosystem
 ├── Population
 ├── Species
 ├── FoodWeb
 ├── Climate
 └── Evolution

Creature
 ├── Controller
 ├── Movement
 ├── Combat
 ├── Senses
 ├── Needs
 └── Animation

World
 ├── Generation
 ├── Terrain
 ├── Biomes
 ├── Regions
 └── Resources

AI
 ├── Perception
 ├── Utility
 ├── Goals
 ├── Navigation
 └── Behavior

Progression
 ├── MutationTree
 ├── Discovery
 ├── Milestones
 ├── Legacy
 └── MetaProgression

Civilization
 ├── Society
 ├── Technology
 ├── Culture
 ├── Economy
 └── Settlement

Presentation
 ├── UI
 ├── VFX
 ├── Audio
 └── Animation
```

---

# 65. DATA-DRIVEN DESIGN

Almost everything should be defined through data.

Create definitions for:

```text
Organ
Mutation
Species
Biome
Resource
Disease
StatusEffect
EnvironmentalEvent
CreatureBehavior
Technology
Profession
Building
Civilization
```

Do not hardcode content into systems.

This is critical because the game is intended to receive years of content updates.

---

# 66. CONTENT PIPELINE

A designer/developer should be able to add:

```text
New organ
```

without changing core simulation code.

Likewise:

```text
New biome
New species
New mutation
New disease
New event
```

should require primarily data/configuration plus optional behavior modules.

---

# 67. PERFORMANCE ARCHITECTURE

Mobile performance is a first-class requirement.

Implement:

### Simulation LOD

```text
Level 0:
Full simulation

Level 1:
Simplified AI

Level 2:
Population simulation

Level 3:
Statistical simulation
```

### Spatial partitioning

Use:

```text
Grid
Spatial hash
QuadTree
```

depending on engine needs.

### Object pooling

Pool:

- creatures
- projectiles
- particles
- food
- effects

### Update frequency

Do not update every system every frame.

Example:

```text
Physics:
60 Hz

Creature AI:
10–20 Hz

Needs:
2–5 Hz

Population:
0.2–1 Hz

Far simulation:
event-driven
```

---

# 68. SIMULATION CLOCK

Create a centralized simulation clock.

Support:

```text
Pause
Normal
Fast
Very Fast
```

Later:

```text
Offline simulation
```

The player should be able to observe generations passing relatively quickly.

---

# 69. TESTING

The simulation needs unusually strong automated testing.

Create tests for:

### Biology

```text
Organ stats
Mutation prerequisites
Body constraints
Genetic inheritance
Phenotype calculation
```

### Ecosystem

```text
Food chain
Population growth
Population collapse
Predation
Reproduction
Extinction
```

### World

```text
Seed determinism
Biome generation
Resource generation
```

### Progression

```text
Unlock conditions
Milestones
Legacy
```

---

# 70. SIMULATION VALIDATION TOOLS

Create a developer-only simulation dashboard.

Display:

```text
Species
Population
Births
Deaths
Food
Predation
Migration
Fitness
Mutation
Extinction
```

Allow:

```text
Pause
Fast-forward
Spawn species
Kill species
Change climate
Trigger disease
Trigger disaster
Change food abundance
```

This tool will save enormous development time.

---

# 71. DEBUG VISUALIZATION

Add toggles for:

```text
Food zones
Predator territories
Species territories
Navigation
Vision cones
Smell radius
Population density
Migration
Food chains
Temperature
Disease spread
```

---

# 72. ANALYTICS

Track gameplay telemetry.

Important events:

```text
GameStarted
CreatureCreated
CreatureDied
MutationSelected
MutationRejected
FoodConsumed
SpeciesCreated
SpeciesExtinct
BiomeDiscovered
Reproduction
EvolutionMilestone
CivilizationMilestone
SessionEnded
```

Measure:

```text
Average session
First death
First reproduction
First mutation
First biome discovery
Mutation choices
Creature deaths
Return sessions
```

Do not use analytics to manipulate players.

Use them to identify confusion, boring sections, and balance problems.

---

# 73. FIRST PLAYABLE PROTOTYPE

Do NOT implement civilization.

Do NOT implement space.

Do NOT implement genetics complexity.

Do NOT implement dozens of biomes.

Build:

```text
1 biome
1 creature
10–15 organs
20 mutations
5 AI species
5 food types
basic reproduction
basic population simulation
basic procedural map
basic evolution
basic creature editor
```

The prototype is successful if:

> Playing the same creature for 10–20 minutes is genuinely enjoyable.

---

# 74. MVP

MVP should contain:

### World

- 3 biomes
- procedural regions
- day/night
- weather

### Biology

- 30+ organs
- 75+ mutations
- modular creature body
- metabolism
- reproduction
- genetics

### Ecosystem

- 15–25 species
- food web
- predator/prey
- population simulation
- diseases
- environmental events

### Progression

- species tree
- discovery encyclopedia
- legacy
- mutation tree

### Gameplay

- exploration
- eating
- hunting
- fleeing
- reproduction
- mutation
- death
- species continuation

---

# 75. PHASE 1 — FOUNDATION

Implement:

```text
Project architecture
Game state
Save system
RNG
Time system
Entity system
Data definitions
Basic world
```

Deliverable:

> Empty but functioning world with deterministic save/load.

---

# 76. PHASE 2 — CREATURE

Implement:

```text
Creature body
Organs
Stats
Needs
Movement
Health
Energy
Hunger
Age
Death
```

Deliverable:

> Player can control a primitive creature.

---

# 77. PHASE 3 — FOOD

Implement:

```text
Resources
Plants
Food consumption
Digestion
Energy
Hunger
Respawn
```

Deliverable:

> Player can survive by finding and consuming food.

---

# 78. PHASE 4 — COMBAT

Implement:

```text
Attack
Damage
Defense
Hit detection
Death
Predator AI
Escape
```

Deliverable:

> Creature survival becomes skill-based.

---

# 79. PHASE 5 — MUTATION

Implement:

```text
Mutation definitions
Mutation tree
Mutation UI
Biological constraints
Stat recalculation
```

Deliverable:

> Player can fundamentally transform their creature.

---

# 80. PHASE 6 — REPRODUCTION

Implement:

```text
Mating
Offspring
Inheritance
Mutation
Growth
Population
```

Deliverable:

> The player experiences the first real evolutionary cycle.

---

# 81. PHASE 7 — ECOSYSTEM

Implement:

```text
AI species
Food web
Predation
Competition
Population simulation
Environmental pressure
```

Deliverable:

> The world survives without the player.

---

# 82. PHASE 8 — SPECIES TREE

Implement:

```text
Species records
Evolutionary history
Speciation
Extinction
Fossils
Lineage visualization
```

Deliverable:

> The player can inspect the history of their species.

---

# 83. PHASE 9 — WORLD EXPANSION

Implement:

```text
Multiple regions
Biome transitions
Climate
Migration
Rare habitats
World events
```

Deliverable:

> Exploration becomes a major long-term objective.

---

# 84. PHASE 10 — META-PROGRESSION

Implement:

```text
Legacy
Discovery
Permanent unlocks
Starting organisms
New mutation categories
New world modifiers
```

Deliverable:

> Every failed lineage contributes to future runs.

---

# 85. PHASE 11 — INTELLIGENCE

Only begin after the biological game is strong.

Implement:

```text
Brain
Learning
Memory
Communication
Tool manipulation
Social behavior
```

Deliverable:

> Players can deliberately evolve toward intelligence.

---

# 86. PHASE 12 — SOCIETY

Implement:

```text
Families
Groups
Tribes
Shelters
Food storage
Agriculture
Professions
Trade
```

Deliverable:

> The player's species begins transforming its environment.

---

# 87. PHASE 13 — CIVILIZATION

Implement:

```text
Settlements
Technology
Culture
Economy
Infrastructure
Politics as an internal game simulation
Territory
Cities
```

Deliverable:

> Biological evolution now interacts with civilization development.

---

# 88. PHASE 14 — INDUSTRIAL ERA

Implement:

```text
Machines
Factories
Electricity
Transportation
Mass production
Scientific institutions
```

---

# 89. PHASE 15 — SPACE

Implement:

```text
Rockets
Orbit
Space stations
Planetary exploration
Asteroid mining
Interplanetary civilization
```

---

# 90. PHASE 16 — ENDLESS CONTENT

Build procedural systems capable of producing:

```text
Worlds
Species
Mutations
Events
Civilizations
Cultures
Technology branches
Challenges
```

The game should become a content-generation platform rather than requiring every creature to be manually authored.

---

# 91. CONTENT SCALING TARGET

Long-term target:

```text
100+ organs
500+ mutations
100+ species archetypes
50+ environmental events
20+ biomes
1000+ procedural species combinations
Multiple civilization technology branches
```

These are targets, not launch requirements.

Prioritize systemic interactions over raw content count.

---

# 92. EMERGENT STORY

The game should generate stories automatically.

Example:

```text
Year 0
A tiny organism appears.

Year 120
It develops armor.

Year 380
A drought eliminates its primary food.

Year 420
A branch evolves omnivory.

Year 900
The species becomes terrestrial.

Year 2,300
One population becomes nocturnal.

Year 4,100
A predator drives another branch extinct.

Year 15,000
Intelligence emerges.

Year 17,000
The species builds its first settlement.
```

The player should feel:

> "I witnessed this."

That is much more powerful than a conventional quest narrative.

---

# 93. GENERATED HISTORICAL EVENTS

Record important events automatically.

Examples:

```text
First Flight
First Hunt
First Tool
First Settlement
First City
First Disease
First Extinction
First Agriculture
First Civilization
First Ocean Crossing
First Industrial Machine
First Spaceflight
```

Display these in a timeline.

---

# 94. PLAYER JOURNAL

Automatically generate a lineage journal.

Example:

```text
THE HISTORY OF THE VELARI

Generation 1:
Primitive aquatic organism.

Generation 17:
First armor mutation.

Generation 43:
Moved into shallow land environments.

Generation 89:
Developed primitive limbs.

Generation 130:
First successful terrestrial reproduction.

Generation 721:
First social behavior detected.

Generation 4,103:
Intelligence threshold reached.
```

This becomes a major emotional component.

---

# 95. DISCOVERY REWARDS

Discovery should unlock information and gameplay.

For example:

Discovering deep-sea life:

```text
+ Deep Sea biome
+ Pressure adaptation
+ Bioluminescence mutations
+ Deep Sea starting condition
```

Discovering parasites:

```text
+ Parasite system
+ Immune mutations
+ Symbiosis
```

---

# 96. LIVE CONTENT STRATEGY

The architecture should allow future updates to add:

```text
New biome
New evolutionary branch
New creature parts
New environmental disaster
New species
New disease
New civilization technology
New challenge
```

without rewriting core systems.

Potential major content expansions:

### Ocean Update

Deep ocean + marine evolution.

### Ancient World

Prehistoric ecosystems.

### Civilization Update

Cities and technology.

### Space Update

Interplanetary evolution.

### Alien Life Update

Completely different evolutionary rules.

---

# 97. IMPORTANT DESIGN RULE: DO NOT OVER-SIMULATE

Scientific accuracy is not the goal.

The goal is:

```text
Believable
Understandable
Predictable enough to learn
Surprising enough to discover
```

Players need to understand:

> "My creature became faster because I invested in lighter limbs."

They do not need to understand a complete biological simulation.

---

# 98. IMPORTANT DESIGN RULE: CAUSALITY

Every major change should have a visible cause.

Bad:

```text
Population randomly decreases.
```

Good:

```text
Drought
→ plants decrease
→ herbivores lose food
→ herbivore population decreases
→ predators lose prey
→ predator population decreases
→ scavengers increase
```

The player should be able to inspect this chain.

---

# 99. IMPORTANT DESIGN RULE: PLAYER AGENCY

Never make evolution completely automatic.

The game should provide evolutionary pressures.

The player chooses how to respond.

Example:

```text
Desertification
```

Possible responses:

```text
Develop water storage
OR
Become nocturnal
OR
Become migratory
OR
Develop heat resistance
OR
Leave the biome
OR
Become a predator
```

There should rarely be one obvious correct answer.

---

# 100. IMPORTANT DESIGN RULE: BUILD DIVERSITY

Two players should be able to reach radically different outcomes.

Example:

Player A:

```text
Tiny
Fast
Poisonous
Nocturnal
Solitary
```

Player B:

```text
Huge
Armored
Slow
Social
Herbivorous
```

Player C:

```text
Aquatic
Electric
Highly intelligent
Tool-using
```

All should be viable.

---

# 101. ANTI-GRIND DESIGN

Do not make players grind thousands of food units simply to unlock the next mutation.

Progress should come from:

```text
Discovery
Survival
Risk
Exploration
Evolution
Mastery
Milestones
```

not repetitive resource farming.

---

# 102. SESSION DESIGN

The game must work in short mobile sessions.

A player should be able to accomplish something meaningful in:

```text
3 minutes
10 minutes
30 minutes
2 hours
```

Examples:

### 3 minutes

Find food and survive.

### 10 minutes

Gain a mutation.

### 30 minutes

Reach a new habitat.

### 2 hours

Create a new species branch.

---

# 103. RETENTION THROUGH CURIOSITY

The strongest retention mechanism should be:

> "What will my creature become?"

Not:

> "I need to grind another 500 coins."

Create visible unknowns:

```text
???
Mutation
???
Species
???
Biome
???
Evolutionary branch
```

---

# 104. PLAYER GOAL STRUCTURE

Always expose approximately:

```text
Immediate goal
Medium-term goal
Long-term goal
```

Example:

```text
Immediate:
Find food.

Medium:
Unlock swimming.

Long:
Reach the Deep Ocean.
```

Later:

```text
Immediate:
Build shelter.

Medium:
Develop agriculture.

Long:
Build civilization.
```

---

# 105. OPTIONAL CHALLENGE WORLDS

After the core game is stable, add special worlds:

```text
Extreme cold
Extreme heat
No sunlight
Predator world
Tiny world
High gravity
Low gravity
Rapid evolution
Mass extinction
Limited food
```

These can create highly replayable scenarios.

---

# 106. DAILY / WEEKLY SYSTEM

If live operations are desired later:

Daily:

```text
Survive in desert
Create flying creature
Discover 3 species
```

Weekly:

```text
Survive an extinction event
Build a civilization
Reach a particular biome
```

Keep these optional and avoid making the game dependent on daily chores.

---

# 107. ACCESSIBILITY

Support:

- scalable UI
- colorblind-friendly indicators
- vibration toggle
- reduced motion
- reduced particles
- audio controls
- text scaling
- left-handed controls
- control customization

Never rely only on color.

---

# 108. AUDIO

Use audio to communicate biology.

Examples:

```text
Creature movement
Heartbeat
Hunger
Predator nearby
Food nearby
Mutation
Evolution milestone
Biome transition
Environmental danger
```

Evolution should have an emotional audio payoff.

---

# 109. VFX

Keep effects readable.

Examples:

```text
Poison → colored particles
Electricity → arcs
Camouflage → visual distortion
Regeneration → biological glow
Mutation → cellular transformation
Evolution → dramatic transformation sequence
```

---

# 110. MAJOR EVOLUTION MOMENTS

Certain mutations should trigger special presentations.

Example:

```text
First successful flight
```

Camera follows creature.

Music changes.

Creature takes off.

The game briefly celebrates:

> **YOUR SPECIES HAS LEARNED TO FLY**

These moments should feel memorable.

---

# 111. MONETIZATION — IF FREE-TO-PLAY

Do not sell biological power directly.

Avoid:

```text
$2 = +20% evolution speed
```

Prefer cosmetic/supportive monetization:

```text
Creature appearance packs
Animation packs
World themes
UI themes
Optional expansion packs
```

The core evolutionary system should remain fair.

---

# 112. DEVELOPMENT PRIORITY

The correct priority is:

```text
1. Creature movement
2. Eating
3. Survival
4. Mutation
5. Reproduction
6. Ecosystem
7. Species evolution
8. Exploration
9. Meta-progression
10. Intelligence
11. Civilization
12. Space
```

Never reverse this.

---

# 113. AI AGENT DEVELOPMENT RULES

The coding agent must work incrementally.

For every feature:

```text
Analyze
→ implement
→ compile
→ run tests
→ inspect result
→ fix
→ document
→ commit
```

Never implement several enormous systems simultaneously.

---

# 114. DEFINITION OF DONE

A feature is NOT complete merely because code compiles.

It must have:

- implementation
- tests
- save/load support if stateful
- error handling
- UI where appropriate
- tuning configuration
- documentation
- debug tooling where appropriate
- performance consideration

---

# 115. AGENT DEVELOPMENT LOOP

For each milestone:

```text
1. Read existing architecture.
2. Identify relevant systems.
3. Do not duplicate existing functionality.
4. Design interfaces before implementation.
5. Implement the smallest complete version.
6. Add automated tests.
7. Build the project.
8. Run tests.
9. Profile performance.
10. Fix regressions.
11. Update documentation.
12. Only then continue.
```

---

# 116. DO NOT ALLOW ARCHITECTURAL DEBT

The agent must not:

- hardcode species behavior
- hardcode mutation trees
- duplicate stat calculations
- create giant manager classes
- tightly couple UI and simulation
- put simulation logic inside rendering code
- use magic numbers
- create global mutable state unnecessarily
- implement civilization-specific assumptions inside biological systems

---

# 117. SYSTEM BOUNDARIES

Biology should not know about UI.

Example:

```text
MutationSystem
```

should produce:

```text
MutationResult
```

The UI decides how to display it.

Likewise:

```text
PopulationSimulation
```

should not know how the world renders.

---

# 118. SAVE COMPATIBILITY

Every persistent data model must be versioned.

Example:

```text
SaveVersion 1
SaveVersion 2
SaveVersion 3
```

Provide migration functions.

Never assume old saves can be discarded.

---

# 119. DEBUG COMMANDS

Create developer commands:

```text
/spawn species
/add mutation
/set population
/set hunger
/set energy
/trigger drought
/trigger disease
/trigger extinction
/advance generation
/teleport biome
/set time
```

These are essential for testing.

---

# 120. BALANCING TOOLS

Create an internal dashboard showing:

```text
Mutation pick rate
Creature survival time
Average population
Average reproduction
Species extinction rate
Biome difficulty
Food availability
Average creature lifespan
```

Use this to balance the simulation.

---

# 121. INITIAL CONTENT TARGET

For the first serious playable build:

```text
1 world
3 biomes
10 plant/resource types
10 animal species
1 player lineage
30 organs
50 mutations
10 environmental events
5 diseases/status effects
1 reproduction system
1 species tree
1 discovery encyclopedia
1 legacy system
```

This is enough to prove the game.

---

# 122. SUCCESS CRITERIA FOR THE FIRST RELEASE

The first public version should allow:

```text
Create organism
        ↓
Explore
        ↓
Eat
        ↓
Hunt / flee
        ↓
Mutate
        ↓
Reproduce
        ↓
Raise offspring
        ↓
Explore another biome
        ↓
Encounter new species
        ↓
Adapt
        ↓
Create evolutionary branch
        ↓
Continue lineage
```

The player should finish the first session thinking:

> "I want to see what my species becomes."

That is the core product.

---

# 123. LONG-TERM NORTH STAR

The final experience should feel like:

```text
I am not leveling a character.

I am creating a lineage.

I am not completing quests.

I am surviving history.

I am not collecting equipment.

I am collecting adaptations.

I am not fighting scripted enemies.

I am participating in an ecosystem.

I am not following a linear story.

I am creating the story of my species.
```

---

# 124. FINAL IMPLEMENTATION STRATEGY

The AI agent must follow these rules throughout development:

### Rule 1

Build the smallest playable version first.

### Rule 2

Never implement civilization before the creature game is fun.

### Rule 3

Never simulate everything at full fidelity.

### Rule 4

Prefer systemic interactions over manually scripted content.

### Rule 5

Make every mutation mechanically meaningful.

### Rule 6

Make environmental pressures create interesting decisions.

### Rule 7

Make species history persistent.

### Rule 8

Make player decisions causally affect evolution.

### Rule 9

Keep every major system data-driven.

### Rule 10

Design every system so future content can be added without rewriting the engine.

---

# 125. FIRST IMPLEMENTATION TASK

Start with a vertical slice.

Implement only:

```text
ONE SMALL WORLD
       ↓
ONE BIOME
       ↓
ONE PLAYER CREATURE
       ↓
5 AI SPECIES
       ↓
10 FOOD/RESOURCE TYPES
       ↓
10 ORGANS
       ↓
20 MUTATIONS
       ↓
MOVEMENT
       ↓
EATING
       ↓
HUNTING
       ↓
SURVIVAL
       ↓
REPRODUCTION
       ↓
OFFSPRING
       ↓
MUTATION
       ↓
SPECIES HISTORY
```

Do not proceed to the next major era until this loop is genuinely fun.

The final target is not a collection of disconnected simulation systems.

The target is a **single coherent evolutionary sandbox** where:

```text
Biology
   ↓
creates
   ↓
Behavior
   ↓
creates
   ↓
Survival
   ↓
creates
   ↓
Evolution
   ↓
creates
   ↓
Species
   ↓
creates
   ↓
Intelligence
   ↓
creates
   ↓
Culture
   ↓
creates
   ↓
Civilization
   ↓
creates
   ↓
Technology
   ↓
creates
   ↓
New environments
   ↓
creates
   ↓
new evolutionary pressures
   ↓
which restart the cycle
```

That recursive structure is the key to giving **Lifeform** a potentially enormous content runway rather than making it a game that simply has six increasingly expensive stages.
