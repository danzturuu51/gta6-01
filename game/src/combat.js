// Combat on foot: a punch for up close and a pistol for everything else.
// Hitscan — a ray from the camera, tested against peds, cops and cars —
// keeps it simple and honest, with no projectiles to simulate.

import * as THREE from 'three';
import { COMBAT, WANTED } from './config.js';
import { dist2d } from './random.js';

export function createCombat() {
  return {
    ammo: COMBAT.startAmmo,
    punchTimer: 0,
    gunTimer: 0,
    muzzle: 0,
  };
}

// The nearest living target within a cone in front of (ox, oz, heading).
function nearestInCone(list, ox, oz, heading, maxDist, maxAngle) {
  let best = null;
  let bestD = maxDist;
  for (const t of list) {
    if (t.health !== undefined && t.health <= 0) continue;
    if (t.state === 'down') continue;
    const d = dist2d(t.x, t.z, ox, oz);
    if (d > bestD) continue;
    const ang = Math.atan2(t.x - ox, t.z - oz);
    let diff = ang - heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > maxAngle) continue;
    best = t;
    bestD = d;
  }
  return best;
}

export function tryPunch(combat, dt, player, peds, cops, onCrime) {
  combat.punchTimer -= dt;
  if (combat.punchTimer > 0) return null;
  combat.punchTimer = COMBAT.punchCooldown;
  const targets = [...peds, ...cops];
  const hit = nearestInCone(targets, player.x, player.z, player.heading, COMBAT.punchRange, 0.9);
  if (!hit) return 'miss';
  hit.health = (hit.health ?? 100) - COMBAT.punchDamage;
  if (hit.health <= 0) {
    if (hit.state !== undefined) hit.state = 'down';
    if (hit.isPolice) onCrime(WANTED.killCop, 'cop down');
    else onCrime(WANTED.hitPed, 'ped down');
    return 'kill';
  }
  if (hit.state !== undefined) hit.state = 'flee';
  onCrime(WANTED.hitPed, 'assault');
  return 'hit';
}

export function tryShoot(combat, dt, player, peds, cops, cars, onCrime) {
  combat.gunTimer -= dt;
  if (combat.gunTimer > 0) return null;
  if (combat.ammo <= 0) return 'empty';
  combat.gunTimer = COMBAT.gunCooldown;
  combat.ammo -= 1;
  combat.muzzle = 0.08;
  onCrime(WANTED.shoot, 'gunfire');
  const targets = [...peds, ...cops];
  const hit = nearestInCone(targets, player.x, player.z, player.heading, COMBAT.gunRange, 0.12);
  if (hit) {
    hit.health = (hit.health ?? 100) - COMBAT.gunDamage;
    if (hit.health <= 0) {
      if (hit.state !== undefined) hit.state = 'down';
      if (hit.isPolice) onCrime(WANTED.killCop, 'cop down');
      return 'kill';
    }
    if (hit.state !== undefined) hit.state = 'flee';
    return 'hit';
  }
  // A shot can also smash a car window: damage the nearest car in the cone.
  const car = nearestInCone(cars, player.x, player.z, player.heading, COMBAT.gunRange, 0.1);
  if (car) return 'car-hit';
  return 'shot';
}

// A tracer line from the muzzle to the hit point, for the render loop.
export function makeTracer(scene) {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(),
  ]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe27a }));
  line.visible = false;
  scene.add(line);
  return line;
}

export function showTracer(line, from, to, seconds) {
  line.geometry.setFromPoints([from, to]);
  line.visible = true;
  line.userData.until = performance.now() / 1000 + seconds;
}
