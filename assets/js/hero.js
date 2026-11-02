// ------------------------------------------------------------------------------------ //
// ------------------------------- HOME HERO + INTRO LOADER --------------------------- //
// ------------------------------------------------------------------------------------ //
// Runs after script.js (which sets --ui-scale on <html>). Everything here is index-only.

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('[data-hero]');
  if (!hero) return;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactQuery = window.matchMedia('(max-width: 900px)');
  // The title's departure runs as a scroll-driven animation (compositor, no lag) where
  // supported; otherwise the scroll handler drives the same motion.
  const scrollTimelines = window.CSS && CSS.supports('animation-timeline: scroll()');

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const uiScale = () => parseFloat(root.style.getPropertyValue('--ui-scale')) || 1;

  // --------------------------------- TITLE: OUTLINE + FILL LAYERS ---------------------------------
  // Each line is split into characters, then the whole title is cloned: an ink outline layer
  // below and the solid fill on top. --i staggers the reveal and the scroll drain.
  const title = hero.querySelector('[data-hero-title]');
  let fillChars = [];

  if (title) {
    let index = 0;
    const splitInto = (node, target) => {
      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          [...child.textContent].forEach((ch) => {
            if (ch === ' ') { target.appendChild(document.createTextNode(' ')); return; }
            const outer = document.createElement('span');
            outer.className = 'hero__char';
            outer.style.setProperty('--i', index++);
            const inner = document.createElement('span');
            inner.textContent = ch;
            outer.appendChild(inner);
            target.appendChild(outer);
          });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const copy = child.cloneNode(false);
          target.appendChild(copy);
          splitInto(child, copy);
        }
      });
    };

    const outline = document.createElement('span');
    outline.className = 'hero__title-outline';
    outline.setAttribute('aria-hidden', 'true');
    title.querySelectorAll('.hero__line').forEach((line) => {
      const copy = line.cloneNode(false);
      splitInto(line, copy);
      outline.appendChild(copy);
    });
    const fill = outline.cloneNode(true);
    fill.className = 'hero__title-fill';

    title.textContent = '';
    title.append(outline, fill);
    fillChars = [...fill.querySelectorAll('.hero__char')];
  }

  hero.querySelectorAll('.hero__tags li').forEach((el, i) => el.style.setProperty('--i', i));

  // --------------------------------- INTRO LOADER: THE ATOM ---------------------------------
  // Gears orbit (spinning as they go) and land exactly on their logo positions once the page
  // is ready; the pencil swings in counter-clockwise and the spanner clockwise to cross.
  const loader = document.getElementById('introLoader');

  let heroInAt = 0;            // when the intro reveal started (phones time their autoplay from it)

  function startHero() {
    heroInAt = performance.now();
    root.classList.add('hero-in');
  }

  if (!loader || !root.classList.contains('is-loading')) {
    if (loader) loader.remove();
    startHero();
  } else {
    const ATOM = { cx: 224, cy: 248, rx: 218, ry: 90 };
    const gears = [...loader.querySelectorAll('.atom__gear')].map((el) => ({
      el,
      orbit: parseFloat(el.dataset.orbit) * Math.PI / 180,
      theta: parseFloat(el.dataset.theta),
    }));
    const pencil = loader.querySelector('.atom__pencil');
    const spanner = loader.querySelector('.atom__spanner');
    const count = document.getElementById('loaderCount');
    const paintImg = hero.querySelector('.paint__img');

    let repeatVisit = false;
    try { repeatVisit = sessionStorage.getItem('nh-intro-seen') === '1'; } catch (e) { /* storage blocked */ }

    const pace = repeatVisit ? 1.7 : 1;           // repeat visits in a session run faster
    const minDuration = 1900 / pace;
    const maxDuration = 5000;
    const ORBIT_SPEED = 0.24 * pace;               // degrees of orbit per ms
    const SPIN_RATIO = 2.5;                        // self-spin per degree of orbit (lands on a tooth)
    const TOOLS_START = 250 / pace;
    const TOOLS_DURATION = 1400 / pace;
    const HOLD = 380 / pace;
    const startedAt = performance.now();
    let readyAt = 0;
    let landing = null;                            // { at, from, distance, duration }

    const imgReady = paintImg && !paintImg.complete
      ? new Promise((res) => { paintImg.addEventListener('load', res, { once: true }); paintImg.addEventListener('error', res, { once: true }); })
      : Promise.resolve();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([imgReady, fontsReady]).then(() => { readyAt = performance.now(); });

    function placeGear(gear, phase, scale) {
      const th = (gear.theta + phase) * Math.PI / 180;
      const x = ATOM.cx + ATOM.rx * Math.cos(th) * Math.cos(gear.orbit) - ATOM.ry * Math.sin(th) * Math.sin(gear.orbit);
      const y = ATOM.cy + ATOM.rx * Math.cos(th) * Math.sin(gear.orbit) + ATOM.ry * Math.sin(th) * Math.cos(gear.orbit);
      const spin = -(phase * SPIN_RATIO) % 360;
      gear.el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${spin.toFixed(2)}) scale(${scale.toFixed(3)})`);
    }

    // Time-based (not frame-counted), so sparse frames in background tabs still finish on time
    function tick() {
      const now = performance.now();
      const t = now - startedAt;
      if (!readyAt && t > maxDuration) readyAt = now;

      // Orbit phase: constant speed, then a landing that ends on a whole number of turns
      let phase = t * ORBIT_SPEED;
      let landed = 0;
      if (!landing && readyAt && t >= Math.max(minDuration, TOOLS_START + TOOLS_DURATION)) {
        const minTravel = 110;
        const distance = minTravel + ((360 - ((phase + minTravel) % 360)) % 360);
        const duration = clamp((3 * distance) / ORBIT_SPEED, 900 / pace, 1800 / pace);
        landing = { at: t, from: phase, distance, duration };
      }
      if (landing) {
        landed = clamp((t - landing.at) / landing.duration);
        phase = landing.from + landing.distance * easeOutCubic(landed);
      }
      const gearScale = easeOutBack(clamp(t / (650 / pace)));
      gears.forEach((gear) => placeGear(gear, phase, gearScale));

      // Tools swing in from opposite sides and cross
      const toolT = clamp((t - TOOLS_START) / TOOLS_DURATION);
      const swing = 1 - easeOutBack(toolT);
      const toolScale = lerp(0.55, 1, easeOutCubic(toolT));
      if (pencil) {
        pencil.setAttribute('transform', `rotate(${(swing * 160).toFixed(2)}) scale(${toolScale.toFixed(3)})`);
        pencil.style.opacity = clamp(toolT * 4).toFixed(2);
      }
      if (spanner) {
        spanner.setAttribute('transform', `rotate(${(swing * -160).toFixed(2)}) scale(${toolScale.toFixed(3)})`);
        spanner.style.opacity = clamp(toolT * 4).toFixed(2);
      }

      // Counter: up to 90 while loading, the last 10 during the landing
      const shown = landing ? 0.9 + 0.1 * landed : 0.9 * easeOutCubic(clamp(t / minDuration));
      if (count) count.textContent = String(Math.round(shown * 100)).padStart(3, '0');

      if (landed < 1) {
        requestAnimationFrame(tick);
        return;
      }
      try { sessionStorage.setItem('nh-intro-seen', '1'); } catch (e) { /* storage blocked */ }
      setTimeout(leave, HOLD);
    }

    function leave() {
      loader.classList.add('is-leaving');
      root.classList.remove('is-loading');
      setTimeout(startHero, 300);
      setTimeout(() => loader.remove(), 1300);
    }

    requestAnimationFrame(tick);
  }

  // --------------------------------- SECTION REVEALS (NAV DIAL, CONTACT) ---------------------------------
  // Each [data-reveal] section animates in once, the first time it scrolls into view.
  // .is-revealing carries the reveal transitions and is dropped afterwards, so the
  // controls' own hover/press transitions apply again.
  const revealSections = document.querySelectorAll('[data-reveal]');

  // The navigation dial gives a little turn: knob and rings swing cw/ccw and settle
  function wiggleDial() {
    const knob = document.getElementById('nav-knob');
    const outerRing = document.getElementById('nav-outer-ring');
    const innerRing = document.getElementById('nav-inner-ring');
    if (!knob || !knob.animate) return;
    const swing = (el, base, angles, delay) => el && el.animate(
      angles.map((a, i) => ({ transform: `${base}rotate(${a}deg)`, offset: i / (angles.length - 1) })),
      { duration: 1900, delay, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }
    );
    swing(knob, 'translate(-50%, -50%) ', [0, 38, -24, 10, -3, 0], 0);
    swing(innerRing, '', [0, 30, -18, 7, 0], 60);
    swing(outerRing, '', [0, -16, 11, -4, 0], 120);
  }

  function reveal(section) {
    section.classList.add('is-revealed', 'is-revealing');
    setTimeout(() => section.classList.remove('is-revealing'), 2600);
    if (section.dataset.reveal === 'nav' && !reduceMotion) setTimeout(wiggleDial, 650);
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealSections.forEach((section) => section.classList.add('is-revealed'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        // Wait for the intro to finish so nothing reveals behind the loader
        if (!entry.isIntersecting || root.classList.contains('is-loading')) return;
        revealObserver.unobserve(entry.target);
        reveal(entry.target);
      });
    }, { threshold: 0.25 });
    revealSections.forEach((section) => revealObserver.observe(section));
    // Sections already in view when the loader leaves (e.g. a reload mid-page)
    new MutationObserver((_, obs) => {
      if (root.classList.contains('is-loading')) return;
      obs.disconnect();
      revealSections.forEach((section) => {
        if (section.classList.contains('is-revealed')) return;
        revealObserver.unobserve(section);
        revealObserver.observe(section);
      });
    }).observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  // --------------------------------- PAINT WINDOW ON SCROLL ---------------------------------
  const intro = hero.querySelector('.hero__intro');
  const unscale = hero.querySelector('[data-hero-unscale]');
  const track = hero.querySelector('[data-hero-track]');
  const stage = hero.querySelector('[data-hero-stage]');
  const paint = hero.querySelector('[data-paint]');
  const box = hero.querySelector('[data-paint-box]');
  const typedEl = hero.querySelector('[data-paint-typed]');
  const statusEl = hero.querySelector('[data-paint-status]');
  const cursor = hero.querySelector('[data-paint-cursor]');
  const bio = (hero.querySelector('[data-hero-bio]') || {}).textContent || '';
  const text = bio.replace(/\s+/g, ' ').trim();
  if (!track || !stage || !paint || !unscale || !text) return;

  // Paint geometry, as fractions of the artwork (1027 × 1532)
  const ASPECT = 1532 / 1027;
  const BOX = { x: 0.246, y: 0.366, w: 0.684, h: 0.072 / ASPECT };   // dragged box: ~2 lines tall
  const TOOL = { x: 0.149, y: 0.348 };
  const REST = { x: 0.64, y: 0.27 };

  // Scroll phases (0 → 1 across the pinned travel)
  const P = {
    cursorIn: 0.03, atTool: 0.14, click: 0.17, atBox: 0.23,
    dragEnd: 0.31, typing: 0.33, typed: 0.88,
  };

  const STATUS = {
    idle: 'For Help, click Help Topics on the Help Menu.',
    tool: 'Inserts text into the picture.',
    box: 'Click and drag to make a text box.',
    done: 'Text placed. Keep scrolling ↓',
  };

  const DEPART_SPEED = 0.9;   // the title block moves up this much faster than the page
  let departEnd = 700;        // document px of scroll over which the title leaves
  let lastTyped = -1;
  let lastStatus = '';
  let scrubTimer = 0;

  // The cursor / A tool / text box play by themselves once the window has opened, then
  // scrolling takes over and drives the typing from that point (phones and large screens).
  const AUTO = { revealWait: 2700, setupMs: 2600, typeMs: 4000 };
  const compact = { mode: 'waiting', start: 0, handoffY: 0, distance: 1 };   // waiting → playing → scroll | autotype

  typedEl.textContent = '';

  const pinned = () => !compactQuery.matches && !reduceMotion;

  const casing = document.getElementById('deviceCasing');

  function measure() {
    const s = uiScale();

    if (pinned() && casing) {
      // .hero__unscale cancels the casing's scale, so inside it layout px are screen px,
      // shifted by a constant: (where it's drawn) − (where layout thinks it is). The casing
      // scales from its top edge, so layout top = casing top + (drawn offset) / scale.
      root.style.setProperty('--hero-s', s.toFixed(4));
      root.style.setProperty('--hero-vh', `${window.innerHeight}px`);
      const casingTop = casing.getBoundingClientRect().top;
      const drawnTop = unscale.getBoundingClientRect().top;
      const shift = (drawnTop - casingTop) * (1 - 1 / s);
      stage.style.top = `${(-shift).toFixed(3)}px`;
    } else {
      root.style.setProperty('--hero-s', '1');
      stage.style.top = '';
    }

    // Title departure: done well before the paint window reaches the top of the screen
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    departEnd = Math.max(240, trackTop * 0.85);
    hero.style.setProperty('--depart-end', `${Math.round(departEnd)}px`);
    hero.style.setProperty('--depart-y', `${Math.round(-departEnd * DEPART_SPEED / s)}px`);
    hero.style.setProperty('--drain-step', `${((departEnd * 0.35) / Math.max(1, fillChars.length)).toFixed(2)}px`);
    hero.style.setProperty('--drain-len', `${Math.round(departEnd * 0.25)}px`);
  }

  function setStatus(msg) {
    if (msg === lastStatus) return;
    lastStatus = msg;
    statusEl.textContent = msg;
  }

  function pointAt(x, y, scale = 1) {
    // cqw units: 1 = 1% of the figure's width; y fractions convert through the aspect ratio
    cursor.style.setProperty('--cx', (x * 100).toFixed(3));
    cursor.style.setProperty('--cy', (y * ASPECT * 100).toFixed(3));
    cursor.style.setProperty('--cs', scale.toFixed(3));
  }

  function progress() {
    if (reduceMotion) return 1;
    return compactProgress();
  }

  function compactProgress() {
    const now = performance.now();
    if (compact.mode === 'waiting') {
      const rect = paint.getBoundingClientRect();
      // Wait until the part of the window where the cursor and text box work is in view
      // (at load on phones and tall screens; after a short nudge on shorter laptop screens)
      const onScreen = rect.top + rect.height * 0.45 < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.15;
      if (!heroInAt || now - heroInAt < AUTO.revealWait || !onScreen) return 0;
      compact.mode = 'playing';
      compact.start = now;
      requestAnimationFrame(autoplayLoop);
    }
    if (compact.mode === 'playing') {
      const t = clamp((now - compact.start) / AUTO.setupMs);
      if (t < 1) return t * P.typing;
      // Hand over to scrolling from wherever the page is now. Typing gets ~0.8 screens of
      // scroll, but ends before the text box would leave the top of the screen; if there is
      // barely any room left (reader already scrolled on), it just finishes by itself.
      const rect = paint.getBoundingClientRect();
      const vh = window.innerHeight;
      compact.handoffY = window.scrollY;
      if (pinned()) {
        // Large screens: type across the scroll that brings the window up and holds it pinned,
        // finishing a little before the pin lets go
        const unpinY = window.scrollY + track.getBoundingClientRect().bottom - vh;
        compact.distance = (unpinY - compact.handoffY) * 0.85;
      } else {
        compact.distance = Math.min(Math.max(rect.top - vh * 0.04, vh * 0.8), rect.top + rect.height * 0.25);
      }
      compact.mode = compact.distance > vh * 0.25 ? 'scroll' : 'autotype';
      compact.start = now;
    }
    if (compact.mode === 'autotype') {
      return lerp(P.typing, 1, clamp((now - compact.start) / AUTO.typeMs));
    }
    return lerp(P.typing, 1, clamp((window.scrollY - compact.handoffY) / compact.distance));
  }

  function autoplayLoop() {
    render();
    const autoTyping = compact.mode === 'autotype' && performance.now() - compact.start < AUTO.typeMs;
    if (compact.mode === 'playing' || autoTyping) requestAnimationFrame(autoplayLoop);
  }

  // Fallback only: title departure + letter drain from the scroll handler
  function departTitle() {
    if (scrollTimelines || reduceMotion || !intro) return;
    const y = window.scrollY;
    const t = clamp(y / departEnd);
    intro.style.transform = `translate3d(0, ${(-t * departEnd * DEPART_SPEED / uiScale()).toFixed(1)}px, 0)`;
    intro.style.opacity = (1 - range(t, 0.25, 0.85)).toFixed(3);
    const step = (departEnd * 0.35) / Math.max(1, fillChars.length);
    const len = departEnd * 0.25;
    fillChars.forEach((el, i) => {
      el.style.opacity = (1 - clamp((y - i * step) / len)).toFixed(3);
    });
  }

  function render() {
    departTitle();
    const p = progress();

    // Cursor path: rest → "A" tool → click → box corner → drag to the far corner
    const dragEnd = { x: BOX.x + BOX.w, y: BOX.y + BOX.h };
    if (p < P.atTool) {
      const t = easeInOut(range(p, P.cursorIn, P.atTool));
      pointAt(lerp(REST.x, TOOL.x, t), lerp(REST.y, TOOL.y, t));
    } else if (p < P.click) {
      const t = range(p, P.atTool, P.click);
      pointAt(TOOL.x, TOOL.y, 1 - Math.sin(t * Math.PI) * 0.18);
    } else if (p < P.atBox) {
      const t = easeInOut(range(p, P.click, P.atBox));
      pointAt(lerp(TOOL.x, BOX.x, t), lerp(TOOL.y, BOX.y, t));
    } else {
      const t = easeInOut(range(p, P.atBox, P.dragEnd));
      pointAt(lerp(BOX.x, dragEnd.x, t), lerp(BOX.y, dragEnd.y, t));
    }

    const drag = easeInOut(range(p, P.atBox, P.dragEnd));
    box.style.setProperty('--box-w', drag.toFixed(4));
    box.style.setProperty('--box-h', drag.toFixed(4));

    paint.classList.toggle('is-pointing', p >= P.cursorIn && p < P.typing);
    paint.classList.toggle('is-tool', p >= P.click - 0.015);
    paint.classList.toggle('is-drawing', p >= P.atBox);
    paint.classList.toggle('is-typing', p >= P.typing);

    // Typing: the box's height follows the text, so it grows a line at a time
    const typedCount = Math.round(range(p, P.typing, P.typed) * text.length);
    if (typedCount !== lastTyped) {
      lastTyped = typedCount;
      typedEl.textContent = text.slice(0, typedCount);
    }

    // Status bar
    if (p < P.atTool - 0.04) setStatus(STATUS.idle);
    else if (p < P.click) setStatus(STATUS.tool);
    else if (p < P.atBox) setStatus(STATUS.box);
    else if (p < P.typing) {
      const w = Math.round(drag * BOX.w * 1027);
      const h = Math.round(drag * BOX.h * 1532);
      setStatus(`${w}x${h}`);
    } else if (p < P.typed) setStatus(`Typing… ${typedCount} of ${text.length} characters`);
    else setStatus(STATUS.done);
  }

  let ticking = false;
  function requestRender() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; render(); });
  }

  function onScroll() {
    requestRender();
    // Hold the caret solid while the text is moving, blink once it rests
    paint.classList.add('is-scrubbing');
    clearTimeout(scrubTimer);
    scrubTimer = setTimeout(() => paint.classList.remove('is-scrubbing'), 450);
  }

  function onLayoutChange() {
    // After script.js has applied the new --ui-scale
    requestAnimationFrame(() => {
      measure();
      render();
    });
  }

  measure();
  render();
  // Check again once the intro reveal has had time to open the window
  const waitForReveal = () => {
    if (compact.mode !== 'waiting') return;
    if (heroInAt) setTimeout(() => render(), Math.max(0, AUTO.revealWait - (performance.now() - heroInAt)) + 20);
    else setTimeout(waitForReveal, 200);
  };
  if (!reduceMotion) waitForReveal();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onLayoutChange);
  window.addEventListener('load', onLayoutChange);
  if (document.fonts) document.fonts.ready.then(onLayoutChange);
  // Content above the track (fonts, images) can shift where the pin starts
  if (window.ResizeObserver && intro) new ResizeObserver(onLayoutChange).observe(intro);
});
