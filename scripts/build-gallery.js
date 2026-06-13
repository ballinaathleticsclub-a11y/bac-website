'use strict';

/**
 * build-gallery.js
 * Reads images/gallery/originals/, produces thumb/ and full/ resized copies,
 * and regenerates the grid markup in gallery/index.html.
 *
 * Run from repo root: node scripts/build-gallery.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const ORIGINALS = path.join(REPO, 'images', 'gallery', 'originals');
const THUMB_DIR = path.join(REPO, 'images', 'gallery', 'thumb');
const FULL_DIR = path.join(REPO, 'images', 'gallery', 'full');
const GALLERY_HTML = path.join(REPO, 'gallery', 'index.html');

const THUMB_MAX = 800;
const FULL_MAX = 1800;
const THUMB_Q = 80;
const FULL_Q = 82;

const START_MARKER = '<!-- GALLERY:START -->';
const END_MARKER = '<!-- GALLERY:END -->';

async function processImage(srcPath, name) {
  const base = path.basename(name, path.extname(name)).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const thumbPath = path.join(THUMB_DIR, base + '.jpg');
  const fullPath = path.join(FULL_DIR, base + '.jpg');

  // thumb
  const thumbMeta = await sharp(srcPath)
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: THUMB_Q, mozjpeg: true })
    .withMetadata(false)
    .toFile(thumbPath);

  // full
  const fullMeta = await sharp(srcPath)
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: FULL_Q, mozjpeg: true })
    .withMetadata(false)
    .toFile(fullPath);

  return {
    name: base,
    thumbW: thumbMeta.width,
    thumbH: thumbMeta.height,
  };
}

async function main() {
  const files = fs.readdirSync(ORIGINALS)
    .filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f))
    .sort();

  console.log('Processing ' + files.length + ' images...');

  const items = [];
  let done = 0;
  for (const f of files) {
    const srcPath = path.join(ORIGINALS, f);
    try {
      const item = await processImage(srcPath, f);
      items.push(item);
      done++;
      if (done % 20 === 0) console.log('  ' + done + '/' + files.length + ' done...');
    } catch (err) {
      console.error('Error processing ' + f + ':', err.message);
    }
  }

  console.log('All images processed. Generating markup...');

  // Build gallery markup
  const lines = items.map(item =>
    '    <a class="g-item" href="/images/gallery/full/' + item.name + '.jpg">\n' +
    '      <img loading="lazy" width="' + item.thumbW + '" height="' + item.thumbH + '"\n' +
    '           src="/images/gallery/thumb/' + item.name + '.jpg"\n' +
    '           alt="Ballina Athletics Club members at Shelly Beach">\n' +
    '    </a>'
  );

  const gridMarkup = '\n' + lines.join('\n') + '\n  ';

  // Inject into gallery/index.html
  const html = fs.readFileSync(GALLERY_HTML, 'utf8');
  const startIdx = html.indexOf(START_MARKER);
  const endIdx = html.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    console.error('ERROR: Could not find GALLERY:START / GALLERY:END markers in gallery/index.html');
    process.exit(1);
  }

  const before = html.slice(0, startIdx + START_MARKER.length);
  const after = html.slice(endIdx);
  const newHtml = before + gridMarkup + after;

  fs.writeFileSync(GALLERY_HTML, newHtml, 'utf8');
  console.log('gallery/index.html updated with ' + items.length + ' items.');
}

main().catch(err => { console.error(err); process.exit(1); });
