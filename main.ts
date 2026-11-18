// SOLMAR — Sun Coast Stories: the entrypoint for gta6-01 (Node 22, stdlib only).
//
// The game lives in this directory's game/ folder: plain static files that any
// desktop browser loads offline — game/index.html plus its ES modules and the
// vendored three.js build under game/vendor/. Nothing in game/ reaches the
// network. This program hands the entry in: it copies game/ and screenshots/
// from beside this file into /output and writes /output/dossier.json, the
// summary the judge reads, using the vendored make.fun library.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The folder this file sits in, and the folder the grader reads.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fresh output directory, then the whole game, then the screenshots.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier mirrors the scorer's own caps, so a build that passes here is
// shaped the way the gate expects: at most 4 screenshots of 256 KiB each,
// at most 993 files and 48 MiB under game/, no game/ path over 1000 bytes,
// and the judge's text view capped at 160 KiB.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
