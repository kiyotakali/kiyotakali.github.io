/**
 * Custom scripts for news toggle, publication filtering, sidebar pin, and nav close
 */

// ── Background wave-mosaic grid ──────────────────────────────────────────────
// Fixed grid of tiles; each tile's opacity is driven by overlapping sine waves
// → looks like ocean surface viewed from above (gentle rise-and-fall ripple)
(function () {
  var canvas, ctx, t = 0;
  var TILE = 26, GAP = 1;
  var rafId = null;
  var cachedRgb = '38,88,155'; // fixed Cool Blue theme
  var lastDraw = 0;
  var FRAME_MS = 1000 / 24; // ~24 fps — smooth enough, half the CPU of 60 fps

  function frame(ts) {
    rafId = requestAnimationFrame(frame);
    if (ts - lastDraw < FRAME_MS) return; // skip frame — throttle to 24 fps
    lastDraw = ts;

    var w = canvas.width, h = canvas.height;
    var cols = Math.ceil(w / TILE) + 1;
    var rows = Math.ceil(h / TILE) + 1;
    var pre  = 'rgba(' + cachedRgb + ',';

    ctx.clearRect(0, 0, w, h);

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        // Two crossing wave trains + a slow diagonal swell
        var wave = 0.6 * Math.sin(c * 0.21 + t * 0.36) * Math.sin(r * 0.17 + t * 0.28)
                 + 0.4 * Math.sin(c * 0.11 - r * 0.13 + t * 0.19);
        // Cubic bias: crests ~19%, troughs ~0.4% — visible 2:1 light:dark ratio
        var norm = (wave + 1) * 0.5;
        var v    = norm * norm * norm;
        var a    = Math.round((0.004 + v * 0.186) * 100) / 100; // 2dp — browser caches fillStyle
        if (a < 0.02) continue;    // skip near-invisible tiles for speed
        ctx.fillStyle = pre + a + ')';
        ctx.fillRect(c * TILE + GAP, r * TILE + GAP, TILE - GAP, TILE - GAP);
      }
    }

    t += 0.007; // slow, calm wave speed
  }

  var resizeTimer;
  function resize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var newW = window.innerWidth;
      var newH = window.innerHeight;
      // Skip height-only changes ≤ 90px — those are caused by the mobile
      // address bar appearing/disappearing, not a real layout change.
      // Resetting canvas.height in that case blanks the canvas for one frame,
      // producing the visible "shake" on iOS Safari.
      if (newW === canvas.width && Math.abs(newH - canvas.height) <= 90) return;
      canvas.width  = newW;
      canvas.height = newH;
    }, 120);
  }

  // Pause animation when tab is hidden to save CPU/battery
  function onVisibilityChange() {
    if (document.hidden) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      if (!rafId) rafId = requestAnimationFrame(frame);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
                           'z-index:0;pointer-events:none;will-change:transform;' +
                           '-webkit-backface-visibility:hidden;backface-visibility:hidden;';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    rafId = requestAnimationFrame(frame);
  });
})();

// ── Scroll-spy — highlight the active section's nav link ─────────────────────
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('.site-nav__link[href*="#"]');
    if (!links.length) return;

    // Build list of { el, link } pairs for anchors that exist on the page
    var anchors = [];
    links.forEach(function (link) {
      var hash = (link.getAttribute('href') || '').split('#')[1];
      if (!hash) return;
      var el = document.getElementById(hash);
      if (el) anchors.push({ el: el, link: link });
    });
    if (!anchors.length) return;

    var current = null;
    var suppressUntil = 0;
    var nav = document.querySelector('.site-nav');

    // Scroll the nav strip so the active link is always visible
    function scrollNavToLink(link) {
      if (!nav) return;
      var navRect  = nav.getBoundingClientRect();
      var linkRect = link.getBoundingClientRect();
      var pad = 12;
      var visLeft  = linkRect.left  - navRect.left;
      var visRight = linkRect.right - navRect.left;
      if (visLeft < pad) {
        nav.scrollLeft += visLeft - pad;
      } else if (visRight > navRect.width - pad) {
        nav.scrollLeft += visRight - navRect.width + pad;
      }
    }

    function setActive(link) {
      if (current === link) return;
      links.forEach(function (l) { l.classList.remove('nav-active'); });
      current = link;
      if (current) {
        current.classList.add('nav-active');
        scrollNavToLink(current);
      }
    }

    // Click: lock highlight + suppress scroll-spy for 1 s
    // About Me: always scroll to top instead of jumping to anchor.
    // Use capture phase so we fire before jQuery's bubble-phase smoothScroll handler.
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        setActive(link);
        suppressUntil = Date.now() + 1000;
        if ((link.getAttribute('href') || '').indexOf('about-me') !== -1) {
          e.preventDefault();
          e.stopImmediatePropagation(); // block jQuery smoothScroll which fires in bubble phase
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, { capture: true });
    });

    var scrollPending = false;
    function onScroll() {
      if (Date.now() < suppressUntil) return;
      if (scrollPending) return;
      scrollPending = true;
      requestAnimationFrame(function () {
        scrollPending = false;
        if (Date.now() < suppressUntil) return;
        var offset = 80;
        var scrollY = window.scrollY + offset;
        var active = anchors[0].link;
        for (var i = anchors.length - 1; i >= 0; i--) {
          if (anchors[i].el.getBoundingClientRect().top + window.scrollY <= scrollY) {
            active = anchors[i].link;
            break;
          }
        }
        setActive(active);
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });
})();

