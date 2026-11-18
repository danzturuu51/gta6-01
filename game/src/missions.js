// Rico Vale's five jobs for Mara Kestrel. Each mission is a small chain of
// steps — go here, pick that up, lose the heat, get there — with dialogue,
// a beacon in the world, a marker on the minimap, and a cash payout.

import { MISSION_REWARDS } from './config.js';
import { dist2d } from './random.js';

function step(kind, place, text, extra) {
  return { kind, place, text, ...(extra || {}) };
}

export function buildMissions(places) {
  return [
    {
      id: 1,
      title: 'First Run',
      intro: 'Mara: "Rico. Package at the Marina. Take it to Palm Market. No sightseeing."',
      steps: [
        step('goto', places.marina, 'Pick up the package at Marina Bay'),
        step('goto', places.market, 'Deliver the package to Palm Market'),
      ],
      reward: MISSION_REWARDS[0],
      outro: 'Mara: "Clean. You drive like you mean it. There is more where that came from."',
    },
    {
      id: 2,
      title: 'Wheels Needed',
      intro: 'Mara: "The client wants a fast car, not yours. Borrow one. The PD will notice — deal with it."',
      steps: [
        step('steal', null, 'Steal any parked car (walk up and press E)'),
        step('goto', places.plaza, 'Bring the car to Solmar Plaza'),
      ],
      reward: MISSION_REWARDS[1],
      outro: 'Mara: "Nice paint job. The owner will get over it. Probably."',
    },
    {
      id: 3,
      title: 'Hot Cargo',
      intro: 'Mara: "The docks are crawling with PD. Grab the crate at Harbor Docks, then shake them off."',
      steps: [
        step('goto', places.docks, 'Grab the crate at Harbor Docks'),
        step('escape', null, 'Lose the police — get your wanted level to zero', { wantedAtStart: true }),
        step('goto', places.hilltop, 'Drop the crate at Vista Heights'),
      ],
      reward: MISSION_REWARDS[2],
      outro: 'Mara: "You vanished like smoke. The buyer is impressed. So am I."',
    },
    {
      id: 4,
      title: 'Getaway Driver',
      intro: 'Mara: "My crew hit Costa Airfield. Pick them up and get them to the Plaza before the PD boxes you in."',
      steps: [
        step('goto', places.airport, 'Pick up the crew at Costa Airfield'),
        step('goto', places.plaza, 'Getaway: reach Solmar Plaza with the crew'),
      ],
      reward: MISSION_REWARDS[3],
      outro: 'Mara: "Four minutes, three cruisers, zero scratches. You are my driver now."',
    },
    {
      id: 5,
      title: 'The Big Score',
      intro: 'Mara: "Last one. A vault courier crosses the Plaza at noon. Take the case, lose the heat, bring it to the Marina. Then we are square."',
      steps: [
        step('goto', places.plaza, 'Intercept the courier at Solmar Plaza'),
        step('escape', null, 'Lose the police — get your wanted level to zero', { wantedAtStart: true }),
        step('goto', places.marina, 'Deliver the case to Marina Bay'),
      ],
      reward: MISSION_REWARDS[4],
      outro: 'Mara: "Done. Your debts are paid, Rico. Solmar is yours now — spend it wisely."',
    },
  ];
}

export function createMissionState(missions) {
  return {
    list: missions,
    index: 0,       // which mission is active
    stepIndex: 0,   // which step of it
    done: false,
    allDone: false,
    started: false,
  };
}

export function currentMission(state) {
  return state.allDone ? null : state.list[state.index];
}

export function currentStep(state) {
  const m = currentMission(state);
  return m ? m.steps[state.stepIndex] : null;
}

// Advance the mission machine. `world` carries the live facts the steps need.
// Returns an event string ('step', 'mission', 'all') or null.
export function updateMissions(state, world) {
  const mission = currentMission(state);
  if (!mission) return null;
  const s = mission.steps[state.stepIndex];
  if (!s) return null;

  if (s.kind === 'goto' && s.place) {
    if (dist2d(world.playerX, world.playerZ, s.place.x, s.place.z) < 9) {
      return advance(state, world);
    }
  } else if (s.kind === 'steal') {
    if (world.stoleCar) {
      world.stoleCar = false;
      return advance(state, world);
    }
  } else if (s.kind === 'escape') {
    if (world.wanted === 0 && world.escapeArmed) {
      return advance(state, world);
    }
  }
  return null;
}

function advance(state, world) {
  const mission = currentMission(state);
  state.stepIndex += 1;
  if (state.stepIndex >= mission.steps.length) {
    world.cash += mission.reward;
    world.lastReward = mission.reward;
    state.index += 1;
    state.stepIndex = 0;
    if (state.index >= state.list.length) {
      state.allDone = true;
      return 'all';
    }
    return 'mission';
  }
  return 'step';
}

// Where the current objective marker should point, or null.
export function objectiveTarget(state) {
  const s = currentStep(state);
  if (!s) return null;
  if (s.kind === 'goto' && s.place) return { x: s.place.x, z: s.place.z, name: s.place.name };
  return null;
}

export function objectiveText(state) {
  const m = currentMission(state);
  if (!m) return 'All jobs done — Solmar is yours, Rico.';
  const s = m.steps[state.stepIndex];
  return `Job ${m.id} — ${m.title}: ${s.text}`;
}
