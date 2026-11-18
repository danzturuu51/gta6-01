// The shape of Solmar: a grid of blocks, the roads between them, and where the
// buildings, palms, lamps and parked cars sit. This module knows nothing about
// three.js — it only hands out coordinates, so the minimap and the traffic
// can read the same city the renderer draws.

import { CITY, PALETTE } from './config.js';
import { makeRng, pick, range } from './random.js';

export function roadCenters() {
  const pitch = CITY.blockSize + CITY.roadWidth;
  const lines = [];
  for (let i = 0; i <= CITY.blocks; i += 1) {
    // Roads sit between the blocks: first road starts half a road in.
    lines.push(-CITY.half + CITY.roadWidth / 2 + i * pitch);
  }
  return lines;
}

export function buildCity(seed) {
  const rng = makeRng(seed);
  const pitch = CITY.blockSize + CITY.roadWidth;
  CITY.half = (CITY.blocks * pitch + CITY.roadWidth) / 2;

  const buildings = [];
  const palms = [];
  const lamps = [];
  const parks = [];
  const roads = roadCenters();

  for (let bx = 0; bx < CITY.blocks; bx += 1) {
    for (let bz = 0; bz < CITY.blocks; bz += 1) {
      const cx = -CITY.half + CITY.roadWidth + bx * pitch + CITY.blockSize / 2;
      const cz = -CITY.half + CITY.roadWidth + bz * pitch + CITY.blockSize / 2;
      // The south-west corner block is the beach park; the centre block is the plaza.
      if (bx === 0 && bz === CITY.blocks - 1) {
        parks.push({ x: cx, z: cz, size: CITY.blockSize });
        continue;
      }
      if (bx === 3 && bz === 3) {
        parks.push({ x: cx, z: cz, size: CITY.blockSize });
        continue;
      }
      const count = 1 + Math.floor(rng() * 3);
      for (let k = 0; k < count; k += 1) {
        const w = range(rng, 10, 18);
        const d = range(rng, 10, 18);
        const h = range(rng, 7, 34) * (rng() < 0.12 ? 1.8 : 1);
        const ox = range(rng, -9, 9);
        const oz = range(rng, -9, 9);
        buildings.push({
          x: cx + ox, z: cz + oz, w, d, h,
          color: pick(rng, PALETTE.building),
          floors: Math.max(2, Math.round(h / 3.4)),
        });
      }
      // Palms along two edges of the block, lamps at the corners.
      for (let e = 0; e < 3; e += 1) {
        palms.push({
          x: cx - CITY.blockSize / 2 + 3 + rng() * 6,
          z: cz - CITY.blockSize / 2 + 4 + e * 14,
        });
      }
      lamps.push({ x: cx - CITY.blockSize / 2 - 1, z: cz - CITY.blockSize / 2 - 1 });
      lamps.push({ x: cx + CITY.blockSize / 2 + 1, z: cz + CITY.blockSize / 2 + 1 });
    }
  }

  // Named places the missions and the HUD point at.
  const places = {
    marina: { x: -CITY.half + 8, z: CITY.half - 30, name: 'Marina Bay' },
    plaza: { x: 0, z: 0, name: 'Solmar Plaza' },
    airport: { x: CITY.half - 30, z: -CITY.half + 24, name: 'Costa Airfield' },
    docks: { x: CITY.half - 20, z: CITY.half - 24, name: 'Harbor Docks' },
    hilltop: { x: -CITY.half + 30, z: -CITY.half + 30, name: 'Vista Heights' },
    market: { x: -CITY.half + 60, z: CITY.half - 60, name: 'Palm Market' },
  };

  return { buildings, palms, lamps, parks, roads, places, seed };
}

// True when (x,z) is on asphalt (inside a road band).
export function onRoad(x, z) {
  const pitch = CITY.blockSize + CITY.roadWidth;
  const px = ((x + CITY.half) % pitch + pitch) % pitch;
  const pz = ((z + CITY.half) % pitch + pitch) % pitch;
  return px < CITY.roadWidth || pz < CITY.roadWidth;
}

// True when (x,z) is inside a building footprint (with a small margin).
export function insideBuilding(city, x, z, margin) {
  const m = margin || 0.8;
  for (const b of city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + m && Math.abs(z - b.z) < b.d / 2 + m) return b;
  }
  return null;
}

// Clamp a point into the city and push it out of buildings.
export function collideCity(city, x, z, radius) {
  let nx = Math.max(-CITY.half + 2, Math.min(CITY.half - 2, x));
  let nz = Math.max(-CITY.half + 2, Math.min(CITY.half - 2, z));
  const b = insideBuilding(city, nx, nz, radius);
  if (b) {
    const dx = nx - b.x;
    const dz = nz - b.z;
    const pushX = b.w / 2 + radius - Math.abs(dx);
    const pushZ = b.d / 2 + radius - Math.abs(dz);
    if (pushX < pushZ) nx = b.x + Math.sign(dx || 1) * (b.w / 2 + radius);
    else nz = b.z + Math.sign(dz || 1) * (b.d / 2 + radius);
  }
  return { x: nx, z: nz, hit: b !== null };
}

// The nearest point on a road centre line, for snapping traffic and peds.
export function nearestRoadPoint(x, z) {
  const roads = roadCenters();
  let bestX = roads[0];
  let bestZ = roads[0];
  for (const r of roads) {
    if (Math.abs(r - x) < Math.abs(bestX - x)) bestX = r;
    if (Math.abs(r - z) < Math.abs(bestZ - z)) bestZ = r;
  }
  return { x: bestX, z: bestZ };
}