// Segmented control — move indicator to the active segment
function moveSegIndicator(control, activeBtn) {
  var indicator = control.querySelector('.seg-indicator');
  if (!indicator) return;
  indicator.style.left = activeBtn.offsetLeft + 'px';
  indicator.style.width = activeBtn.offsetWidth + 'px';
}

// News Toggle — smooth animation using exact scrollHeight
function toggleNews() {
  var content = document.getElementById('newsContent');
  var btn = document.getElementById('newsToggleBtn');
  if (!content || !btn) return;

  var btnText = btn.querySelector('span');
  var isExpanded = content.classList.contains('expanded');

  if (isExpanded) {
    content.style.maxHeight = content.scrollHeight + 'px';
    content.classList.remove('expanded');
    requestAnimationFrame(function() { requestAnimationFrame(function() {
      content.style.maxHeight = '300px';
    }); });
    if (btnText) btnText.textContent = 'Show More';
  } else {
    content.style.maxHeight = content.scrollHeight + 'px';
    content.classList.add('expanded');
    content.addEventListener('transitionend', function handler(e) {
      if (e.propertyName === 'max-height') content.style.maxHeight = 'none';
    }, { once: true });
    if (btnText) btnText.textContent = 'Show Less';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Detach sidebar from Stickyfill
  var sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.classList.remove('sticky');
    if (window.Stickyfill) Stickyfill.remove(sidebar);
  }

  // Init all seg-controls: position indicator over the active button
  requestAnimationFrame(function() {
    document.querySelectorAll('.seg-control').forEach(function(control) {
      var activeBtn = control.querySelector('.seg-btn.active');
      if (activeBtn) moveSegIndicator(control, activeBtn);
    });
  });

  // Publication filter
  var pubFilter = document.getElementById('pubFilter');
  var boxes = document.querySelectorAll('.paper-box');
  if (pubFilter) {
    pubFilter.querySelectorAll('.seg-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        pubFilter.querySelectorAll('.seg-btn').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        moveSegIndicator(pubFilter, btn);
        var filter = btn.dataset.filter;
        boxes.forEach(function(box) {
          var isCore = box.dataset.core === 'true';
          box.style.display = (filter === 'all' || (filter === 'core' && isCore)) ? '' : 'none';
        });
      });
    });
  }

  // News toggle
  var newsToggle = document.getElementById('newsToggleBtn');
  if (newsToggle) newsToggle.addEventListener('click', toggleNews);
});

// Sidebar Pin — JS-based because CSS position:sticky is unreliable with the
// Susy float-based grid layout used by this theme.
(function () {
  var BREAKPOINT = 925;

  function pin() {
    if (window.innerWidth < BREAKPOINT) return;
    var sidebar = document.querySelector('.sidebar');
    if (!sidebar || sidebar.classList.contains('sidebar--pinned')) return;

    var masthead = document.querySelector('.masthead');
    var top = masthead ? Math.round(masthead.getBoundingClientRect().bottom) : 0;
    var rect = sidebar.getBoundingClientRect();

    // Spacer keeps the layout width occupied
    var spacer = document.createElement('div');
    spacer.className = 'sidebar-spacer';
    spacer.style.width = Math.round(rect.width) + 'px';
    spacer.style.flexShrink = '0';
    sidebar.parentNode.insertBefore(spacer, sidebar);

    sidebar.style.top = top + 'px';
    sidebar.style.left = Math.round(rect.left) + 'px';
    sidebar.style.width = Math.round(rect.width) + 'px';
    sidebar.classList.add('sidebar--pinned');
  }

  function unpin() {
    var sidebar = document.querySelector('.sidebar');
    var spacer = document.querySelector('.sidebar-spacer');
    if (sidebar) {
      sidebar.classList.remove('sidebar--pinned');
      sidebar.style.top = sidebar.style.left = sidebar.style.width = '';
    }
    if (spacer && spacer.parentNode) spacer.parentNode.removeChild(spacer);
  }

  document.addEventListener('DOMContentLoaded', function () {
    requestAnimationFrame(pin);
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    unpin();
    resizeTimer = setTimeout(function () { requestAnimationFrame(pin); }, 150);
  });
})();

// (scroll-spy and nav click handling moved above)
