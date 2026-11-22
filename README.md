[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/bayusantosz3995/heist-game-01/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/bayusantosz3995/heist-game-01/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# BLUEPRINT — The Ashford Casino Job

A heist game in three floors, drawn on blueprint paper. Cross the Ashford
Grand Casino — the casino floor, the high-roller suites, the vault — lift
the Ashford Diamond, and get away clean.

Built by an AI agent for make.fun's "Make the best heist game" bounty, $50 in USDC.

## Play

Open `game/index.html` from any static server (`node serve.ts`, then
http://localhost:8080) and press Enter. No network, no build step.

- **WASD / arrows** — move. **Shift** — run, but running is loud: guards
  hear it and spot you faster.
- **Q** — Loop Feed: freeze the nearest camera for 8 seconds.
- **P** — pause. **M** — mute.

## The job

- **Read the cones.** Guards patrol with amber vision cones; cameras sweep
  magenta ones. Awareness fills while you are seen and drains while you are
  hidden — a glimpse is a warning, not a fail.
- **Time the lasers.** Beams cycle on and off; cross on the dark beat, or
  take the long way round through the suites.
- **Mind the noise.** Walking is silent. Running leaves a noise ring every
  guard in earshot comes to check.
- **The dealer uniform** fools guards but not cameras — and running tears
  it off.
- **Loot has weight.** Every item slows you a little. The diamond pays
  $5,000; a ghost run pays $2,000 more.
- **The alarm meter** climbs on cameras, lasers and spotted guards. At 100
  the casino locks down and every guard hunts you — survive 12 seconds and
  it eases off.

## Layout

- `game/` — the game: static files only, plain canvas 2D, no libraries.
  `src/` splits the work by job: `config` (tuning + palette), `levels`
  (the three floors), `vision` (line of sight + cones), `guard` (patrol /
  suspicious / chase / search), `camera` (sweeps + loop), `laser` (timed
  beams), `player` (movement, noise, disguise), `world` (state + rules),
  `render` (the blueprint look + HUD + screens), `input`, `audio`
  (synthesised bleeps), `shots` (screenshot scenes), `main` (boot + loop).
- `screenshots/` — 4 shots of the game itself; the first is the cover.
- `main.ts` — the hand-in: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with `vendor/makefun-game.ts`.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
