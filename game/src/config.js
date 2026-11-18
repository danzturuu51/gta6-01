// Every tuning number for Solmar lives here, so the rest of the game reads
// one table instead of scattering magic numbers through the modules.

export const CITY = {
  blocks: 7,          // blocks per side of the grid
  blockSize: 42,      // a city block, edge to edge
  roadWidth: 14,      // asphalt between blocks
  half: 0,            // filled in by world.js (half the city span)
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 15,
  radius: 0.7,
  height: 1.8,
  health: 100,
};

export const CAR = {
  topSpeed: 46,       // units per second, roughly 100 mph in game scale
  accel: 22,
  brake: 34,
  reverseSpeed: 14,
  steer: 1.9,         // radians per second at full lock, scaled by speed
  grip: 6.5,
  handbrakeGrip: 2.2,
};

export const TRAFFIC = {
  count: 14,
  speed: 11,
  spacing: 26,
};

export const PEDS = {
  count: 26,
  walkSpeed: 2.2,
  fleeSpeed: 5.5,
};

export const POLICE = {
  maxCars: 4,
  chaseSpeed: 40,
  ramDamage: 8,
  spawnDistance: 55,
  loseDistance: 95,
  // seconds of staying out of every cop's sight before a star drops
  coolDown: 9,
};

export const WANTED = {
  stealCar: 1,
  hitPed: 1,
  shoot: 1,
  killCop: 2,
  max: 5,
};

export const COMBAT = {
  punchDamage: 12,
  punchRange: 2.2,
  punchCooldown: 0.45,
  gunDamage: 34,
  gunRange: 70,
  gunCooldown: 0.28,
  startAmmo: 24,
  maxAmmo: 120,
};

export const PALETTE = {
  sky: 0x8ec9ee,
  fog: 0xa8d4f0,
  sun: 0xfff2c8,
  road: 0x2e3138,
  roadLine: 0xf5d76e,
  sidewalk: 0x9aa0a3,
  grass: 0x5da24a,
  sand: 0xe8cf9a,
  sea: 0x2e7fb8,
  building: [0xd8b48f, 0xb8c4cc, 0xe0a080, 0x9fb8a0, 0xc9b8d8, 0xf0d8a0, 0x8fb8d8, 0xd8d0c0],
  window: 0x2a4a66,
  palmTrunk: 0x8a6a42,
  palmLeaf: 0x3f9a4a,
  carColors: [0xd83838, 0x2e6fd8, 0xf0c030, 0x38b878, 0xd8d8d8, 0x222222, 0xe07020, 0x7a4fd0],
  policeCar: 0x1a1a1a,
  taxi: 0xf2c200,
};

export const SAVE_KEY = 'solmar.save.v1';

export const MISSION_REWARDS = [400, 650, 900, 1400, 2200];
