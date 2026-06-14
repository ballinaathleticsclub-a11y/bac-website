'use strict';

/**
 * build-gallery.js  (multi-album)
 * Scans images/gallery/ for album slugs, compresses originals if present,
 * generates per-album pages at gallery/<slug>/index.html and an index at
 * gallery/index.html.
 *
 * Run from repo root: node scripts/build-gallery.js
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const REPO         = path.join(__dirname, '..');
const GALLERY_IMG  = path.join(REPO, 'images', 'gallery');
const ORIGINALS    = path.join(GALLERY_IMG, 'originals');
const GALLERY_HTML = path.join(REPO, 'gallery');

const THUMB_MAX = 800;
const FULL_MAX  = 1800;
const THUMB_Q   = 80;
const FULL_Q    = 82;

const GALLERY_START = '<!-- GALLERY:START -->';
const GALLERY_END   = '<!-- GALLERY:END -->';
const ALBUMS_START  = '<!-- ALBUMS:START -->';
const ALBUMS_END    = '<!-- ALBUMS:END -->';

/* ── helpers ─────────────────────────────────────────────────── */

function toSlugTitle(slug) {
  return slug.split('-').map(function(w) {
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

function injectBetween(html, start, end, content) {
  var si = html.indexOf(start);
  var ei = html.indexOf(end);
  if (si === -1 || ei === -1) throw new Error('Markers not found: ' + start);
  return html.slice(0, si + start.length) + content + html.slice(ei);
}

/* ── shared HTML blocks ──────────────────────────────────────── */

var HEAD_LINKS = [
  '<script src="/js/flags.js"></script>',
  '<link rel="stylesheet" href="/css/site.css?v=3">',
  '<link rel="stylesheet" href="/css/gallery.css?v=2">'
].join('\n');

var REVEAL_SCRIPT = [
  '<script>',
  '/* Scroll-reveal: self-contained and fail-open. In <head> so an error in',
  '   site.js can never hide page content. Arms before paint (no flash). */',
  '(function(){',
  '  var de=document.documentElement;',
  '  if((window.matchMedia&&matchMedia(\'(prefers-reduced-motion:reduce)\').matches)||!(\'IntersectionObserver\' in window))return;',
  '  de.classList.add(\'reveal-on\');',
  '  document.addEventListener(\'DOMContentLoaded\',function(){',
  '    var io=new IntersectionObserver(function(entries){',
  '      entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add(\'in\');io.unobserve(e.target);}});',
  '    },{threshold:0.12});',
  '    document.querySelectorAll(\'.reveal\').forEach(function(el){io.observe(el);});',
  '  });',
  '})();',
  '</script>'
].join('\n');

var HEADER = [
  '<header class="site-head">',
  '  <div class="wrap head-row">',
  '    <a class="brand" href="/" aria-label="Ballina Athletics Club home">',
  '      <span class="brand-mark" aria-hidden="true">B</span>',
  '      <span class="brand-name">Ballina Athletics Club<span>Est. on Shelly Beach</span></span>',
  '    </a>',
  '    <nav class="nav" id="nav" aria-label="Primary">',
  '      <div class="nav-item has-drop">',
  '        <button class="nav-drop-toggle" aria-expanded="false" aria-haspopup="true">About <span class="nav-caret" aria-hidden="true">&#9660;</span></button>',
  '        <ul class="nav-drop" role="menu">',
  '          <li><a href="/history/" role="menuitem">History</a></li>',
  '          <li><a href="/committee/" role="menuitem">Committee</a></li>',
  '          <li><a href="/calendar/" role="menuitem">Calendar</a></li>',
  '          GALLERY_NAV_ITEM',
  '        </ul>',
  '      </div>',
  '      <div class="nav-item has-drop">',
  '        <button class="nav-drop-toggle" aria-expanded="false" aria-haspopup="true">Members <span class="nav-caret" aria-hidden="true">&#9660;</span></button>',
  '        <ul class="nav-drop" role="menu">',
  '          <li><a href="/new-members/" role="menuitem">New Members</a></li>',
  '          <li><a href="/general-faqs/" role="menuitem">FAQs</a></li>',
  '          <li><a href="/the-handicap-system-explained/" role="menuitem">Handicap System</a></li>',
  '          <li><a href="/membership/" role="menuitem">Membership</a></li>',
  '          <li><a href="/points-prizes/" role="menuitem">Points &amp; Prizes</a></li>',
  '        </ul>',
  '      </div>',
  '      <div class="nav-item has-drop">',
  '        <button class="nav-drop-toggle" aria-expanded="false" aria-haspopup="true">Courses <span class="nav-caret" aria-hidden="true">&#9660;</span></button>',
  '        <ul class="nav-drop" role="menu">',
  '          <li><a href="/courses/" role="menuitem">Courses</a></li>',
  '          <li><a href="/3k-course/" role="menuitem">3K Course</a></li>',
  '          <li><a href="/6k-course/" role="menuitem">6K Course</a></li>',
  '        </ul>',
  '      </div>',
  '      <a class="navlink" href="/volunteer/">Volunteer</a>',
  '      <a class="navlink" href="/results-2/">Results</a>',
  '      <a class="navlink" href="/contact/">Contact</a>',
  '    </nav>',
  '    <div class="head-cta">',
  '      <a class="btn btn--ghost applink-start" href="https://season.ballinaathletics.club/results.html" target="_blank" rel="noopener">Start times <span class="arrow">&rsaquo;</span></a>',
  '      <a class="btn btn--blue" href="/join/">Join now</a>',
  '      <button class="navtoggle" id="navtoggle" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><span></span><span></span><span></span></button>',
  '    </div>',
  '  </div>',
  '</header>'
].join('\n');

var FOOTER = [
  '<footer class="site-foot">',
  '  <div class="wrap">',
  '    <div class="foot-grid">',
  '      <div class="foot-brand">',
  '        <span class="brand-name">Ballina Athletics Club<span style="font-family:var(--mono);font-size:.62rem;letter-spacing:.22em;color:var(--blue-bright);text-transform:uppercase;display:block;margin-top:4px">Est. on Shelly Beach</span></span>',
  '        <p>A community handicap fun-run club on the NSW north coast. Everyone gets a fair start, and anyone can win.</p>',
  '      </div>',
  '      <div class="foot-col">',
  '        <h4>The club</h4>',
  '        <a href="/history/">History</a>',
  '        <a href="/committee/">Committee</a>',
  '        <a href="/calendar/">Calendar</a>',
  '        <a href="/volunteer/">Volunteer</a>',
  '        <a href="/results-2/">Results</a>',
  '      </div>',
  '      <div class="foot-col">',
  '        <h4>Members</h4>',
  '        <a class="applink-start" href="https://season.ballinaathletics.club/results.html" target="_blank" rel="noopener">Season app &amp; start times</a>',
  '        <a href="/new-members/">New members</a>',
  '        <a href="/the-handicap-system-explained/">The handicap explained</a>',
  '        <a href="/membership/">Membership</a>',
  '        <a href="https://www.facebook.com/groups/ballinaathleticsclubnsw/" target="_blank" rel="noopener">Facebook group</a>',
  '      </div>',
  '    </div>',
  '    <p class="acknowledge">Ballina Athletics Club runs on the lands of the Bundjalung people. We acknowledge the Traditional Custodians of this Country and pay our respects to Elders past and present.</p>',
  '    <div class="foot-base">',
  '      <span>&copy; <span id="year"></span> Ballina Athletics Club</span>',
  '      <span>Shelly Beach &middot; Ballina &middot; NSW</span>',
  '    </div>',
  '  </div>',
  '</footer>',
  '<script src="/js/site.js?v=2" defer></script>',
  '<script src="/js/gallery.js?v=2" defer></script>'
].join('\n');

/* ── compress one image ──────────────────────────────────────── */

async function compressImage(srcPath, thumbPath, fullPath) {
  fs.mkdirSync(path.dirname(thumbPath), { recursive: true });
  fs.mkdirSync(path.dirname(fullPath),  { recursive: true });

  var thumbMeta = await sharp(srcPath)
    .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: THUMB_Q, mozjpeg: true })
    .withMetadata(false)
    .toFile(thumbPath);

  await sharp(srcPath)
    .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: FULL_Q, mozjpeg: true })
    .withMetadata(false)
    .toFile(fullPath);

  return { width: thumbMeta.width, height: thumbMeta.height };
}

