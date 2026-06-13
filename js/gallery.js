(function () {
  'use strict';

  /* Guard: only run on pages with gallery items */
  var items = Array.from(document.querySelectorAll('.g-item'));
  if (!items.length) return;

  /* Build data array */
  var gallery = items.map(function (a) {
    var img = a.querySelector('img');
    return {
      full: a.getAttribute('href'),
      thumb: img ? img.getAttribute('src') : '',
      alt: img ? img.getAttribute('alt') : ''
    };
  });

  var current = 0;
  var lastFocused = null;
  var overlay = null;
  var overlayImg = null;
  var counterEl = null;
  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Build lightbox DOM (once) ── */
  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'g-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Photo lightbox');
    overlay.setAttribute('hidden', '');

    /* Top bar */
    var top = document.createElement('div');
    top.className = 'g-top';

    var topActions = document.createElement('div');
    topActions.className = 'g-top-actions';

    var dlBtn = document.createElement('a');
    dlBtn.className = 'g-dl';
    dlBtn.setAttribute('aria-label', 'Download photo');
    dlBtn.setAttribute('download', '');
    dlBtn.innerHTML = '<button aria-label="Download photo" style="text-decoration:none">&#8681;</button>';

    var shareBtn = document.createElement('button');
    shareBtn.className = 'g-share';
    shareBtn.setAttribute('aria-label', 'Share photo');
    shareBtn.innerHTML = '&#8679;';
    if (!navigator.share) shareBtn.style.display = 'none';

    topActions.appendChild(dlBtn);
    topActions.appendChild(shareBtn);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'g-close';
    closeBtn.setAttribute('aria-label', 'Close lightbox');
    closeBtn.innerHTML = '&#215;';

    top.appendChild(topActions);
    top.appendChild(closeBtn);
    overlay.appendChild(top);

    /* Image wrapper */
    var imgWrap = document.createElement('div');
    imgWrap.className = 'g-img-wrap';
    overlayImg = document.createElement('img');
    overlayImg.setAttribute('alt', '');
    imgWrap.appendChild(overlayImg);
    overlay.appendChild(imgWrap);

    /* Prev / Next */
    var prevBtn = document.createElement('button');
    prevBtn.className = 'g-prev';
    prevBtn.setAttribute('aria-label', 'Previous photo');
    prevBtn.innerHTML = '&#8592;';
    overlay.appendChild(prevBtn);

    var nextBtn = document.createElement('button');
    nextBtn.className = 'g-next';
    nextBtn.setAttribute('aria-label', 'Next photo');
    nextBtn.innerHTML = '&#8594;';
    overlay.appendChild(nextBtn);

    /* Counter */
    counterEl = document.createElement('div');
    counterEl.className = 'g-counter';
    counterEl.setAttribute('aria-live', 'polite');
    counterEl.setAttribute('aria-atomic', 'true');
    overlay.appendChild(counterEl);

    document.body.appendChild(overlay);

    /* ── Events ── */

    closeBtn.addEventListener('click', closeLightbox);

    prevBtn.addEventListener('click', function () { navigate(-1); });
    nextBtn.addEventListener('click', function () { navigate(1); });

    /* Backdrop click (not img click) */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target === imgWrap) closeLightbox();
    });

    /* Download button */
    dlBtn.addEventListener('click', function (e) {
      e.stopPropagation();
    });
    dlBtn.querySelector('button').addEventListener('click', function (e) {
      e.stopPropagation();
      var link = document.createElement('a');
      link.href = gallery[current].full;
      link.download = '';
      link.click();
    });

    /* Share button */
    shareBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (navigator.share) {
        navigator.share({
          title: 'Ballina Athletics Club',
          text: gallery[current].alt,
          url: window.location.origin + gallery[current].full
        }).catch(function () {});
      }
    });

    /* Keyboard in overlay */
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeLightbox(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); return; }
      /* Focus trap */
      if (e.key === 'Tab') {
        var focusable = Array.from(overlay.querySelectorAll(
          'button, a[href], [tabindex]:not([tabindex="-1"])'
        )).filter(function (el) { return el.offsetParent !== null; });
        if (!focusable.length) { e.preventDefault(); return; }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });

    /* Swipe */
    var touchStartX = 0;
    overlay.addEventListener('touchstart', function (e) {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    overlay.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ── Open / close / navigate ── */
  function showPhoto(idx) {
    current = (idx + gallery.length) % gallery.length;
    var item = gallery[current];
    overlayImg.src = item.full;
    overlayImg.alt = item.alt;
    counterEl.textContent = (current + 1) + ' of ' + gallery.length;
    /* Update download link */
    var dlBtn = overlay.querySelector('.g-dl button');
    if (dlBtn) dlBtn.setAttribute('aria-label', 'Download photo ' + (current + 1));
  }

  function openLightbox(idx) {
    if (!overlay) buildOverlay();
    lastFocused = document.activeElement;
    overlay.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    showPhoto(idx);
    /* Focus close button */
    var closeBtn = overlay.querySelector('.g-close');
    if (closeBtn) closeBtn.focus();
    /* Global keyboard */
    document.addEventListener('keydown', globalKeydown);
  }

  function closeLightbox() {
    if (!overlay) return;
    overlay.setAttribute('hidden', '');
    document.body.style.overflow = '';
    overlayImg.src = '';
    document.removeEventListener('keydown', globalKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function navigate(dir) {
    showPhoto(current + dir);
  }

  function globalKeydown(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
  }

  /* ── Intercept thumbnail clicks ── */
  items.forEach(function (a, idx) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      openLightbox(idx);
    });
  });

})();
