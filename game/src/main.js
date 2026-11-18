// Boot and the one loop: Solmar, third-person, on foot and by car. Input is
// read every frame, the world advances in fixed 1/60 s steps, and the stage
// paints what is there. Screens: menu, play, paused, busted, wasted.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission stages that scene
// instead of the menu, runs it forward a few seconds, and sets
// window.__shotReady once the frame has settled, for a screenshot.

import * as THREE from 'three';
import { CITY, PLAYER, CAR, COMBAT, SAVE_KEY, WANTED } from './config.js';
import { makeRng, clamp, dist2d, angleLerp } from './random.js';
import { buildCity, collideCity } from './world.js';
import { buildCityMeshes } from './city.js';
import { createStage, buildPlayerMesh, buildBeacon, updateCamera } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';
import { makeCar, driveCar, placeCar, spawnParkedCars } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPeds, updatePeds, scarePeds, pedHitByPlayer } from './pedestrians.js';
import { createWanted, addWanted, updatePolice, policePositions } from './police.js';
import { buildMissions, createMissionState, updateMissions, objectiveTarget, objectiveText, currentMission } from './missions.js';
import { createCombat, tryPunch, tryShoot, makeTracer, showTracer } from './combat.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const rng = makeRng(seed);
const city = buildCity(seed);
const stage = createStage(document.getElementById('app'));
const { scene, camera } = stage;
scene.add(buildCityMeshes(city));

const hud = createHud();
const audio = createAudio();
const input = createInput(stage.canvas);
const tracer = makeTracer(scene);
const beacon = buildBeacon();
scene.add(beacon);

const playerMesh = buildPlayerMesh();
scene.add(playerMesh);

const traffic = createTraffic(city, rng);
for (const car of traffic.cars) scene.add(car.mesh);
const parkedCars = spawnParkedCars(city, rng, 10);
for (const car of parkedCars) scene.add(car.mesh);
const peds = createPeds(city, rng);
for (const p of peds) scene.add(p.mesh);

const wanted = createWanted();
const missions = createMissionState(buildMissions(city.places));
const combat = createCombat();

const save = loadSave();
const game = {
  cash: save.cash || 0,
  health: PLAYER.health,
  player: { x: 0, z: 24, heading: Math.PI, camYaw: Math.PI, speed: 0, inCar: false, car: null },
  paused: false,
  over: null, // 'busted' | 'wasted' | null
  started: false,
  aiming: false,
  bustedTimer: 0,
  escapeArmed: false,
  stoleCar: false,
  lastReward: 0,
};
missions.index = Math.min(save.mission || 0, missions.list.length - 1);
game.cash = save.cash || 0;

function loadSave() {
  try {
    return JSON.parse(window.localStorage.getItem(SAVE_KEY) || '{}');
  } catch {
    return {};
  }
}

function persist() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: game.cash, mission: missions.index,
    }));
  } catch { /* storage off: progress lasts this visit only */ }
}

function nearestParkedCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of parkedCars) {
    const d = dist2d(car.x, car.z, game.player.x, game.player.z);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function enterCar(car) {
  game.player.inCar = true;
  game.player.car = car;
  car.parked = false;
  car.traffic = false;
  game.player.x = car.x;
  game.player.z = car.z;
  playerMesh.visible = false;
  audio.engineStart();
  if (car.wasParked) {
    game.stoleCar = true;
    addWanted(wanted, WANTED.stealCar);
    hud.toast('Car stolen! The PD is on to you.', 3);
    audio.siren();
  }
  car.wasParked = false;
}

function exitCar() {
  const car = game.player.car;
  if (!car) return;
  game.player.inCar = false;
  game.player.car = null;
  car.speed = 0;
  game.player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 2.4;
  game.player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 2.4;
  const fixed = collideCity(city, game.player.x, game.player.z, PLAYER.radius);
  game.player.x = fixed.x;
  game.player.z = fixed.z;
  playerMesh.visible = true;
}

function endGame(kind, text) {
  game.over = kind;
  document.getElementById('endTitle').textContent = kind === 'busted' ? 'BUSTED' : 'WASTED';
  document.getElementById('endText').textContent = text;
  document.getElementById('endScreen').style.display = 'flex';
  audio.busted();
  persist();
}

function crime(amount, why) {
  const before = wanted.stars;
  addWanted(wanted, amount);
  if (wanted.stars > before) scarePeds(peds, game.player.x, game.player.z, 26);
}

// --- The game object the screenshot stager drives -------------------------
const api = {
  city,
  parkedCars,
  traffic,
  wanted,
  teleportPlayer(x, z, heading) {
    game.player.x = x;
    game.player.z = z;
    game.player.heading = heading;
    game.player.camYaw = heading;
    playerMesh.position.set(x, 0, z);
    playerMesh.rotation.y = heading;
  },
  setCameraHeading(h) {
    game.player.camYaw = h;
    game.player.heading = h;
  },
  setMenuVisible(show) {
    document.getElementById('menu').style.display = show ? 'flex' : 'none';
  },
  startGame() {
    game.started = true;
    document.getElementById('menu').style.display = 'none';
  },
  putPlayerInCar(car) {
    game.player.x = car.x;
    game.player.z = car.z;
    enterCar(car);
  },
  teleportCar(car, x, z, heading) {
    car.x = x;
    car.z = z;
    car.heading = heading;
    car.speed = 12;
    placeCar(car);
    game.player.x = x;
    game.player.z = z;
  },
  setWanted(n) {
    wanted.stars = n;
    wanted.unseen = 0;
  },
  setMissionStep(i) {
    missions.stepIndex = i;
  },
  scareNearby(x, z, r) {
    scarePeds(peds, x, z, r);
  },
  setAiming(on) {
    game.aiming = on;
  },
  // Move a car (and the player riding in it) without touching its speed.
  snapCar(car, x, z) {
    car.x = x;
    car.z = z;
    placeCar(car);
    game.player.x = x;
    game.player.z = z;
  },
  tick(dt, scripted) {
    tick(dt, scripted);
  },
};

// --- One simulation step ---------------------------------------------------
function tick(dt, scripted) {
  const p = game.player;
  const move = scripted
    ? { forward: scripted.forward || 0, strafe: scripted.strafe || 0 }
    : input.moveAxis();
  const drag = scripted ? { x: 0, y: 0 } : input.takeDrag();
  p.camYaw -= drag.x * 0.005;

  if (p.inCar && p.car) {
    const car = p.car;
    const throttle = move.forward;
    const steer = -move.strafe;
    const handbrake = scripted ? !!scripted.handbrake : input.held('Space');
    const crashed = driveCar(car, dt, { throttle, steer, handbrake });
    if (crashed) {
      audio.crash();
      game.health = Math.max(0, game.health - 4);
    }
    p.x = car.x;
    p.z = car.z;
    p.heading = car.heading;
    // The camera sits behind the direction of travel and looks forward:
    // camYaw equal to the car's heading puts the camera on its tail.
    if (car.speed > 1) {
      p.camYaw = angleLerp(p.camYaw, car.heading, Math.min(1, dt * 2.5));
    }
    // Running a ped over in the car is a crime the whole street sees.
    const victim = pedHitByPlayer(peds, car.x, car.z, 2.6);
    if (victim && Math.abs(car.speed) > 4) {
      victim.state = 'down';
      victim.health = 0;
      crime(WANTED.hitPed, 'pedestrian hit');
      hud.toast('You ran someone over! Wanted level up.', 2.5);
    }
    audio.setEngine(Math.abs(car.speed) / CAR.topSpeed, true);
  } else {
    const run = input.held('ShiftLeft') || input.held('ShiftRight');
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const f = move.forward;
    const s = move.strafe;
    const len = Math.hypot(f, s) || 1;
    const nx = Math.sin(p.camYaw) * (f / len) + Math.sin(p.camYaw + Math.PI / 2) * (s / len);
    const nz = Math.cos(p.camYaw) * (f / len) + Math.cos(p.camYaw + Math.PI / 2) * (s / len);
    const moving = f !== 0 || s !== 0;
    const stepLen = (moving ? speed : 0) * dt;
    const fixed = collideCity(city, p.x + nx * stepLen, p.z + nz * stepLen, PLAYER.radius);
    p.x = fixed.x;
    p.z = fixed.z;
    if (moving) p.heading = Math.atan2(nx, nz);
    p.speed = moving ? speed : 0;
    // Walk-cycle bob on the arms and legs.
    const swing = moving ? Math.sin(performance.now() / 90) * 0.6 : 0;
    playerMesh.userData.armL.rotation.x = swing;
    playerMesh.userData.armR.rotation.x = -swing;
    playerMesh.userData.legs.rotation.x = moving ? Math.sin(performance.now() / 90) * 0.25 : 0;
    audio.setEngine(0, false);
    // Bumped by traffic while crossing the road.
    const bumper = traffic.cars.find((c) => dist2d(c.x, c.z, p.x, p.z) < 2.4 && Math.abs(c.speed) > 3);
    if (bumper) {
      game.health = Math.max(0, game.health - 6);
      p.x += Math.sin(bumper.heading) * 2;
      p.z += Math.cos(bumper.heading) * 2;
      audio.crash();
    }
  }

  playerMesh.position.set(p.x, 0, p.z);
  playerMesh.rotation.y = p.heading;

  updateTraffic(traffic, dt, p.inCar ? p.car : null);
  updatePeds(peds, city, dt, p.x, p.z, p.speed);

  const world = {
    playerX: p.x, playerZ: p.z,
    wanted: wanted.stars, cash: game.cash,
    stoleCar: game.stoleCar, escapeArmed: game.escapeArmed,
    lastReward: game.lastReward,
  };
  const missionEvent = updateMissions(missions, world);
  game.cash = world.cash;
  if (missionEvent === 'step') {
    audio.mission();
    const m = currentMission(missions);
    hud.toast(m ? `Objective updated: ${m.title}` : '', 2.5);
  } else if (missionEvent === 'mission') {
    const m = missions.list[missions.index - 1];
    audio.cash();
    hud.toast(`Job complete! +$${m.reward}`, 3.5);
    hud.dialog('Mara Kestrel', m.outro, 6);
    persist();
  } else if (missionEvent === 'all') {
    audio.cash();
    hud.toast('All jobs done! Solmar is yours, Rico.', 5);
    persist();
  }
  // Arm the escape step once the police actually show up for it.
  const step = missions.list[missions.index]?.steps[missions.stepIndex];
  if (step && step.kind === 'escape') {
    if (step.wantedAtStart && wanted.stars > 0) game.escapeArmed = true;
    if (wanted.stars === 0 && !game.escapeArmed && step.wantedAtStart) {
      addWanted(wanted, 2);
      game.escapeArmed = true;
    }
  }

  updatePolice(wanted, city, dt, p.x, p.z, p.inCar, rng, (cop) => {
    if (p.inCar && p.car) {
      p.car.speed *= 0.86;
      audio.crash();
    } else {
      game.health = Math.max(0, game.health - POLICE_RAM_DT * dt * 60);
      game.bustedTimer += dt;
      if (game.bustedTimer > 1.4 && wanted.stars > 0) {
        endGame('busted', 'The Solmar PD caught you on foot. Mara will post bail — this time.');
      }
    }
  });
  // A freshly spawned cruiser joins the scene the moment it exists.
  for (const cop of wanted.cops) {
    if (!cop.mesh.parent) scene.add(cop.mesh);
  }
  if (wanted.sirenDue) {
    wanted.sirenDue = false;
    audio.siren();
  }
  if (wanted.stars === 0) game.bustedTimer = 0;

  // Objective beacon follows the mission target.
  const target = objectiveTarget(missions);
  if (target) {
    beacon.visible = true;
    beacon.position.set(target.x, 0, target.z);
    const gem = beacon.getObjectByName('gem');
    if (gem) {
      gem.rotation.y += dt * 1.5;
      gem.position.y = 7 + Math.sin(performance.now() / 400) * 0.6;
    }
  } else {
    beacon.visible = false;
  }

  if (combat.muzzle > 0) combat.muzzle -= dt;
  combat.punchTimer = Math.max(0, combat.punchTimer - dt);
  combat.gunTimer = Math.max(0, combat.gunTimer - dt);
  if (tracer.visible && performance.now() / 1000 > tracer.userData.until) tracer.visible = false;

  if (game.health <= 0 && !game.over) {
    endGame('wasted', 'Rico is down. The sun sets on Solmar — for now.');
  }
}

const POLICE_RAM_DT = 0.35;

// --- Live loop --------------------------------------------------------------
function runGame() {
  let accumulator = 0;
  let last = performance.now();
  let frames = 0;

  document.getElementById('startBtn').addEventListener('click', () => {
    audio.unlock();
    audio.blip();
    game.started = true;
    document.getElementById('menu').style.display = 'none';
    const m = currentMission(missions);
    if (m) hud.dialog('Mara Kestrel', m.intro, 7);
    hud.toast('Follow the yellow beacon. E steals a car.', 4);
  });
  document.getElementById('retryBtn').addEventListener('click', () => {
    window.location.reload();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    frames += 1;

    if (shot) {
      // Screenshot mode: the scene was staged once; just render it.
      accumulator = 0;
    } else if (game.started && !game.paused && !game.over) {
      accumulator += dt;
      while (accumulator >= STEP) {
        handleActions();
        tick(STEP, null);
        accumulator -= STEP;
      }
    }

    // Camera: low behind Rico on foot, higher and further back in a car.
    const p = game.player;
    const focus = new THREE.Vector3(p.x, 0, p.z);
    if (p.inCar) updateCamera(camera, focus, p.camYaw, 13, 5.5, dt, 5);
    else updateCamera(camera, focus, p.camYaw, 8, 3.4, dt, 7);

    hud.update(
      {
        wanted: wanted.stars, cash: game.cash, health: game.health,
        speed: p.inCar && p.car ? p.car.speed : 0,
        inCar: p.inCar, objective: objectiveText(missions),
        ammo: combat.ammo, aiming: game.aiming || (!p.inCar && input.held('KeyC')),
        paused: game.paused,
      },
      city,
      {
        playerX: p.x, playerZ: p.z, heading: p.heading,
        objective: objectiveTarget(missions),
        cops: policePositions(wanted),
        traffic: traffic.cars.map((c) => ({ x: c.x, z: c.z })),
      },
    );

    stage.renderer.render(scene, camera);
    if (shot && frames > 60 && !window.__shotReady) {
      window.__shotReady = true;
    }
  }

  function handleActions() {
    const pressed = input.takePressed();
    if (pressed.has('KeyP') || pressed.has('Escape')) {
      game.paused = !game.paused;
      return;
    }
    if (game.paused) return;
    if (pressed.has('KeyE')) {
      if (game.player.inCar) exitCar();
      else {
        const car = nearestParkedCar(4.5);
        if (car) {
          car.wasParked = car.parked;
          enterCar(car);
        }
      }
    }
    if (pressed.has('KeyF') && !game.player.inCar) {
      const result = tryPunch(combat, 0, game.player, peds, wanted.cops, (n) => crime(n));
      if (result === 'hit' || result === 'kill') audio.punch();
    }
    if (pressed.has('KeyM')) {
      const m = currentMission(missions);
      if (m) hud.dialog('Mara Kestrel', m.intro, 7);
    }
    if (input.takeClick() && !game.player.inCar) {
      const before = combat.ammo;
      const result = tryShoot(combat, 0, game.player, peds, wanted.cops,
        [...parkedCars, ...traffic.cars], (n) => crime(n));
      if (result && result !== 'empty') {
        audio.gunshot();
        const from = new THREE.Vector3(game.player.x, 1.4, game.player.z);
        const to = new THREE.Vector3(
          game.player.x + Math.sin(game.player.heading) * 40,
          1.4,
          game.player.z + Math.cos(game.player.heading) * 40,
        );
        showTracer(tracer, from, to, 0.12);
        scarePeds(peds, game.player.x, game.player.z, 30);
        game.aiming = true;
        setTimeout(() => { game.aiming = false; }, 900);
      } else if (result === 'empty') {
        hud.toast('Out of ammo — find a car and drive instead.', 2.5);
      }
      if (before !== combat.ammo) { /* ammo spent */ }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.started && !game.over) game.paused = true;
  });

  requestAnimationFrame(frame);
}

// Debug handle: lets a playtest read the live state from the console.
window.__solmar = { api, player: game.player, traffic, wanted, city };

// --- Shot mode ---------------------------------------------------------------
if (shot) {
  try {
    stageShot(api, shot);
  } catch (err) {
    console.error('shot staging failed', err);
  }
  // Render the staged frame; __shotReady flips after 90 frames in runGame.
  runGame();
} else {
  // Idle backdrop behind the menu: slow orbit over the Plaza.
  let angle = 0.6;
  const menuCam = () => {
    angle += 0.0012;
    camera.position.set(Math.sin(angle) * 90, 42, Math.cos(angle) * 90);
    camera.lookAt(0, 4, 0);
    stage.renderer.render(scene, camera);
    if (!game.started) requestAnimationFrame(menuCam);
  };
  menuCam();
  runGame();
}
