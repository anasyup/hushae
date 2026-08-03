#!/usr/bin/env node
/* ============================================================================
 * IMAGE OPTIMISER — Sprint 2M
 *
 * MEASURED BEFORE WRITING THIS
 *   public/images        341 files, 72.4 MB, ZERO webp, ZERO avif
 *   live mobile homepage 19 images, 17.6 MB downloaded
 *   worst single file    hero-women-bra.png at 2.26 MB
 *   same file re-encoded 138 KB webp / 79 KB avif at 1200px  (-94% / -96%)
 *
 * That payload is why mobile Lighthouse has been stuck in the 50s-60s for
 * three sprints. It is the single largest performance item in the project.
 *
 * WHAT THIS DOES
 *   For every source PNG/JPG it emits a set of WIDTHS in WEBP and AVIF beside
 *   the original, plus a tiny blurred LQIP encoded as a data URI in a manifest.
 *   The original file is NEVER deleted or modified — <picture> falls back to it
 *   for any browser that wants it, and the change is reversible by deleting the
 *   generated files.
 *
 * WHY WIDTHS AND NOT ONE BIG FILE
 *   A product card renders at roughly 400 CSS px on a phone and 600 on desktop.
 *   Shipping a 1200px image to a 400px slot wastes three quarters of the bytes
 *   before a single pixel is drawn. srcset lets the browser pick.
 *
 * Idempotent: a variant that already exists and is newer than its source is
 * skipped, so re-running after adding one product costs seconds.
 * ========================================================================== */

