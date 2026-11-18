// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one
// stages the real game — same world, same rules — then lets it run forward
// for a few seconds under a scripted driver, so the frame is a moment of
// actual play, and the same seed always gives the same frame.

import { placeCar } from './vehicles.js';

export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission'];

function driveStraight(game, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, { forward: 1, steer: 0, handbrake: false });
  }
}

function chaseSeconds(game, seconds) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i += 1) {
    // Weave gently so the chase reads as a chase, not a commute.
    const steer = Math.sin(i / 45) * 0.35;
    game.tick(1 / 60, { forward: 1, steer, handbrake: false });
  }
}

export function stageShot(game, name) {
  const city = game.city;
  const half = city.half || 200;
  if (name === 'start') {
    // Title screen over the city: Rico standing on the -28 road, camera
    // looking down a sunlit street of towers. The menu DOM stays on top.
    game.teleportPlayer(-28, -60, 0);
    game.setCameraHeading(0);
    game.setMenuVisible(true);
    return { menu: true };
  }

  game.startGame();
  game.setMenuVisible(false);

  if (name === 'drive') {
    // Midtown cruise: in a car on the -28 road, traffic ahead, mission live.
    const car = game.parkedCars[2] || game.parkedCars[0];
    game.putPlayerInCar(car);
    game.teleportCar(car, -28, -half + 40, 0);
    game.setCameraHeading(0);
    driveStraight(game, 3.2);
    // Two traffic cars ahead on the same road so the frame shows traffic.
    // Placed after the drive, so they sit ahead of where the car stopped.
    const t0 = game.traffic.cars[0];
    const t1 = game.traffic.cars[1];
    if (t0) {
      t0.x = -28 + 3.4; t0.z = car.z + 30; t0.heading = 0;
      t0.horizontal = false; t0.lane = 3.4; t0.speed = 11; t0.baseSpeed = 11;
      placeCar(t0);
    }
    if (t1) {
      t1.x = -28 - 3.4; t1.z = car.z + 58; t1.heading = Math.PI;
      t1.horizontal = false; t1.lane = -3.4; t1.speed = 11; t1.baseSpeed = 11;
      placeCar(t1);
    }
    return { menu: false };
  }

  if (name === 'chase') {
    // Three stars on the 28 road: weave, then put cruisers where the
    // camera can see them — one roadblock ahead, one pulling alongside.
    const car = game.parkedCars[1] || game.parkedCars[0];
    game.putPlayerInCar(car);
    game.teleportCar(car, 10, 28, Math.PI / 2);
    game.setWanted(3);
    game.setCameraHeading(Math.PI / 2);
    chaseSeconds(game, 3.0);
    // The weave drifts the car off the asphalt; snap it back onto the
    // 28 road so the chase reads as a chase, not a sidewalk tour.
    game.snapCar(car, car.x, 28);
    // Cruisers placed after the chase, where the camera can see them:
    // one roadblock ahead, one pulling alongside. No more sim after this,
    // so the framing holds for the screenshot.
    const px = car.x;
    const pz = car.z;
    const cops = game.wanted.cops;
    if (cops[0]) {
      cops[0].x = px + 26; cops[0].z = pz; cops[0].heading = -Math.PI / 2; cops[0].speed = 30;
      placeCar(cops[0]);
    }
    if (cops[1]) {
      cops[1].x = px + 12; cops[1].z = pz - 5; cops[1].heading = Math.PI / 2; cops[1].speed = 38;
      placeCar(cops[1]);
    }
    return { menu: false };
  }

  // mission: on foot at the Plaza, courier in sight, one star, peds fleeing.
  game.teleportPlayer(6, -6, Math.PI * 0.75);
  game.setWanted(1);
  game.setMissionStep(0);
  game.scareNearby(6, -6, 18);
  game.setAiming(true);
  const steps = Math.round(1.2 * 60);
  for (let i = 0; i < steps; i += 1) {
    game.tick(1 / 60, { forward: 0, steer: 0, handbrake: false });
  }
  // Pull the nearest cruiser into view, ahead of Rico.
  const cop = game.wanted.cops[0];
  if (cop) {
    cop.x = 6 + Math.sin(Math.PI * 0.75) * 16;
    cop.z = -6 + Math.cos(Math.PI * 0.75) * 16;
    cop.heading = Math.PI * 0.75 + Math.PI;
    cop.speed = 0;
    placeCar(cop);
  }
  return { menu: false };
}
