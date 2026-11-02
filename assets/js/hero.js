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

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const uiScale = () => parseFloat(root.style.getPropertyValue('--ui-scale')) || 1;

  // Stagger indices for the intro reveal
  hero.querySelectorAll('.hero__word > span').forEach((el, i) => el.style.setProperty('--i', i));
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
  const track = hero.querySelector('[data-hero-track]');
  const stage = hero.querySelector('[data-hero-stage]');
  const paint = hero.querySelector('[data-paint]');
  const box = hero.querySelector('[data-paint-box]');
  const textEl = hero.querySelector('.paint__text');
  const typedEl = hero.querySelector('[data-paint-typed]');
  const ghostEl = hero.querySelector('[data-paint-ghost]');
  const statusEl = hero.querySelector('[data-paint-status]');
  const cursor = hero.querySelector('[data-paint-cursor]');
  const readout = hero.querySelector('[data-hero-readout]');
  const logItems = hero.querySelectorAll('[data-hero-log] li');
  const bio = (hero.querySelector('[data-hero-bio]') || {}).textContent || '';
  const text = bio.replace(/\s+/g, ' ').trim();
  if (!track || !stage || !paint || !text) return;

  // Paint geometry, as fractions of the artwork (1027 × 1532)
  const ASPECT = 1532 / 1027;
  const BOX = { x: 0.246, y: 0.366, w: 0.684 };
  const TOOL = { x: 0.149, y: 0.348 };
  const REST = { x: 0.64, y: 0.27 };

  // Scroll phases (0 → 1 across the pinned travel)
  const P = {
    cursorIn: 0.03, atTool: 0.15, click: 0.18, atBox: 0.25,
    dragEnd: 0.36, typing: 0.38, typed: 0.86,
  };

  const STATUS = {
    idle: 'For Help, click Help Topics on the Help Menu.',
    tool: 'Inserts text into the picture.',
    box: 'Click and drag to make a text box.',
    done: 'Text placed. Keep scrolling ↓',
  };

  let boxFullH = 0.3;    // fraction of the figure's height, measured from the full text
  let lastTyped = -1;
  let lastStatus = '';
  let pinFix = 0;
  let scrubTimer = 0;

  typedEl.textContent = '';
  ghostEl.textContent = text;

  function measureBox() {
    const figH = paint.offsetHeight;
    if (!figH) return;
    boxFullH = textEl.offsetHeight / figH;
    paint.style.setProperty('--box-full-h', `${(boxFullH * 100).toFixed(3)}%`);
  }

  // One screen height in the casing's local (pre-scale) px
  function updateHeroVh() {
    root.style.setProperty('--hero-vh', `${Math.round(window.innerHeight / uiScale())}px`);
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
    const rect = track.getBoundingClientRect();
    const travel = rect.height - stage.getBoundingClientRect().height;
    return clamp(-rect.top / Math.max(1, travel));
  }

  // Sticky positions in the casing's local px, so inside the scaled casing the pin
  // creeps by (scale − 1) × scroll. Measure where it is and nudge it to where it should be.
  function fixPin() {
    if (compactQuery.matches || reduceMotion) {
      if (pinFix) { pinFix = 0; stage.style.setProperty('--hero-pin-fix', '0px'); }
      return;
    }
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

  function render() {
    fixPin();
    const p = progress();
    hero.style.setProperty('--hero-p', p.toFixed(4));
    if (readout) readout.textContent = (p * 150).toFixed(2).padStart(6, '0');

    const boxEnd = { x: BOX.x + BOX.w, y: BOX.y + boxFullH };

    // Cursor path: rest → "A" tool → click → box corner → drag to the far corner
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
      pointAt(lerp(BOX.x, boxEnd.x, t), lerp(BOX.y, boxEnd.y, t));
    }

    const drag = easeInOut(range(p, P.atBox, P.dragEnd));
    box.style.setProperty('--box-w', drag.toFixed(4));
    box.style.setProperty('--box-h', drag.toFixed(4));

    paint.classList.toggle('is-pointing', p >= P.cursorIn && p < P.typing);
    paint.classList.toggle('is-tool', p >= P.click - 0.015);
    paint.classList.toggle('is-drawing', p >= P.atBox);
    paint.classList.toggle('is-typing', p >= P.typing);

    // Typing
    const typedCount = Math.round(range(p, P.typing, P.typed) * text.length);
    if (typedCount !== lastTyped) {
      lastTyped = typedCount;
      typedEl.textContent = text.slice(0, typedCount);
      ghostEl.textContent = text.slice(typedCount);
    }

    // Status bar
    if (p < P.atTool - 0.04) setStatus(STATUS.idle);
    else if (p < P.click) setStatus(STATUS.tool);
    else if (p < P.atBox) setStatus(STATUS.box);
    else if (p < P.typing) {
      const w = Math.round(drag * BOX.w * 1027);
      const h = Math.round(drag * boxFullH * 1532);
      setStatus(`${w}x${h}`);
    } else if (p < P.typed) setStatus(`Typing… ${typedCount} of ${text.length} characters`);
    else setStatus(STATUS.done);

    // Step log
    const step = p < P.click ? 0 : p < P.typing ? 1 : p < P.typed ? 2 : 3;
    logItems.forEach((li, i) => {
      li.classList.toggle('is-active', i === step && p >= P.cursorIn);
      li.classList.toggle('is-done', i < step);
    });
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

  function onResize() {
    // After script.js has applied the new --ui-scale
    requestAnimationFrame(() => {
      updateHeroVh();
      measureBox();
      render();
    });
  }

  updateHeroVh();
  measureBox();
  render();

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('load', onResize);
  if (document.fonts) document.fonts.ready.then(onResize);
  if (window.ResizeObserver) new ResizeObserver(() => { measureBox(); requestRender(); }).observe(paint);
});
