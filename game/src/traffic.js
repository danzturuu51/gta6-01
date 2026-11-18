// Traffic: cars that cruise the road grid on their own lanes, slow down for
// the car ahead, and keep going around the block when they reach an edge.
// They never leave the asphalt, so they always read as city traffic.

import { TRAFFIC } from './config.js';
import { makeCar, placeCar } from './vehicles.js';
import { PALETTE } from './config.js';
import { roadCenters, nearestRoadPoint } from './world.js';

export function createTraffic(city, rng) {
  const roads = roadCenters();
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const horizontal = rng() < 0.5;
    const line = roads[Math.floor(rng() * roads.length)];
    const along = -city.half + 15 + rng() * (city.half * 2 - 30);
    const lane = (rng() < 0.5 ? 3.4 : -3.4);
    const x = horizontal ? along : line + lane;
    const z = horizontal ? line + lane : along;
    const heading = horizontal ? (lane > 0 ? Math.PI / 2 : -Math.PI / 2) : (lane > 0 ? Math.PI : 0);
    const color = PALETTE.carColors[Math.floor(rng() * PALETTE.carColors.length)];
    const car = makeCar(city, x, z, heading, color, false);
    car.traffic = true;
    car.horizontal = horizontal;
    car.lane = lane;
    car.speed = TRAFFIC.speed * (0.8 + rng() * 0.4);
    car.baseSpeed = car.speed;
    placeCar(car);
    cars.push(car);
  }
  return { cars, city };
}

function aheadClear(self, others, playerCar) {
  const look = 9;
  const fx = Math.sin(self.heading);
  const fz = Math.cos(self.heading);
  const check = (other) => {
    if (other === self) return true;
    const dx = other.x - self.x;
    const dz = other.z - self.z;
    const forward = dx * fx + dz * fz;
    const side = Math.abs(dx * fz - dz * fx);
    if (forward > 0 && forward < look && side < 2.6) return false;
    return true;
  };
  for (const o of others) if (!check(o)) return false;
  if (playerCar && !check(playerCar)) return false;
  return true;
}

export function updateTraffic(traffic, dt, playerCar) {
  const half = traffic.city.half;
  for (const car of traffic.cars) {
    const clear = aheadClear(car, traffic.cars, playerCar);
    const target = clear ? car.baseSpeed : 0;
    car.speed += (target - car.speed) * Math.min(1, dt * 2);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    // Reached the edge: turn around the block by flipping to the next road.
    const out = car.horizontal ? Math.abs(car.x) > half - 6 : Math.abs(car.z) > half - 6;
    if (out) {
      const roads = roadCenters();
      const next = roads[Math.floor(Math.random() * roads.length)];
      if (car.horizontal) {
        car.z = next + car.lane;
        car.x = Math.sign(car.x) * (half - 8) * -1;
        car.heading = car.lane > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        car.x = next + car.lane;
        car.z = Math.sign(car.z) * (half - 8) * -1;
        car.heading = car.lane > 0 ? 0 : Math.PI;
      }
    }
    placeCar(car);
  }
}

// A traffic car close enough to bump the player on foot knocks them down a little.
export function trafficHitsPlayer(traffic, px, pz) {
  for (const car of traffic.cars) {
    const dx = car.x - px;
    const dz = car.z - pz;
    if (dx * dx + dz * dz < 2.4 * 2.4) return car;
  }
  return null;
}