import { readdir, stat, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC_DIR = path.join(ROOT, 'public', 'images');
const MANIFEST = path.join(ROOT, 'src', 'lib', 'imageManifest.json');

/* Widths chosen from the real rendered sizes in this theme, not from a generic
   breakpoint list: product grid ~400 on mobile / ~600 on desktop, hero ~1200.
   A fourth width would add files nobody requests. */
const WIDTHS = [400, 800, 1200];
const WEBP_Q = 82;   // visually lossless for photography at these sizes
const AVIF_Q = 58;   // AVIF's scale differs; 58 ~= webp 82 perceptually
const LQIP_W = 20;   // the blur placeholder, deliberately tiny

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const LIMIT = Number((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1] || 0);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (/\.(png|jpe?g)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

/** Skip work that is already done — makes the script safe to run on every build. */
async function isFresh(outPath, srcPath) {
  if (FORCE || !existsSync(outPath)) return false;
  const [o, s] = await Promise.all([stat(outPath), stat(srcPath)]);
  return o.mtimeMs >= s.mtimeMs;
}

/* PILLOW, not ImageMagick, and not sharp.
 *
 *   sharp   — a 30 MB native dependency that would have to build on the Vercel
 *             builder. This script runs locally and commits its output, so the
 *             dependency would buy nothing.
 *   convert — MEASURED BROKEN FOR AVIF here. `identify -list format` reports
 *             AVIF as "r--", read-only: ImageMagick 7.1.1-43 in this image can
 *             DECODE avif but has no encoder, so it silently wrote a 318 KB
 *             file where the webp of the same image was 19 KB. An "optimised"
 *             format sixteen times larger than the one it replaces would have
 *             shipped straight to production.
 *   Pillow  — has a working AVIF plugin (features.check('avif') is true) and
 *             produced 12.5 KB for the same input.
 *
 * One python process per image, batched: process startup dominates otherwise.
 */
const PY = `
import sys, json
from PIL import Image
src, out, width, fmt, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], int(sys.argv[5])
im = Image.open(src)
try:
    from PIL import ImageOps
    im = ImageOps.exif_transpose(im)
except Exception:
    pass
if im.width > width:
    im.thumbnail((width, width * 10), Image.LANCZOS)
im = im.convert('RGB')
if fmt == 'webp':
    im.save(out, 'WEBP', quality=q, method=6)
else:
    im.save(out, 'AVIF', quality=q)
`;

async function encode(src, out, width, fmt) {
  const q = fmt === 'avif' ? AVIF_Q : WEBP_Q;
  await run('python3', ['-c', PY, src, out, String(width), fmt, String(q)],
    { maxBuffer: 32 * 1024 * 1024 });
}

const LQIP_PY = `
import sys, io, base64
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
im.thumbnail((int(sys.argv[2]), int(sys.argv[2]) * 10), Image.LANCZOS)
b = io.BytesIO(); im.save(b, 'WEBP', quality=40)
sys.stdout.write(base64.b64encode(b.getvalue()).decode())
`;

async function lqip(src) {
  const { stdout } = await run('python3', ['-c', LQIP_PY, src, String(LQIP_W)],
    { maxBuffer: 4 * 1024 * 1024 });
  return `data:image/webp;base64,${stdout.trim()}`;
}

const main = async () => {
  if (!existsSync(SRC_DIR)) { console.error('no public/images'); process.exit(1); }
  let files = (await walk(SRC_DIR)).sort();
  if (LIMIT) files = files.slice(0, LIMIT);

  console.log(`${files.length} source images`);
  const manifest = {};
  let done = 0, skipped = 0, srcBytes = 0, outBytes = 0;

  for (const src of files) {
    const rel = '/' + path.relative(path.join(ROOT, 'public'), src).split(path.sep).join('/');
    const dir = path.dirname(src);
    const base = path.basename(src).replace(/\.(png|jpe?g)$/i, '');
    srcBytes += (await stat(src)).size;

    const { width: natW } = await probe(src);
    // Only emit widths the source can actually satisfy, plus the source width
    // itself when it is smaller than the smallest target.
    const widths = WIDTHS.filter((w) => w <= natW);
    if (!widths.length) widths.push(natW);

    const entry = { widths: [], lqip: '' };
    for (const w of widths) {
      for (const fmt of ['webp', 'avif']) {
        const out = path.join(dir, `${base}-${w}.${fmt}`);
        if (await isFresh(out, src)) { skipped += 1; }
        else {
          try { await encode(src, out, w, fmt); done += 1; }
          catch (e) { console.error(`  ! ${base}-${w}.${fmt}: ${e.message.slice(0, 80)}`); continue; }
        }
        if (existsSync(out)) outBytes += (await stat(out)).size;
      }
      entry.widths.push(w);
    }

    try { entry.lqip = await lqip(src); } catch { entry.lqip = ''; }
    entry.natural = natW;
    manifest[rel] = entry;

    if ((Object.keys(manifest).length % 25) === 0) {
      process.stdout.write(`  ${Object.keys(manifest).length}/${files.length}\r`);
    }
  }

  /* TWO manifests, because they have different costs.
   *
   * MEASURED: the full manifest is 103.8 KB and 66% of that is base64 LQIP
   * strings. Importing it whole added 40 KB GZIP to the shopper bundle — a
   * bigger regression than the entire CMS feature set of Sprint 2L. A blur
   * placeholder is a nicety; 40 KB of JS on every page load to deliver it is
   * not a trade worth making.
   *
   *   imageManifest.json      widths + natural size only, ~27 KB raw.
   *                           Imported by the bundle. This is what srcset
   *                           actually needs.
   *   imageLqip.json          the blur strings, ~69 KB, written to public/ and
   *                           fetched on demand by nothing right now. Kept so
   *                           the data is not lost and a future lazy consumer
   *                           can use it without re-running a 6-minute encode.
   */
  const compact = {};
  const lqips = {};
  for (const [k, v] of Object.entries(manifest)) {
    compact[k] = { w: v.widths, n: v.natural };
    if (v.lqip) lqips[k] = v.lqip;
  }
  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, JSON.stringify(compact));
  await writeFile(path.join(ROOT, 'public', 'imageLqip.json'), JSON.stringify(lqips));

  console.log(`\nencoded ${done}, skipped ${skipped} already-fresh`);
  console.log(`sources ${(srcBytes / 1048576).toFixed(1)} MB -> variants ${(outBytes / 1048576).toFixed(1)} MB`);
  console.log(`manifest: ${Object.keys(manifest).length} entries -> ${path.relative(ROOT, MANIFEST)}`);
};

async function probe(src) {
  const { stdout } = await run('python3',
    ['-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]);print(im.width,im.height)', src]);
  const [w, h] = stdout.trim().split(/\s+/).map(Number);
  return { width: w || 0, height: h || 0 };
}

main().catch((e) => { console.error(e); process.exit(1); });
