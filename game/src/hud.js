// The HUD: wanted stars, cash, health, speed, objective line, dialogue box,
// toasts, and the round minimap — a top-down canvas of roads, the player,
// the objective marker, police blips and traffic dots.

import { CITY } from './config.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const starsEl = el('stars');
  const cashEl = el('cash');
  const healthFill = el('healthFill');
  const speedEl = el('speed');
  const objectiveEl = el('objective');
  const dialogEl = el('dialog');
  const toastEl = el('toast');
  const ammoEl = el('ammo');
  const crosshairEl = el('crosshair');
  const pauseTag = el('pauseTag');
  const map = el('minimap');
  const mapCtx = map.getContext('2d');
  let toastUntil = 0;
  let dialogUntil = 0;

  function drawMinimap(city, view) {
    const size = 180;
    const scale = size / (CITY.half * 2 + 20);
    const toMap = (x, z) => [size / 2 + x * scale, size / 2 + z * scale];
    mapCtx.clearRect(0, 0, size, size);
    // Roads as light bands on the dark map.
    mapCtx.fillStyle = '#1d4a68';
    mapCtx.fillRect(0, 0, size, size);
    mapCtx.fillStyle = '#8a9296';
    for (const r of city.roads) {
      const [rx] = toMap(r, 0);
      mapCtx.fillRect(rx - (7 * scale), 0, 14 * scale, size);
      const [, rz] = toMap(0, r);
      mapCtx.fillRect(0, rz - (7 * scale), size, 14 * scale);
    }
    // Parks.
    mapCtx.fillStyle = '#3f8a3a';
    for (const p of city.parks) {
      const [px, pz] = toMap(p.x, p.z);
      mapCtx.fillRect(px - p.size * scale / 2, pz - p.size * scale / 2, p.size * scale, p.size * scale);
    }
    // Objective marker: pulsing yellow diamond.
    if (view.objective) {
      const [ox, oy] = toMap(view.objective.x, view.objective.z);
      const pulse = 5 + Math.sin(performance.now() / 200) * 2;
      mapCtx.fillStyle = '#ffd23e';
      mapCtx.beginPath();
      mapCtx.moveTo(ox, oy - pulse);
      mapCtx.lineTo(ox + pulse, oy);
      mapCtx.lineTo(ox, oy + pulse);
      mapCtx.lineTo(ox - pulse, oy);
      mapCtx.closePath();
      mapCtx.fill();
    }
    // Police blips: flashing blue/red dots.
    const flash = Math.floor(performance.now() / 300) % 2 === 0;
    mapCtx.fillStyle = flash ? '#ff4040' : '#3080ff';
    for (const c of view.cops) {
      const [cx, cy] = toMap(c.x, c.z);
      mapCtx.beginPath();
      mapCtx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      mapCtx.fill();
    }
    // Traffic: small white dots.
    mapCtx.fillStyle = 'rgba(255,255,255,.75)';
    for (const t of view.traffic) {
      const [tx, ty] = toMap(t.x, t.z);
      mapCtx.fillRect(tx - 1, ty - 1, 2, 2);
    }
    // Player: white arrow pointing along the heading, with a dark ring.
    const [px, py] = toMap(view.playerX, view.playerZ);
    mapCtx.save();
    mapCtx.translate(px, py);
    mapCtx.rotate(view.heading);
    mapCtx.fillStyle = '#fff';
    mapCtx.strokeStyle = '#111';
    mapCtx.lineWidth = 1.5;
    mapCtx.beginPath();
    mapCtx.moveTo(0, -7);
    mapCtx.lineTo(5, 6);
    mapCtx.lineTo(0, 3);
    mapCtx.lineTo(-5, 6);
    mapCtx.closePath();
    mapCtx.fill();
    mapCtx.stroke();
    mapCtx.restore();
    // North tick.
    mapCtx.fillStyle = '#fff';
    mapCtx.font = 'bold 11px sans-serif';
    mapCtx.fillText('N', size / 2 - 4, 12);
  }

  return {
    update(state, city, view) {
      // Stars.
      let stars = '';
      for (let i = 0; i < 5; i += 1) {
        stars += `<span class="${i < state.wanted ? 'lit' : 'dim'}">★</span>`;
      }
      starsEl.innerHTML = stars;
      cashEl.textContent = `$${state.cash.toLocaleString('en-US')}`;
      healthFill.style.width = `${Math.max(0, state.health)}%`;
      healthFill.style.background = state.health > 50 ? '#37e05a' : state.health > 25 ? '#ffb400' : '#ff4040';
      const mph = Math.round(Math.abs(state.speed) * 2.2);
      speedEl.innerHTML = state.inCar ? `${mph} <small>mph</small>` : '';
      objectiveEl.innerHTML = state.objective ? `<b>MISSION</b> — ${state.objective}` : '';
      ammoEl.textContent = state.inCar ? '' : `🔫 ${state.ammo} rounds`;
      crosshairEl.style.display = state.aiming ? 'block' : 'none';
      pauseTag.style.display = state.paused ? 'block' : 'none';
      if (dialogUntil && performance.now() > dialogUntil) {
        dialogEl.style.display = 'none';
        dialogUntil = 0;
      }
      if (toastUntil && performance.now() > toastUntil) {
        toastEl.style.display = 'none';
        toastUntil = 0;
      }
      drawMinimap(city, view);
    },
    dialog(who, text, seconds) {
      dialogEl.innerHTML = `<span class="who">${who}:</span> ${text}`;
      dialogEl.style.display = 'block';
      dialogUntil = performance.now() + seconds * 1000;
    },
    toast(text, seconds) {
      toastEl.textContent = text;
      toastEl.style.display = 'block';
      toastUntil = performance.now() + (seconds || 2.5) * 1000;
    },
    hideDialog() {
      dialogEl.style.display = 'none';
      dialogUntil = 0;
    },
  };
}
