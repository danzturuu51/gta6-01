// The Solmar PD and the wanted system. Stars rise when the player commits
// crimes in the open; police cars spawn at the edge of sight, chase and ram
// the player, and give up slowly. Hide long enough and a star drops.

import { POLICE, WANTED } from './config.js';
import { makeCar, placeCar } from './vehicles.js';
import { dist2d, clamp } from './random.js';

export function createWanted() {
  return {
    stars: 0,
    heat: 0,        // 0..1, fills while a cop can see the player
    unseen: 0,      // seconds since any cop was close
    cops: [],
    sirenTimer: 0,
  };
}

export function addWanted(wanted, amount) {
  wanted.stars = clamp(wanted.stars + amount, 0, WANTED.max);
  wanted.unseen = 0;
  return wanted.stars;
}

function spawnCop(wanted, city, playerX, playerZ, rng) {
  const angle = rng() * Math.PI * 2;
  const x = playerX + Math.sin(angle) * POLICE.spawnDistance;
  const z = playerZ + Math.cos(angle) * POLICE.spawnDistance;
  const heading = Math.atan2(playerX - x, playerZ - z);
  const cop = makeCar(city, x, z, heading, 0x1a1a1a, true);
  cop.speed = 10;
  cop.health = 100;
  placeCar(cop);
  wanted.cops.push(cop);
  return cop;
}

export function updatePolice(wanted, city, dt, playerX, playerZ, playerInCar, rng, onRam) {
  // How many cruisers the stars call for: one per star, capped.
  const want = Math.min(wanted.stars, POLICE.maxCars);
  while (wanted.cops.length < want) {
    spawnCop(wanted, city, playerX, playerZ, rng);
  }
  while (wanted.cops.length > want) {
    const gone = wanted.cops.pop();
    gone.mesh.visible = false;
  }

  let anyNear = false;
  for (const cop of wanted.cops) {
    const d = dist2d(cop.x, cop.z, playerX, playerZ);
    if (d < 40) anyNear = true;
    // Steer toward the player, with a little wobble so two cruisers don't stack.
    const wantHeading = Math.atan2(playerX - cop.x, playerZ - cop.z)
      + Math.sin(performance.now() / 900 + cop.x) * 0.12;
    let dh = wantHeading - cop.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    cop.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
    const targetSpeed = d > 12 ? POLICE.chaseSpeed : POLICE.chaseSpeed * 0.6;
    cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 1.5);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    placeCar(cop);
    // Ram: touching the player hurts, and shoves the player's car.
    if (d < 3.4) {
      onRam(cop, d);
    }
    // A cop that lost the player far away despawns instead of driving forever.
    if (d > POLICE.loseDistance * 2.2 && wanted.stars === 0) {
      cop.mesh.visible = false;
    }
  }

  // Cooling off: stay unseen and the heat fades, then stars drop one by one.
  if (wanted.stars > 0) {
    if (anyNear) {
      wanted.unseen = 0;
      wanted.heat = Math.min(1, wanted.heat + dt * 0.25);
    } else {
      wanted.unseen += dt;
      wanted.heat = Math.max(0, wanted.heat - dt * 0.1);
      if (wanted.unseen > POLICE.coolDown) {
        wanted.stars -= 1;
        wanted.unseen = 0;
      }
    }
    wanted.sirenTimer -= dt;
    if (wanted.sirenTimer <= 0) {
      wanted.sirenTimer = 1.6;
      wanted.sirenDue = true;
    }
  }
  return wanted;
}

export function policePositions(wanted) {
  return wanted.cops.map((c) => ({ x: c.x, z: c.z }));
}
