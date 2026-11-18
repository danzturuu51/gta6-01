// Cars: a low-poly build from boxes (body, cabin, wheels, lights) and the
// arcade driving model — acceleration, steering that tightens at low speed,
// handbrake slides, and simple collision with buildings and other cars.

import * as THREE from 'three';
import { CAR, CITY, PALETTE } from './config.js';
import { clamp, angleLerp } from './random.js';
import { collideCity } from './world.js';

export function buildCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1c2c3c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), bodyMat);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.2), glassMat);
  cabin.position.set(0, 1.1, -0.2);
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    group.add(w);
    wheels.push(w);
  }
  // Headlights and taillights so a car reads at a glance, day or night.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const hx of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), headMat);
    h.position.set(hx, 0.6, 2.22);
    group.add(h);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  for (const tx of [-0.6, 0.6]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), tailMat);
    t.position.set(tx, 0.6, -2.22);
    group.add(t);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    bar.position.set(0, 1.5, -0.2);
    bar.name = 'lightbar';
    group.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42),
      new THREE.MeshLambertMaterial({ color: 0xf0f0f0 }));
    stripe.position.y = 0.62;
    group.add(stripe);
  }
  group.userData.wheels = wheels;
  return group;
}

export function makeCar(city, x, z, heading, color, isPolice) {
  return {
    mesh: buildCarMesh(color, isPolice),
    x, z, heading,
    speed: 0,
    steer: 0,
    isPolice: !!isPolice,
    color,
    city,
    crashed: 0,
  };
}

export function placeCar(car) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  for (const w of car.mesh.userData.wheels) {
    w.rotation.x += car.speed * 0.016;
  }
}

// One arcade step. `drive` is { throttle: -1..1, steer: -1..1, handbrake }.
// Returns true when the car hit a building this step.
export function driveCar(car, dt, drive) {
  const grip = drive.handbrake ? CAR.handbrakeGrip : CAR.grip;
  const speedSign = car.speed >= 0 ? 1 : -1;
  // Accelerate forward or back; rolling drag always pulls toward zero.
  if (drive.throttle > 0) car.speed += CAR.accel * dt;
  else if (drive.throttle < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.6 * dt;
  } else {
    car.speed -= car.speed * 0.9 * dt;
  }
  car.speed = clamp(car.speed, -CAR.reverseSpeed, CAR.topSpeed);
  // Steering fades as speed rises so the car stays controllable at 100 mph.
  const steerAuthority = clamp(1 - Math.abs(car.speed) / (CAR.topSpeed * 1.4), 0.25, 1);
  car.steer = angleLerp(car.steer, drive.steer * CAR.steer * steerAuthority, Math.min(1, dt * 8));
  car.heading += car.steer * dt * speedSign * (drive.handbrake ? 1.5 : 1);
  if (drive.handbrake) car.speed *= Math.max(0, 1 - dt * 1.4);

  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const hit = collideCity(car.city, nx, nz, 2.2);
  car.x = hit.x;
  car.z = hit.z;
  if (hit.hit && Math.abs(car.speed) > 6) {
    car.speed *= -0.25;
    car.crashed = 0.4;
    return true;
  }
  if (car.crashed > 0) car.crashed -= dt;
  placeCar(car);
  return false;
}

// Parked cars the player can steal: placed along road edges, facing the road.
export function spawnParkedCars(city, rng, count) {
  const cars = [];
  const pitch = 56; // blockSize + roadWidth
  const roads = [];
  for (let i = 0; i <= 7; i += 1) roads.push(-city.half + CITY.roadWidth / 2 + i * pitch);
  for (let i = 0; i < count; i += 1) {
    const along = roads[Math.floor(rng() * roads.length)];
    const cross = -city.half + 20 + rng() * (city.half * 2 - 40);
    const horizontal = rng() < 0.5;
    const x = horizontal ? cross : along + (rng() < 0.5 ? 5.2 : -5.2);
    const z = horizontal ? along + (rng() < 0.5 ? 5.2 : -5.2) : cross;
    const heading = horizontal ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    const color = PALETTE.carColors[Math.floor(rng() * PALETTE.carColors.length)];
    const car = makeCar(city, x, z, heading, color, false);
    car.parked = true;
    placeCar(car);
    cars.push(car);
  }
  return cars;
}
