// Pedestrians: low-poly people who stroll the sidewalks, wait at corners,
// and run away screaming (well, running) when a crime happens near them.
// Hitting one is a crime — the wanted system notices.

import * as THREE from 'three';
import { PEDS } from './config.js';
import { dist2d } from './random.js';
import { collideCity, onRoad } from './world.js';

const SHIRTS = [0xe05050, 0x5080e0, 0x50c060, 0xe0c050, 0xc060d0, 0x40c0c0, 0xe0e0e0, 0x303030];

function buildPedMesh(shirt) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshLambertMaterial({ color: 0xd8a070 }));
  head.position.y = 1.72;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x2a2a3a }));
  legs.position.y = 0.3;
  group.add(legs);
  return group;
}

export function createPeds(city, rng) {
  const list = [];
  for (let i = 0; i < PEDS.count; i += 1) {
    const mesh = buildPedMesh(SHIRTS[Math.floor(rng() * SHIRTS.length)]);
    const x = -city.half + 12 + rng() * (city.half * 2 - 24);
    const z = -city.half + 12 + rng() * (city.half * 2 - 24);
    mesh.position.set(x, 0, z);
    list.push({
      mesh, x, z,
      heading: rng() * Math.PI * 2,
      speed: PEDS.walkSpeed * (0.8 + rng() * 0.5),
      state: 'walk', // walk | flee | down
      targetX: x, targetZ: z,
      panic: 0,
      health: 100,
      bob: rng() * 6,
    });
  }
  return list;
}

export function scarePeds(peds, x, z, radius) {
  let count = 0;
  for (const p of peds) {
    if (p.state === 'down') continue;
    if (dist2d(p.x, p.z, x, z) < radius) {
      p.state = 'flee';
      p.panic = 4 + Math.random() * 3;
      count += 1;
    }
  }
  return count;
}

export function updatePeds(peds, city, dt, playerX, playerZ, playerSpeed) {
  for (const p of peds) {
    if (p.state === 'down') {
      p.mesh.rotation.x = -Math.PI / 2 + 0.12;
      p.mesh.position.y = 0.3;
      continue;
    }
    p.bob += dt * (p.state === 'flee' ? 14 : 7);
    if (p.state === 'flee') {
      p.panic -= dt;
      const away = Math.atan2(p.x - playerX, p.z - playerZ);
      p.heading = away;
      const step = PEDS.fleeSpeed * dt;
      const hit = collideCity(city, p.x + Math.sin(away) * step, p.z + Math.cos(away) * step, 0.5);
      p.x = hit.x;
      p.z = hit.z;
      if (p.panic <= 0) p.state = 'walk';
    } else {
      // Stroll toward a random nearby target; pick a new one on arrival.
      const dx = p.targetX - p.x;
      const dz = p.targetZ - p.z;
      if (dx * dx + dz * dz < 1.5) {
        p.targetX = p.x + (Math.random() * 2 - 1) * 30;
        p.targetZ = p.z + (Math.random() * 2 - 1) * 30;
      } else {
        p.heading = Math.atan2(dx, dz);
        const step = p.speed * dt;
        const hit = collideCity(city, p.x + Math.sin(p.heading) * step, p.z + Math.cos(p.heading) * step, 0.5);
        p.x = hit.x;
        p.z = hit.z;
      }
    }
    p.mesh.position.set(p.x, Math.abs(Math.sin(p.bob)) * 0.08, p.z);
    p.mesh.rotation.y = p.heading;
    p.mesh.rotation.x = 0;
  }
}

// Returns the ped the player just ran into (if any) — a crime with witnesses.
export function pedHitByPlayer(peds, px, pz, radius) {
  for (const p of peds) {
    if (p.state === 'down') continue;
    if (dist2d(p.x, p.z, px, pz) < radius) return p;
  }
  return null;
}