/* ── discover album slugs ────────────────────────────────────── */

function discoverAlbums() {
  var slugSet = {};

  // Albums that already have a thumb/ dir
  var entries = fs.readdirSync(GALLERY_IMG);
  entries.forEach(function(entry) {
    var thumbDir = path.join(GALLERY_IMG, entry, 'thumb');
    try {
      var stat = fs.statSync(path.join(GALLERY_IMG, entry));
      if (stat.isDirectory() && entry !== 'originals' && fs.existsSync(thumbDir)) {
        slugSet[entry] = true;
      }
    } catch (e) { /* skip */ }
  });

  // Albums that have an originals/<slug>/ folder
  if (fs.existsSync(ORIGINALS)) {
    fs.readdirSync(ORIGINALS).forEach(function(entry) {
      var stat = fs.statSync(path.join(ORIGINALS, entry));
      if (stat.isDirectory()) slugSet[entry] = true;
    });
  }

  return Object.keys(slugSet).sort();
}

/* ── process one album ───────────────────────────────────────── */

async function processAlbum(slug) {
  console.log('\n[album] ' + slug);

  var albumImgDir = path.join(GALLERY_IMG, slug);
  var thumbDir    = path.join(albumImgDir, 'thumb');
  var fullDir     = path.join(albumImgDir, 'full');
  var originalsDir = path.join(ORIGINALS, slug);

  var hasOriginals = fs.existsSync(originalsDir);
  var hasThumb     = fs.existsSync(thumbDir);

  var items = [];

  if (hasOriginals) {
    // Compress from originals
    var files = fs.readdirSync(originalsDir)
      .filter(function(f) { return /\.(jpe?g|png|webp|tiff?)$/i.test(f); })
      .sort();
    console.log('  Compressing ' + files.length + ' originals...');
    var done = 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var base = path.basename(f, path.extname(f)).toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      var tPath = path.join(thumbDir, base + '.jpg');
      var fPath = path.join(fullDir,  base + '.jpg');
      try {
        var dims = await compressImage(path.join(originalsDir, f), tPath, fPath);
        items.push({ name: base, w: dims.width, h: dims.height });
        done++;
        if (done % 20 === 0) console.log('  ' + done + '/' + files.length + ' done...');
      } catch (err) {
        console.error('  Error: ' + f + ' — ' + err.message);
      }
    }
    console.log('  Compressed ' + done + ' images.');
  } else if (hasThumb) {
    // Read existing thumb dimensions via sharp metadata
    var thumbFiles = fs.readdirSync(thumbDir)
      .filter(function(f) { return /\.jpe?g$/i.test(f); })
      .sort();
    console.log('  Reading metadata for ' + thumbFiles.length + ' existing thumbs...');
    var done2 = 0;
    for (var j = 0; j < thumbFiles.length; j++) {
      var tf = thumbFiles[j];
      var base2 = path.basename(tf, path.extname(tf));
      try {
        var meta = await sharp(path.join(thumbDir, tf)).metadata();
        items.push({ name: base2, w: meta.width, h: meta.height });
        done2++;
      } catch (err2) {
        console.error('  Meta error: ' + tf + ' — ' + err2.message);
      }
    }
    console.log('  Read ' + done2 + ' image dimensions.');
  } else {
    console.warn('  WARNING: no originals and no thumb/ for slug "' + slug + '" — skipping.');
    return null;
  }

  // Read meta.json
  var metaPath = path.join(albumImgDir, 'meta.json');
  var meta = {};
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { /* ignore */ }
  }

  var title = meta.title || toSlugTitle(slug);
  var date  = meta.date  || slug;
  var cover = meta.cover || (items.length > 0 ? items[0].name + '.jpg' : '');

  return { slug: slug, title: title, date: date, cover: cover, items: items };
}

