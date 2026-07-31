import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/* Runs every *.mjs suite in this folder except itself, and exits non-zero if
   any of them fail — so it can gate a deploy rather than just print. */
const dir = path.dirname(new URL(import.meta.url).pathname);
const files = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.mjs') && f !== 'run-all.mjs')
  .sort();

let failed = 0;
for (const f of files) {
  process.stdout.write(`\n=== ${f} ===\n`);
  try {
    const out = execFileSync('node', [path.join(dir, f)], { encoding: 'utf8' });
    console.log(out.trim().split('\n').slice(-1)[0]);
  } catch (e) {
    failed += 1;
    console.log((e.stdout || '').trim().split('\n').slice(-3).join('\n'));
    console.log(`FAILED: ${f}`);
  }
}
console.log(`\n${files.length - failed}/${files.length} suites passed`);
process.exit(failed ? 1 : 0);
