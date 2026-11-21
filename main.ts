// GTA VI trophy guide entry (Node 22, standard library only): the guide is this
// directory's app/ folder — plain static files a browser opens at app/index.html,
// offline, with the trophy list and guides in app/data/trophies.json. This program
// hands it in: it copies app/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads (the screenshots, the
// first load's files and bytes, and the source), with the vendored make.fun library.
// Leave vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be
// byte for byte what its own copy writes.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

if (!existsSync(join(here, 'app', 'index.html'))) throw new Error('app/index.html is missing: the guide is not built');
if (!existsSync(join(here, 'app', 'data', 'trophies.json'))) throw new Error('app/data/trophies.json is missing: the trophy list is not built');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
// Fail fast when the screenshots are missing instead of handing in a dossier with
// none: the entry needs 3-4 of them, and a silent skip would only surface at grading.
const shotDir = join(here, 'screenshots');
if (!existsSync(shotDir)) throw new Error('screenshots/ is missing: the entry needs 3-4 screenshots');
const shots = readdirSync(shotDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
if (shots.length < 3) throw new Error(`screenshots/ holds ${shots.length} image(s): the entry needs 3-4 screenshots`);
cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others refuse an
// entry the scorer would refuse (more than 4 screenshots or one over 256 KiB; more
// than 993 files and directories in app/ or 48 MiB of app files).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