/* ── generate per-album page ─────────────────────────────────── */

function buildAlbumPage(album) {
  var slug  = album.slug;
  var title = album.title;

  var navItem = '<li><a href="/gallery/" role="menuitem">Gallery</a></li>';
  var headerHtml = HEADER.replace('GALLERY_NAV_ITEM', navItem);

  var gridLines = album.items.map(function(item) {
    return [
      '    <a class="g-item" href="/images/gallery/' + slug + '/full/' + item.name + '.jpg">',
      '      <img loading="lazy" width="' + item.w + '" height="' + item.h + '"',
      '           src="/images/gallery/' + slug + '/thumb/' + item.name + '.jpg"',
      '           alt="Ballina Athletics Club members at Shelly Beach">',
      '    </a>'
    ].join('\n');
  });

  var gridMarkup = '\n' + gridLines.join('\n') + '\n  ';

  var html = [
    '<!DOCTYPE html>',
    '<html lang="en-AU">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + title + ' | Gallery | Ballina Athletics Club</title>',
    '<meta name="description" content="Photos from Ballina Athletics Club Sunday morning fun runs at Shelly Beach — ' + title + '.">',
    '<meta property="og:title" content="' + title + ' | Gallery | Ballina Athletics Club">',
    '<meta property="og:description" content="Sunday mornings at Shelly Beach. Photos from the Ballina Athletics Club fun runs.">',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="en_AU">',
    '<meta property="og:url" content="https://ballinaathletics.club/gallery/' + slug + '/">',
    '<link rel="canonical" href="https://ballinaathletics.club/gallery/' + slug + '/">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;600;700;800;900&family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">',
    HEAD_LINKS,
    REVEAL_SCRIPT,
    '</head>',
    '<body>',
    '<a class="skip" href="#main">Skip to content</a>',
    '',
    headerHtml,
    '',
    '<main id="main">',
    '  <section class="page-hero">',
    '    <div class="wrap">',
    '      <p class="eyebrow">THE ALBUM</p>',
    '      <h1>' + title + '</h1>',
    '      <p class="lead">Real mornings, real members. Photography by the club.</p>',
    '    </div>',
    '  </section>',
    '',
    '  <section class="section section--white">',
    '    <div class="wrap">',
    '      <a href="/gallery/" class="gallery-back">&larr; All albums</a>',
    '      <div id="gallery-grid">',
    '        ' + GALLERY_START,
    gridMarkup,
    '        ' + GALLERY_END,
    '      </div>',
    '    </div>',
    '  </section>',
    '</main>',
    '',
    FOOTER,
    '</body>',
    '</html>',
    ''
  ].join('\n');

  var dir = path.join(GALLERY_HTML, slug);
  fs.mkdirSync(dir, { recursive: true });
  var outPath = path.join(dir, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('  Wrote ' + path.relative(REPO, outPath));
}

/* ── generate album index page ───────────────────────────────── */

function buildIndexPage(albums) {
  // Sort newest date first
  var sorted = albums.slice().sort(function(a, b) {
    return b.date < a.date ? -1 : b.date > a.date ? 1 : 0;
  });

  var navItem = '<li><a href="/gallery/" role="menuitem" aria-current="page">Gallery</a></li>';
  var headerHtml = HEADER.replace('GALLERY_NAV_ITEM', navItem);

  var cardLines = sorted.map(function(album) {
    return [
      '    <a class="album-card" href="/gallery/' + album.slug + '/">',
      '      <div class="album-cover">',
      '        <img loading="lazy" src="/images/gallery/' + album.slug + '/thumb/' + album.cover + '" alt="' + album.title + '">',
      '      </div>',
      '      <div class="album-info">',
      '        <span class="album-title">' + album.title + '</span>',
      '        <span class="album-count">' + album.items.length + ' photos</span>',
      '      </div>',
      '    </a>'
    ].join('\n');
  });

  var cardsMarkup = '\n' + cardLines.join('\n') + '\n  ';

  var html = [
    '<!DOCTYPE html>',
    '<html lang="en-AU">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>Gallery | Ballina Athletics Club</title>',
    '<meta name="description" content="Photos from Sunday morning fun runs at Shelly Beach, Ballina. All ages, all paces, every week.">',
    '<meta property="og:title" content="Gallery | Ballina Athletics Club">',
    '<meta property="og:description" content="Sunday mornings at Shelly Beach. Photos from the Ballina Athletics Club fun runs.">',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="en_AU">',
    '<meta property="og:url" content="https://ballinaathletics.club/gallery/">',
    '<link rel="canonical" href="https://ballinaathletics.club/gallery/">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;600;700;800;900&family=Hanken+Grotesk:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">',
    HEAD_LINKS,
    REVEAL_SCRIPT,
    '</head>',
    '<body>',
    '<a class="skip" href="#main">Skip to content</a>',
    '',
    headerHtml,
    '',
    '<main id="main">',
    '  <section class="page-hero">',
    '    <div class="wrap">',
    '      <p class="eyebrow">THE ALBUMS</p>',
    '      <h1>PHOTOS</h1>',
    '      <p class="lead">Mornings at Shelly Beach, by the club.</p>',
    '    </div>',
    '  </section>',
    '',
    '  <section class="section section--white">',
    '    <div class="wrap">',
    '      <div class="albums-grid">',
    '        ' + ALBUMS_START,
    cardsMarkup,
    '        ' + ALBUMS_END,
    '      </div>',
    '    </div>',
    '  </section>',
    '</main>',
    '',
    FOOTER,
    '</body>',
    '</html>',
    ''
  ].join('\n');

  var outPath = path.join(GALLERY_HTML, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('Wrote gallery/index.html (' + sorted.length + ' albums)');
}

/* ── main ────────────────────────────────────────────────────── */

async function main() {
  var slugs = discoverAlbums();
  console.log('Found albums: ' + slugs.join(', '));

  var albums = [];
  for (var i = 0; i < slugs.length; i++) {
    var album = await processAlbum(slugs[i]);
    if (album) {
      buildAlbumPage(album);
      albums.push(album);
    }
  }

  buildIndexPage(albums);
  console.log('\nDone. ' + albums.length + ' albums built.');
}

main().catch(function(err) { console.error(err); process.exit(1); });
