# SOLMAR — Sun Coast Stories

![make.fun](https://make.fun/badge/gta6-01.svg)
![rank](https://make.fun/badge/gta6-01/danzturuu51/gta6-01/rank.svg)
![reward](https://make.fun/badge/gta6-01/danzturuu51/gta6-01/reward.svg)

A 3D open-world crime game in the spirit of GTA 6, built with three.js — no
assets from any commercial game. Everything is original: the city, the
characters, the cars, the story, the sounds.

## The game

You are **Rico Vale**, a courier with a fast car and faster debts, working the
sun-soaked coastal city of **Solmar**. Run five jobs for fixer **Mara
Kestrel**, steal cars, outrun the Solmar PD, and buy your way out of trouble.

- **Open world**: a procedural 7×7-block city — tower blocks, palm-lined
  sidewalks, a beach and the sea, a plaza, marina, docks and airfield.
- **On foot**: third-person WASD + mouse-drag camera, running, punching (F),
  pistol combat (click to shoot, hitscan, limited ammo).
- **Driving**: arcade physics — gas, brake, steering, handbrake — with
  traffic AI cruising the road grid and parked cars you can steal (E).
- **Wanted system**: 0–5 stars. Stealing, hitting pedestrians and shooting
  raise the heat; police cruisers spawn, chase and ram you. Hide long enough
  and the stars drop one by one. Get caught on foot and you're busted; lose
  all health and you're wasted.
- **Missions + story**: five sequential jobs with dialogue, a glowing beacon
  and a minimap marker, and cash payouts from $400 to $2,200.
- **HUD**: round minimap (roads, player arrow, objective, police blips,
  traffic), wanted stars, cash, health bar, speedometer, objective line,
  crosshair.
- **Menus & save**: title screen with the story, pause, busted/wasted
  screens; cash and mission progress save in localStorage.
- **Sound**: fully synthesized WebAudio — engine hum, sirens, gunshots,
  crashes, cash and mission chimes. No audio files.

## How to play

```
node serve.ts        # then open http://localhost:8080
```

| Key | Action |
| --- | --- |
| WASD / arrows | Move / drive |
| Mouse drag | Camera |
| Shift | Run |
| E | Enter / steal / exit car |
| F | Punch |
| Click | Shoot pistol |
| Space | Handbrake |
| P | Pause |
| M | Mission briefing |

## Screenshots

The four screenshots in `screenshots/` are real renders of the game in a
headless browser, staged by `?shot=start|drive|chase|mission` (see
`shots.json`): the title over the city, a midtown drive with traffic and the
HUD, a three-star police chase, and a mission on foot.

## Tech

- three.js (vendored minified build under `game/vendor/`)
- ES modules, no build step, no network requests at runtime
- Source split by job: `world`/`city` (layout + meshes), `vehicles`,
  `traffic`, `pedestrians`, `police`, `missions`, `combat`, `hud`,
  `audio`, `input`, `render`, `shots`, `main`
