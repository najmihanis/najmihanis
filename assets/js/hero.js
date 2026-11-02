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
  // Scroll-driven animations run on the compositor, so the pin and title drift can't jitter.
  // Without them (e.g. Firefox) the same motion is driven from the scroll handler instead.
  const scrollTimelines = window.CSS && CSS.supports('animation-timeline: scroll()');

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
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

  // --------------------------------- INTRO LOADER ---------------------------------
  const loader = document.getElementById('introLoader');

  function startHero() {
    root.classList.add('hero-in');
  }

  if (!loader || !root.classList.contains('is-loading')) {
    if (loader) loader.remove();
    startHero();
  } else {
    // Draw the caliper's beam graduations
    const ticks = loader.querySelector('.intro-caliper__ticks');
    if (ticks) {
      let d = '';
      for (let i = 0, x = 62; x <= 432; i++, x += 7.4) {
        d += `M${x.toFixed(1)} 34V${i % 5 === 0 ? 46 : 40}`;
      }
      ticks.setAttribute('d', d);
    }

    const jaw = document.getElementById('loaderJaw');
    const count = document.getElementById('loaderCount');
    const paintImg = hero.querySelector('.paint__img');
    let repeatVisit = false;
    try { repeatVisit = sessionStorage.getItem('nh-intro-seen') === '1'; } catch (e) { /* storage blocked */ }

    const minDuration = repeatVisit ? 700 : 1700;
    const maxDuration = 5000;
    const startedAt = performance.now();
    let readyAt = 0;

    const imgReady = paintImg && !paintImg.complete
      ? new Promise((res) => { paintImg.addEventListener('load', res, { once: true }); paintImg.addEventListener('error', res, { once: true }); })
      : Promise.resolve();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([imgReady, fontsReady]).then(() => { readyAt = performance.now(); });

    // Purely time-based, so sparse frames (background tabs) still finish on schedule.
    // Holds at 90% until the artwork and fonts are in, then closes the last 10%.
    function tick() {
      const now = performance.now();
      const elapsed = now - startedAt;
      if (!readyAt && elapsed > maxDuration) readyAt = now;
      const eased = 1 - Math.pow(1 - clamp(elapsed / minDuration), 3);
      let shown = readyAt ? eased : Math.min(eased, 0.9);
      if (readyAt && readyAt - startedAt > minDuration * 0.8) {
        shown = Math.min(1, 0.9 + 0.1 * clamp((now - readyAt) / 350));
      }

      if (jaw) jaw.style.transform = `translateX(${(shown * 300).toFixed(2)}px)`;
      if (count) count.textContent = String(Math.round(shown * 100)).padStart(3, '0');

      if (shown < 1) {
        requestAnimationFrame(tick);
        return;
      }
      try { sessionStorage.setItem('nh-intro-seen', '1'); } catch (e) { /* storage blocked */ }
      setTimeout(leave, 220);
    }

    function leave() {
      loader.classList.add('is-leaving');
      root.classList.remove('is-loading');
      setTimeout(startHero, 280);
      setTimeout(() => loader.remove(), 1200);
    }

    requestAnimationFrame(tick);
  }

  // --------------------------------- PAINT WINDOW ON SCROLL ---------------------------------
  const intro = hero.querySelector('.hero__intro');
  const track = hero.querySelector('[data-hero-track]');
  const stage = hero.querySelector('[data-hero-stage]');
  const paint = hero.querySelector('[data-paint]');
  const box = hero.querySelector('[data-paint-box]');
  const typedEl = hero.querySelector('[data-paint-typed]');
  const statusEl = hero.querySelector('[data-paint-status]');
  const cursor = hero.querySelector('[data-paint-cursor]');
  const bio = (hero.querySelector('[data-hero-bio]') || {}).textContent || '';
  const text = bio.replace(/\s+/g, ' ').trim();
  if (!track || !stage || !paint || !text) return;

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

  // Scroll range of the pin, in document px: [pinStart, pinEnd], set by measure()
  let pinStart = 0;
  let pinEnd = 1;
  let pinTravel = 0;     // local (pre-scale) px the stage moves over that range
  let driftEnd = 900;
  let lastTyped = -1;
  let lastStatus = '';
  let pinFix = 0;
  let scrubTimer = 0;

  typedEl.textContent = '';

  const pinned = () => !compactQuery.matches && !reduceMotion;

  function measure() {
    const s = uiScale();
    root.style.setProperty('--hero-vh', `${Math.round(window.innerHeight / s)}px`);

    // Title drift: runs until the paint window reaches the top of the screen
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    driftEnd = Math.max(300, trackTop);
    hero.style.setProperty('--drift-end', `${Math.round(driftEnd)}px`);
    hero.style.setProperty('--drift-y', `${Math.round(driftEnd * 0.45 / s)}px`);
    // Letters drain one after another across most of the drift
    hero.style.setProperty('--drain-start', `${Math.round(driftEnd * 0.08)}px`);
    hero.style.setProperty('--drain-step', `${((driftEnd * 0.7) / Math.max(1, fillChars.length)).toFixed(2)}px`);

    if (!pinned()) return;
    pinTravel = Math.max(0, track.offsetHeight - stage.offsetHeight);
    pinStart = trackTop;
    pinEnd = pinStart + pinTravel * s;
    stage.style.setProperty('--pin-start', `${Math.round(pinStart)}px`);
    stage.style.setProperty('--pin-end', `${Math.round(pinEnd)}px`);
    stage.style.setProperty('--pin-travel', `${Math.round(pinTravel)}px`);
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
    if (compactQuery.matches) {
      // Phones: no pin. Runs from the window entering low on screen to its top near the top.
      const rect = paint.getBoundingClientRect();
      const start = window.innerHeight * 0.8;
      const end = window.innerHeight * 0.04;
      return clamp((start - rect.top) / (start - end));
    }
    return clamp((window.scrollY - pinStart) / Math.max(1, pinEnd - pinStart));
  }

  // Fallback only (no scroll-driven animations): sticky creeps by (scale − 1) × scroll inside
  // the scaled casing, so measure where it is and nudge it to where it should be.
  function fixPin() {
    if (scrollTimelines || !pinned()) return;
    const s = uiScale();
    const trackRect = track.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const rawTop = stageRect.top - pinFix * s;
    const desired = Math.min(Math.max(trackRect.top, 0), trackRect.bottom - stageRect.height);
    const next = (desired - rawTop) / s;
    if (Math.abs(next - pinFix) > 0.1) {
      pinFix = next;
      stage.style.setProperty('--hero-pin-fix', `${pinFix.toFixed(2)}px`);
    }
  }

  // Fallback only: title drift + letter drain from the scroll handler
  function driftTitle() {
    if (scrollTimelines || reduceMotion || !intro) return;
    const s = uiScale();
    const t = clamp(window.scrollY / driftEnd);
    intro.style.transform = `translate3d(0, ${(t * driftEnd * 0.45 / s).toFixed(1)}px, 0)`;
    intro.style.opacity = (1 - t * 0.65).toFixed(3);
    const step = (driftEnd * 0.7) / Math.max(1, fillChars.length);
    fillChars.forEach((el, i) => {
      el.style.opacity = (1 - clamp((window.scrollY - driftEnd * 0.08 - i * step) / 140)).toFixed(3);
    });
  }

  function render() {
    fixPin();
    driftTitle();
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

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onLayoutChange);
  window.addEventListener('load', onLayoutChange);
  if (document.fonts) document.fonts.ready.then(onLayoutChange);
  // Content above the track (fonts, images) can shift where the pin starts
  if (window.ResizeObserver && intro) new ResizeObserver(onLayoutChange).observe(intro);
});
