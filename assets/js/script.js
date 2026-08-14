const shouldResetCpmScroll = window.location.pathname.endsWith('/pages/cpm.html') && !window.location.hash;

if (shouldResetCpmScroll && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

function resetCpmScrollPosition() {
  if (!shouldResetCpmScroll) return;
  window.requestAnimationFrame(() => {
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  });
}

window.addEventListener('pageshow', resetCpmScrollPosition);
window.addEventListener('load', resetCpmScrollPosition);

document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------------------------------ //
  // ------------------------------- GLOBAL SETTINGS ------------------------------------ //
  // ------------------------------------------------------------------------------------ //

  function renderCpmMathEquations(attempt = 0) {
    const cpmEquations = document.querySelectorAll('.cpm-page .c4-katex');
    if (!cpmEquations.length) return;
    if (typeof window.renderMathInElement !== 'function') {
      if (attempt < 8) window.setTimeout(() => renderCpmMathEquations(attempt + 1), 120);
      return;
    }

    cpmEquations.forEach((equation) => {
      window.renderMathInElement(equation, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false,
        strict: 'ignore'
      });
    });
  }

  renderCpmMathEquations();

  // --------------------------------- RESPONSIVE UI SCALING ---------------------------------
  const scaleStage = document.getElementById('scaleStage');
  const deviceCasing = document.getElementById('deviceCasing');

  function updateNavOverlayEdges() {
    const inner = document.querySelector('.inner-casing');
    if (!inner) return;

    const r = inner.getBoundingClientRect();
    const left = Math.round(r.left);
    const right = Math.round(window.innerWidth - r.right);

    document.documentElement.style.setProperty('--nav-left', `${left}px`);
    document.documentElement.style.setProperty('--nav-right', `${right}px`);
  }

  function updateUIScale() {
    if (!deviceCasing) return;
    // Reset compensating margin and scale BEFORE measuring, so we always
    // read the casing's true natural height/width (not a previously-shrunken
    // version of it).
    deviceCasing.style.marginBottom = '';
    document.documentElement.style.setProperty('--ui-scale', 1);

    const vw = window.innerWidth;
    const gutter = Math.max(6, Math.min(18, Math.round(vw * 0.02)));
    document.documentElement.style.setProperty('--page-gutter', `${gutter}px`);

    const casingW = deviceCasing.getBoundingClientRect().width;
    const naturalH = deviceCasing.offsetHeight;
    const availableW = vw - gutter * 2;
    let scale = availableW / casingW;
    // On the CPM page the casing's own width is capped at the "full-screen
    // 14" MacBook" breakpoint (see cpm.css), so past that point availableW
    // keeps growing while casingW doesn't — without this, scale would climb
    // above 1 and the transform would upscale the casing again, defeating
    // the cap. Other pages keep the 1.15 allowance for supersized desktops.
    const isCpmPage = !!document.querySelector('.cpm-page');
    scale = Math.max(0.25, Math.min(scale, isCpmPage ? 1 : 1.15));
    document.documentElement.style.setProperty('--ui-scale', scale);

    // Compensate for transform:scale being VISUAL-only. The casing's layout
    // box stays at full naturalH × 1000px, but the user only sees naturalH×scale
    // worth of pixels — without compensation the document reserves the unscaled
    // height, letting users scroll into empty space below the visibly-shrunken
    // casing on mobile (and stopping short of the visual on supersized desktops
    // where scale > 1).
    //
    // Setting margin-bottom = naturalH × (scale − 1) makes the casing's outer
    // (margin) box equal to naturalH × scale, exactly matching the visual.
    //   • scale < 1 (mobile) → negative margin, pulls layout end up
    //   • scale = 1          → 0, no-op (identical to pre-fix behavior)
    //   • scale > 1          → positive, pushes layout end down
    //
    // Margin does NOT affect offsetHeight or the ResizeObserver content-box,
    // so this can't create a feedback loop the way height-pinning the flex
    // parent did.
    const compensate = Math.round(naturalH * (scale - 1));
    deviceCasing.style.marginBottom = `${compensate}px`;

    updateNavOverlayEdges();
  }

  updateUIScale();
  window.addEventListener('resize', updateUIScale);
  window.addEventListener('load', updateUIScale);

  // Recompute when the casing's content size changes — image loads, font
  // swaps, dropdowns expanding, etc. Without this, naturalH read at first
  // call gets stale once images render, and the compensation drifts off.
  // Setting marginBottom does not change the content-box, so observing
  // .device-casing here does NOT loop back into our own writes.
  if (window.ResizeObserver && deviceCasing) {
    const ro = new ResizeObserver(() => updateUIScale());
    ro.observe(deviceCasing);
  }

  // --------------------------------- MOBILE NAV TOGGLE ---------------------------------
  const navToggle = document.querySelector('.nav-vent-toggle');
  const navPlate = document.getElementById('mobileNav');

  function setNavOpen(open) {
    document.body.classList.toggle('nav-open', open);
    if (navToggle) navToggle.setAttribute('aria-expanded', String(open));
    updateNavOverlayEdges();
  }

  if (navToggle && navPlate) {
    navToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setNavOpen(!document.body.classList.contains('nav-open'));
    });
  }

  // Close Button Logic
  const closeBtn = document.querySelector('.nav-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setNavOpen(false);
    });
  }

  // --------------------------------- NAV BAR BUTTONS MAPPING ---------------------------------
  // Path helper: HTML pages live in /pages/ except index.html at site root.
  // Detect context once so the same routes work whether script is loaded from
  // root index.html or from any /pages/*.html.
  const __IS_PAGES   = window.location.pathname.includes('/pages/');
  const __ROOT_PFX   = __IS_PAGES ? '../' : '';
  const __PAGES_PFX  = __IS_PAGES ? '' : 'pages/';

  const NAV_ROUTES = {
    home:           __ROOT_PFX  + "index.html",
    about:          __ROOT_PFX  + "index.html#hero",
    "art-design":   __PAGES_PFX + "art-lobby.html",
    "engineering":  __PAGES_PFX + "projects.html",
    "photography":  __PAGES_PFX + "photography.html",
    resume:         "https://drive.google.com/file/d/1799DD6PA_YIY6aRX1p74mSumP6byT8LN/view?usp=sharing",
    contact:        __ROOT_PFX  + "index.html#contact"
  };

  // DROPDOWN LOGIC
  const dropdownWrapper = document.querySelector('.nav-dropdown-wrapper');
  const dropdownTrigger = document.querySelector('.dropdown-trigger');

  if (dropdownWrapper && dropdownTrigger) {
    dropdownTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownWrapper.classList.toggle('active');
    });
    document.addEventListener('click', () => {
        dropdownWrapper.classList.remove('active');
    });
  }

  document.querySelectorAll("[data-nav]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const key = el.dataset.nav;
      const target = NAV_ROUTES[key];
      if (!target) return;

      if (target.startsWith("http")) {
        window.open(target, "_blank", "noopener,noreferrer");
        return;
      }
      if (target.includes("#")) {
        const [page, hash] = target.split("#");
        const onSamePage = !page || page === "" || location.pathname.endsWith("/" + page) || location.pathname.endsWith(page);
        if (onSamePage) {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
          return;
        }
      }
      window.location.href = target;
    });
  });

  // --------------------------------- DEMOLDER ITERATION SWITCHER ---------------------------------
  const iterationButtons = document.querySelectorAll('[data-iteration-target]');
  const iterationCards = document.querySelectorAll('[data-iteration-card]');

  if (iterationButtons.length && iterationCards.length) {
    let activeCard = document.querySelector('[data-iteration-card].is-active') || iterationCards[0];
    let swapTimer;

    function setActiveIteration(targetId) {
      const nextCard = document.getElementById(targetId);
      if (!nextCard || nextCard === activeCard) return;

      window.clearTimeout(swapTimer);
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      iterationButtons.forEach(button => {
        const isActive = button.dataset.iterationTarget === targetId;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });

      const outgoingCard = activeCard;
      outgoingCard.classList.add('is-exiting');

      swapTimer = window.setTimeout(() => {
        outgoingCard.hidden = true;
        outgoingCard.classList.remove('is-active', 'is-exiting');

        nextCard.hidden = false;
        nextCard.classList.add('is-active');
        activeCard = nextCard;
        updateUIScale();
        window.scrollTo(scrollX, scrollY);
        window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
      }, 180);
    }

    iterationCards.forEach((card, index) => {
      const isInitial = card === activeCard || (!activeCard && index === 0);
      card.hidden = !isInitial;
      card.classList.toggle('is-active', isInitial);
    });

    iterationButtons.forEach(button => {
      const isInitial = button.dataset.iterationTarget === activeCard.id;
      button.classList.toggle('is-active', isInitial);
      button.setAttribute('aria-pressed', String(isInitial));

      button.addEventListener('click', () => {
        setActiveIteration(button.dataset.iterationTarget);
      });
    });
  }

  // --------------------------------- COY SCROLL REVEAL ---------------------------------
  const coyPage = document.querySelector('.coy-page');

  if (coyPage) {
    const revealSections = coyPage.querySelectorAll('section:not(.coy-hero)');
    coyPage.classList.add('coy-reveal-ready');

    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, {
        root: null,
        rootMargin: '0px 0px -18% 0px',
        threshold: 0.16
      });

      revealSections.forEach(section => revealObserver.observe(section));
    } else {
      revealSections.forEach(section => section.classList.add('is-visible'));
    }
  }

  // --------------------------------- CPM PAGE MICRO INTERACTIONS ---------------------------------
  const cpmPage = document.querySelector('.cpm-page');

  if (cpmPage) {
    const canEmbedYoutube = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    cpmPage.querySelectorAll('[data-cpm-youtube]').forEach(video => {
      if (!canEmbedYoutube) return;
      const iframe = video.querySelector('iframe');
      if (!iframe) return;
      iframe.src = video.dataset.cpmYoutube;
      video.classList.add('is-embedded');
    });

    const cpmRevealItems = cpmPage.querySelectorAll('[data-cpm-reveal]');
    cpmPage.classList.add('cpm-reveal-ready');
    if ('IntersectionObserver' in window) {
      const cpmRevealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, {
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.12
      });

      cpmRevealItems.forEach(item => cpmRevealObserver.observe(item));
    } else {
      cpmRevealItems.forEach(item => item.classList.add('is-visible'));
    }

    const cpmNote = document.getElementById('cpmNote');
    document.querySelectorAll('[data-cpm-note]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-cpm-note]').forEach(peer => {
          peer.classList.toggle('is-active', peer === button);
        });
        if (cpmNote) cpmNote.innerHTML = button.dataset.cpmNote;
      });
    });

    const kinematicsModal = cpmPage.querySelector('[data-c4-kinematics-modal]');
    const kinematicsModalImage = kinematicsModal?.querySelector('.c4-kinematics-modal__image');
    const kinematicsModalClose = kinematicsModal?.querySelector('.c4-kinematics-modal__close');
    const kinematicsButtons = Array.from(cpmPage.querySelectorAll('[data-c4-kinematics-image]'));

    function closeKinematicsImage() {
      if (!kinematicsModal || !kinematicsModalImage) return;
      kinematicsModal.hidden = true;
      kinematicsModalImage.removeAttribute('src');
      kinematicsModalImage.alt = '';
      kinematicsButtons.forEach(button => button.classList.remove('is-active'));
    }

    function openKinematicsImage(button) {
      if (!kinematicsModal || !kinematicsModalImage) return;
      const imageSrc = button.dataset.c4KinematicsImage;
      if (!imageSrc) return;
      kinematicsModalImage.src = imageSrc;
      kinematicsModalImage.alt = button.dataset.c4KinematicsAlt || button.textContent.trim();
      kinematicsModal.hidden = false;
      kinematicsButtons.forEach(peer => peer.classList.toggle('is-active', peer === button));
      kinematicsModal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    window.openCpmKinematicsImage = openKinematicsImage;
    window.closeCpmKinematicsImage = closeKinematicsImage;

    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      const button = target?.closest('[data-c4-kinematics-image]');
      if (!button) return;
      if (button.classList.contains('is-active') && kinematicsModal && !kinematicsModal.hidden) {
        closeKinematicsImage();
        return;
      }
      openKinematicsImage(button);
    });

    if (kinematicsModalClose) {
      kinematicsModalClose.addEventListener('click', closeKinematicsImage);
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && kinematicsModal && !kinematicsModal.hidden) {
        closeKinematicsImage();
      }
    });

    const cpmScrollFilm = document.querySelector('[data-cpm-scroll-film]');
    const cpmScrollFilmVideo = document.getElementById('cpmScrollFilmVideo');

    if (cpmScrollFilm) {
      let filmTicking = false;
      const FILM_LOOPS = 3; // video cycles across the full scroll travel

      function updateCpmScrollFilm() {
        filmTicking = false;
        const rect = cpmScrollFilm.getBoundingClientRect();
        const scrollable = Math.max(1, rect.height - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
        const driftProgress = Math.min(1, Math.max(0, (progress - 0.06) / 0.5));
        const copyProgress = Math.min(1, Math.max(0, (progress - 0.38) / 0.34));
        const maxShift = Math.min(window.innerWidth * 0.28, 390);

        // Scrub video: wraps every 1/FILM_LOOPS of scroll travel
        if (cpmScrollFilmVideo && cpmScrollFilmVideo.readyState >= 2 && cpmScrollFilmVideo.duration) {
          cpmScrollFilmVideo.currentTime =
            (progress * cpmScrollFilmVideo.duration * FILM_LOOPS) % cpmScrollFilmVideo.duration;
        }

        cpmScrollFilm.style.setProperty('--film-x', `${driftProgress * maxShift}px`);
        cpmScrollFilm.style.setProperty('--film-scale', `${1 - driftProgress * 0.08}`);
        cpmScrollFilm.style.setProperty('--film-copy-opacity', `${copyProgress}`);
        cpmScrollFilm.style.setProperty('--film-copy-y', `${(1 - copyProgress) * 34}px`);
      }

      function requestCpmScrollFilmUpdate() {
        if (filmTicking) return;
        filmTicking = true;
        window.requestAnimationFrame(updateCpmScrollFilm);
      }

      if (cpmScrollFilmVideo) {
        cpmScrollFilmVideo.addEventListener('loadedmetadata', updateCpmScrollFilm);
      }
      window.addEventListener('scroll', requestCpmScrollFilmUpdate, { passive: true });
      window.addEventListener('resize', requestCpmScrollFilmUpdate);
      updateCpmScrollFilm();
    }

    // ── Scroll-driven assembly explode ──────────────────────────────────────
    const cpmExplode = cpmPage.querySelector('[data-cpm-explode]');
    const cpmExplodeVideo = document.getElementById('cpmExplodeVideo');

    if (cpmExplode && cpmExplodeVideo) {
      let explodeTicking = false;

      function updateCpmExplode() {
        explodeTicking = false;
        const rect = cpmExplode.getBoundingClientRect();
        const scrollable = Math.max(1, rect.height - window.innerHeight);
        const progress = Math.min(1, Math.max(0, -rect.top / scrollable));

        // "Final Design" label: reveal over first 15 % of scroll travel
        const labelP = Math.min(1, progress / 0.15);
        cpmExplode.style.setProperty('--explode-label-opacity', labelP);
        cpmExplode.style.setProperty('--explode-label-y', `${(1 - labelP) * -22}px`);

        // Scroll hint: disappear over first 8 %
        cpmExplode.style.setProperty('--explode-hint-opacity', Math.max(0, 1 - progress / 0.08));

        // Progressive zoom: 1.0 (exploded) → 1.38 (assembled)
        cpmExplode.style.setProperty('--explode-zoom', 1 + progress * 0.38);

        // Scrub video proportional to scroll
        if (cpmExplodeVideo.readyState >= 2 && cpmExplodeVideo.duration) {
          cpmExplodeVideo.currentTime = (1 - progress) * cpmExplodeVideo.duration;
        }
      }

      function requestExplodeUpdate() {
        if (explodeTicking) return;
        explodeTicking = true;
        window.requestAnimationFrame(updateCpmExplode);
      }

      cpmExplodeVideo.addEventListener('loadedmetadata', updateCpmExplode);
      window.addEventListener('scroll', requestExplodeUpdate, { passive: true });
      window.addEventListener('resize', requestExplodeUpdate);
      updateCpmExplode();
    }

    const archiveTrack = cpmPage.querySelector('[data-cpm-archive-track]');
    const archiveWheel = cpmPage.querySelector('[data-cpm-archive-wheel]');
    const archiveCaption = cpmPage.querySelector('[data-cpm-archive-caption]');
    const archiveDate = cpmPage.querySelector('[data-cpm-archive-date]');

    if (archiveTrack && archiveWheel) {
      const archiveCards = Array.from(archiveTrack.querySelectorAll('.cpm-archive-card'));
      const archiveTicks = Array.from(archiveWheel.querySelectorAll('span'));
      let archiveTicking = false;
      let activeArchiveIndex = -1;
      let archiveCopyTimer;

      function updateCpmArchiveCarousel() {
        archiveTicking = false;
        const trackRect = archiveTrack.getBoundingClientRect();
        const centerX = trackRect.left + trackRect.width / 2;
        const focusRange = Math.max(trackRect.width * 0.48, 1);
        let nextActiveIndex = 0;
        let nearestDistance = Infinity;
        let weightedIndex = 0;
        let totalFocus = 0;

        archiveCards.forEach((card, index) => {
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const distance = Math.abs(centerX - cardCenter);
          const focus = Math.max(0, 1 - distance / focusRange);
          card.style.setProperty('--focus', focus.toFixed(3));

          if (archiveTicks[index]) {
            archiveTicks[index].style.setProperty('--tick-focus', focus.toFixed(3));
          }

          weightedIndex += index * focus;
          totalFocus += focus;

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nextActiveIndex = index;
          }
        });

        if (archiveTicks.length > 1 && totalFocus > 0) {
          const tickPitch = 9;
          const centeredIndex = weightedIndex / totalFocus;
          const targetOffset = centeredIndex - (archiveTicks.length - 1) / 2;
          archiveWheel.style.setProperty('--tick-shift', `${targetOffset * -tickPitch}px`);
        }

        if (nextActiveIndex !== activeArchiveIndex) {
          activeArchiveIndex = nextActiveIndex;
          const activeCard = archiveCards[activeArchiveIndex];
          window.clearTimeout(archiveCopyTimer);

          if (archiveCaption && activeCard?.dataset.caption) {
            archiveCaption.classList.add('is-changing');
          }

          if (archiveDate && activeCard?.dataset.date) {
            archiveDate.classList.add('is-changing');
          }

          archiveCopyTimer = window.setTimeout(() => {
            if (archiveCaption && activeCard?.dataset.caption) {
              archiveCaption.textContent = activeCard.dataset.caption;
              archiveCaption.classList.remove('is-changing');
            }
            if (archiveDate && activeCard?.dataset.date) {
              archiveDate.innerHTML = activeCard.dataset.date;
              archiveDate.classList.remove('is-changing');
            }
          }, 90);
        }
      }

      function requestCpmArchiveUpdate() {
        if (archiveTicking) return;
        archiveTicking = true;
        window.requestAnimationFrame(updateCpmArchiveCarousel);
      }

      archiveTrack.addEventListener('wheel', event => {
        const horizontalIntent = Math.abs(event.deltaX) > Math.abs(event.deltaY);
        const scrollDelta = horizontalIntent ? event.deltaX : event.deltaY;
        if (!scrollDelta) return;

        const maxScroll = archiveTrack.scrollWidth - archiveTrack.clientWidth;
        const atStart = archiveTrack.scrollLeft <= 0;
        const atEnd = archiveTrack.scrollLeft >= maxScroll - 1;
        const movingBeforeStart = scrollDelta < 0 && atStart;
        const movingPastEnd = scrollDelta > 0 && atEnd;

        if (!horizontalIntent && (movingBeforeStart || movingPastEnd)) return;

        event.preventDefault();
        archiveTrack.scrollLeft += scrollDelta;
        requestCpmArchiveUpdate();
      }, { passive: false });

      archiveTrack.addEventListener('scroll', requestCpmArchiveUpdate, { passive: true });
      window.addEventListener('resize', requestCpmArchiveUpdate);
      updateCpmArchiveCarousel();
    }

    const prototypeEvolution = cpmPage.querySelector('.cpm-prototype-evolution');

    if (prototypeEvolution) {
      const evolutionCards = Array.from(prototypeEvolution.querySelectorAll('.cpm-evo-card'));
      const evolutionDecks = prototypeEvolution.querySelector('.cpm-evo-decks');
      let evolutionTicking = false;

      function readCardNumber(card, name) {
        return Number.parseFloat(card.style.getPropertyValue(name)) || 0;
      }

      function mix(start, end, progress) {
        return start + (end - start) * progress;
      }

      function easeOutCubic(progress) {
        return 1 - Math.pow(1 - progress, 3);
      }

      function setEvolutionCardTransform(card, x, y, rotation, scale = 1) {
        card.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
      }

      function updatePrototypeEvolution() {
        evolutionTicking = false;
        const triggerRect = (evolutionDecks || prototypeEvolution).getBoundingClientRect();
        const startLine = window.innerHeight * 0.82;
        const travel = window.innerHeight * 0.58;
        const rawProgress = (startLine - triggerRect.top) / travel;
        const progress = easeOutCubic(Math.min(1, Math.max(0, rawProgress)));

        prototypeEvolution.classList.toggle('is-clustered', progress > 0.96);

        evolutionCards.forEach(card => {
          if (card.closest('.cpm-evo-deck')?.classList.contains('is-expanded')) return;

          const scatterX = readCardNumber(card, '--scatter-x');
          const scatterY = readCardNumber(card, '--scatter-y');
          const scatterR = readCardNumber(card, '--scatter-r');
          const deckX = readCardNumber(card, '--deck-x');
          const deckY = readCardNumber(card, '--deck-y');
          const deckR = readCardNumber(card, '--deck-r');
          const x = mix(scatterX, deckX, progress);
          const y = mix(scatterY, deckY, progress);
          const rotation = mix(scatterR, deckR, progress);
          const scale = mix(0.72, 1, progress);

          setEvolutionCardTransform(card, x, y, rotation, scale);
        });
      }

      function requestPrototypeEvolutionUpdate() {
        if (evolutionTicking) return;
        evolutionTicking = true;
        window.requestAnimationFrame(updatePrototypeEvolution);
      }

      window.addEventListener('scroll', requestPrototypeEvolutionUpdate, { passive: true });
      window.addEventListener('resize', requestPrototypeEvolutionUpdate);
      prototypeEvolution.querySelectorAll('.cpm-evo-deck').forEach(deck => {
        deck.addEventListener('click', e => {
          if (!deck.classList.contains('is-expanded')) return;
          if (e.target.closest('.cpm-evo-card:has(img)')) return;
          if (e.target.closest('a, button, iframe, .cpm-evo-video')) return;
          const stage = deck.querySelector('.cpm-evo-deck__stage');
          deck.classList.remove('is-expanded');
          stage?.setAttribute('aria-expanded', 'false');
          updateUIScale();
          requestPrototypeEvolutionUpdate();
        });
      });

      prototypeEvolution.querySelectorAll('.cpm-evo-deck__stage').forEach(stage => {
        const deck = stage.closest('.cpm-evo-deck');

        stage.addEventListener('click', e => {
          if (!deck) return;
          if (deck.classList.contains('is-expanded') && e.target.closest('.cpm-evo-card:has(img)')) return;
          deck.classList.toggle('is-expanded');
          stage.setAttribute('aria-expanded', String(deck.classList.contains('is-expanded')));
          updateUIScale();
          requestPrototypeEvolutionUpdate();
        });

        stage.addEventListener('keydown', event => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          stage.click();
        });

        stage.addEventListener('mouseenter', () => {
          if (!prototypeEvolution.classList.contains('is-clustered')) return;
          if (deck?.classList.contains('is-expanded')) return;
          stage.querySelectorAll('.cpm-evo-card').forEach(card => {
            setEvolutionCardTransform(
              card,
              readCardNumber(card, '--messy-x'),
              readCardNumber(card, '--messy-y'),
              readCardNumber(card, '--messy-r')
            );
          });
        });
        stage.addEventListener('mouseleave', requestPrototypeEvolutionUpdate);
      });
      updatePrototypeEvolution();

      // ---- LIGHTBOX ----
      const lightbox = document.createElement('div');
      lightbox.className = 'cpm-lightbox';
      lightbox.innerHTML = `
        <div class="cpm-lightbox__backdrop"></div>
        <button class="cpm-lightbox__close" aria-label="Close image">✕</button>
        <img class="cpm-lightbox__img" src="" alt="">
      `;
      document.body.appendChild(lightbox);
      const lbImg = lightbox.querySelector('.cpm-lightbox__img');
      const lbClose = lightbox.querySelector('.cpm-lightbox__close');
      const lbBackdrop = lightbox.querySelector('.cpm-lightbox__backdrop');

      function openLightbox(src, alt) {
        lbImg.src = src;
        lbImg.alt = alt || '';
        lightbox.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
      function closeLightbox() {
        lightbox.classList.remove('is-open');
        document.body.style.overflow = '';
      }

      lbClose.addEventListener('click', closeLightbox);
      lbBackdrop.addEventListener('click', closeLightbox);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

      prototypeEvolution.querySelectorAll('.cpm-evo-card:has(img)').forEach(card => {
        card.addEventListener('click', e => {
          const deck = card.closest('.cpm-evo-deck');
          if (!deck?.classList.contains('is-expanded')) return;
          e.stopPropagation();
          const img = card.querySelector('img');
          openLightbox(img.src, img.alt);
        });
      });

      document.querySelectorAll('[data-cpm-lightbox-image]').forEach(trigger => {
        trigger.addEventListener('click', e => {
          e.stopPropagation();
          const src = trigger.dataset.cpmLightboxImage;
          if (!src) return;
          openLightbox(src, trigger.dataset.cpmLightboxAlt || trigger.querySelector('img')?.alt || '');
        });
      });
    }

    // --------------------------------- FINAL DELIVERABLES: hover tab folder stack ---------------------------------
    (function () {
      const folderSection = cpmPage.querySelector('[data-cpm-folders]');
      if (!folderSection) return;

      const drawer = folderSection.querySelector('.cpm-folders__drawer');
      if (!drawer) return;

      const folders = Array.from(drawer.querySelectorAll('[data-cpm-folder]'));
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const stage = folderSection.querySelector('.cpm-folders__stage');

      function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
      }

      function render(activeIndex) {
        const stagePaddingTop = stage ? parseFloat(getComputedStyle(stage).paddingTop) || 0 : 0;

        folders.forEach((folder, i) => {
          const distance = Math.abs(activeIndex - i);
          const isActive = i === activeIndex;
          const isBehind = i < activeIndex;
          const side = parseFloat(folder.style.getPropertyValue('--side')) || 1;
          const lift = isActive ? 1 : 0;
          const spread = clamp(distance, 0, 5);
          const topPx = parseFloat(folder.style.getPropertyValue('--top')) || 0;
          const desiredLift = -70 - spread * 6;
          const minLift = -(stagePaddingTop + topPx) + 8;
          const hoverOffset = i <= activeIndex ? Math.max(desiredLift, minLift) : 108 + spread * 14;
          const restOffset = i < folders.length - 1 ? 54 : 78;
          const peek = prefersReduced ? restOffset : (activeIndex === folders.length - 1 ? restOffset : hoverOffset);
          const shift = side * (isBehind ? 5 : 13);
          const depth = i * 2;
          const bodyOpacity = isActive ? 1 : 0.08;
          const tabOpacity = isActive ? 1 : (isBehind ? 0.56 : 0.82);

          folder.classList.toggle('is-folder-active', isActive);
          folder.style.setProperty('--x', `${shift.toFixed(2)}px`);
          folder.style.setProperty('--peek-y', `${peek.toFixed(2)}px`);
          folder.style.setProperty('--z-depth', `${depth.toFixed(2)}px`);
          folder.style.setProperty('--scale', '1');
          folder.style.setProperty('--body-y', `${((1 - lift) * 18).toFixed(2)}px`);
          folder.style.setProperty('--body-opacity', bodyOpacity.toFixed(3));
          folder.style.setProperty('--tab-opacity', tabOpacity.toFixed(3));
          folder.style.setProperty('--report-paper-opacity', isActive ? '1' : '0');
          folder.style.setProperty('--report-paper-y', isActive ? '-4px' : '42px');
          folder.style.setProperty('--saturate', (0.86 + lift * 0.2).toFixed(3));
          folder.style.setProperty('--bright', (0.82 + lift * 0.18).toFixed(3));
          folder.style.setProperty('--shadow-y', `${(12 + lift * 10).toFixed(2)}px`);
          folder.style.setProperty('--shadow-blur', `${(18 + lift * 24).toFixed(2)}px`);
          folder.style.zIndex = String(120 + i);
        });
      }

      const restingIndex = folders.length - 1;

      folders.forEach((folder, i) => {
        folder.tabIndex = 0;
        folder.addEventListener('mouseenter', () => render(i));
        folder.addEventListener('focus', () => render(i));
      });

      drawer.addEventListener('mousemove', event => {
        const hoveredTab = folders.findIndex(folder => {
          const tab = folder.querySelector('.cpm-folder__tab-title');
          if (!tab) return false;
          const rect = tab.getBoundingClientRect();
          return event.clientX >= rect.left - 14 &&
            event.clientX <= rect.right + 14 &&
            event.clientY >= rect.top - 16 &&
            event.clientY <= rect.bottom + 16;
        });

        if (hoveredTab >= 0) render(hoveredTab);
      });

      document.addEventListener('mousemove', event => {
        const rect = (stage || drawer).getBoundingClientRect();
        const outside = event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom;

        if (outside) render(restingIndex);
      });

      drawer.addEventListener('mouseleave', () => render(restingIndex));
      render(restingIndex);

      folderSection.querySelectorAll('.cpm-presentation-note[href="#"]').forEach(note => {
        note.addEventListener('click', event => event.preventDefault());
      });

      folderSection.querySelectorAll('.cpm-folder-report[href="#"]').forEach(stack => {
        stack.addEventListener('click', event => event.preventDefault());
      });

      const videoCards = Array.from(folderSection.querySelectorAll('[data-cpm-folder-video]'));

      if (videoCards.length) {
        const videoLightbox = document.createElement('div');
        videoLightbox.className = 'cpm-video-lightbox';
        videoLightbox.innerHTML = `
          <div class="cpm-video-lightbox__backdrop"></div>
          <div class="cpm-video-lightbox__panel" role="dialog" aria-modal="true" aria-label="Project media video">
            <button class="cpm-video-lightbox__close" type="button" aria-label="Close video">×</button>
            <div class="cpm-video-lightbox__frame">
              <iframe title="Project media video" src="" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
            </div>
            <div class="cpm-video-lightbox__bar">
              <p class="cpm-video-lightbox__title"></p>
              <a class="cpm-video-lightbox__youtube" href="#" target="_blank" rel="noopener noreferrer">Open in YouTube</a>
            </div>
          </div>
        `;
        document.body.appendChild(videoLightbox);

        const videoIframe = videoLightbox.querySelector('iframe');
        const videoTitle = videoLightbox.querySelector('.cpm-video-lightbox__title');
        const videoYoutubeLink = videoLightbox.querySelector('.cpm-video-lightbox__youtube');
        const videoClose = videoLightbox.querySelector('.cpm-video-lightbox__close');
        const videoBackdrop = videoLightbox.querySelector('.cpm-video-lightbox__backdrop');

        function buildYoutubeEmbedUrl(embedUrl) {
          const url = new URL(embedUrl, window.location.href);
          url.searchParams.set('rel', '0');
          url.searchParams.set('playsinline', '1');

          if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            url.searchParams.set('origin', window.location.origin);
            url.searchParams.set('widget_referrer', window.location.href);
          }

          return url.toString();
        }

        function openFolderVideo(card) {
          const embedUrl = card.dataset.videoEmbed;
          const watchUrl = card.dataset.videoWatch;
          if (!embedUrl || !videoIframe || !videoYoutubeLink || !videoTitle) return;
          videoIframe.src = buildYoutubeEmbedUrl(embedUrl);
          videoTitle.textContent = card.dataset.videoTitle || 'Project media video';
          videoYoutubeLink.href = watchUrl || embedUrl;
          videoLightbox.classList.add('is-open');
          document.body.style.overflow = 'hidden';
          videoClose?.focus({ preventScroll: true });
        }

        function closeFolderVideo() {
          videoLightbox.classList.remove('is-open');
          if (videoIframe) videoIframe.src = '';
          document.body.style.overflow = '';
        }

        videoCards.forEach(card => {
          card.addEventListener('click', event => {
            event.stopPropagation();
            openFolderVideo(card);
          });
        });

        videoClose?.addEventListener('click', closeFolderVideo);
        videoBackdrop?.addEventListener('click', closeFolderVideo);
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape' && videoLightbox.classList.contains('is-open')) {
            closeFolderVideo();
          }
        });
      }
    }());

    // --------------------------------- COMPONENT 4: SIDEBAR NAV — INDUSTRIAL ---------------------------------
    (function () {
      const navBtns = Array.from(cpmPage.querySelectorAll('[data-c4]'));
      const panels  = Array.from(cpmPage.querySelectorAll('[data-c4-panel]'));
      const flash   = document.getElementById('c4-flash');
      const tocRail = document.getElementById('c4-toc');
      if (!navBtns.length || !panels.length || !flash || !tocRail) return;

      let current = 0, busy = false, tocScrollOff = null;

      function show(el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }
      function hide(el) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; el.scrollTop = 0; }

      function buildToc(idx) {
        const panel = panels[idx];
        const explicitNodes = panel.querySelectorAll('[data-c4-toc]');
        const nodes = Array.from(explicitNodes.length ? explicitNodes : panel.querySelectorAll('h2, p.c4-sh'));
        if (tocScrollOff) { tocScrollOff(); tocScrollOff = null; }
        tocRail.innerHTML = '';
        if (!nodes.length) return;
        nodes.forEach((n, i) => { if (!n.id) n.id = 'c4a-' + idx + '-' + i; });
        const items = nodes.map((node, i) => {
          const item = document.createElement('div');
          item.className = 'c4-toc-item' + (i === 0 ? ' active' : '');
          item.textContent = node.textContent;
          tocRail.appendChild(item);
          item.addEventListener('click', () => {
            panel.scrollTo({ top: Math.max(0, node.offsetTop - 20), behavior: 'smooth' });
          });
          return item;
        });
        function onScroll() {
          const st = panel.scrollTop;
          let active = 0;
          nodes.forEach((n, i) => { if (n.offsetTop <= st + 60) active = i; });
          items.forEach((it, i) => it.classList.toggle('active', i === active));
          nodes.forEach((n, i) => n.classList.toggle('is-active', i === active));
        }
        nodes[0].classList.add('is-active');
        panel.addEventListener('scroll', onScroll);
        tocScrollOff = () => panel.removeEventListener('scroll', onScroll);
      }

      function goTo(idx) {
        if (idx === current || busy) return;
        busy = true;
        flash.classList.add('on');
        setTimeout(() => {
          hide(panels[current]);
          show(panels[idx]);
          navBtns[current].classList.remove('active');
          navBtns[idx].classList.add('active');
          current = idx;
          flash.classList.remove('on');
          buildToc(idx);
          setTimeout(() => { busy = false; }, 80);
        }, 80);
      }

      navBtns.forEach(btn => btn.addEventListener('click', () => goTo(+btn.dataset.c4)));
      navBtns.forEach((btn, i) => {
        btn.addEventListener('keydown', e => {
          if (e.key === 'ArrowDown' && i < navBtns.length - 1) { e.preventDefault(); navBtns[i+1].focus(); goTo(i+1); }
          else if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); navBtns[i-1].focus(); goTo(i-1); }
        });
      });

      show(panels[0]);
      panels.slice(1).forEach(hide);
      buildToc(0);
    })();
  }

  // ------------------------------------------------------------------------------------ //
  // ------------------------------- INDEX.HTML PAGE ------------------------------------ //
  // ------------------------------------------------------------------------------------ //

  // Wrapped in a check to prevent errors on other pages
  if (document.querySelector('.nav-dial')) {
      const outerRing = document.getElementById('nav-outer-ring');
      const innerRing = document.getElementById('nav-inner-ring');
      const knob = document.getElementById('nav-knob');
      const windows = document.querySelectorAll('.nav-window');
      const navDial = document.querySelector('.nav-dial');
      let isLocked = false;

      document.addEventListener('mousemove', (e) => {
        const needle = document.querySelector('.needle');
        if(needle) {
          const screenWidth = window.innerWidth;
          const rotation = -130 + ((e.clientX / screenWidth) * 175);
          needle.style.transform = `rotate(${rotation}deg)`;
        }

        if (isLocked || !navDial) return;

        const rect = navDial.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        let angleDeg = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;

        if (angleDeg > 180) angleDeg -= 360;
        const clampedAngle = Math.max(-45, Math.min(45, angleDeg));

        if (outerRing) outerRing.style.transform = `rotate(${clampedAngle}deg)`;
      });

      windows.forEach(windowEl => {
        windowEl.addEventListener('click', () => {
          const targetAngle = windowEl.getAttribute('data-angle');
          const targetPage  = windowEl.dataset.target;

          if (targetAngle) {
            isLocked = true;
            if (outerRing) outerRing.style.transform = `rotate(${targetAngle}deg)`;
            if (innerRing) innerRing.style.transform = `rotate(${targetAngle}deg)`;
            if (knob) knob.style.transform = `translate(-50%, -50%) rotate(${targetAngle}deg)`;
          }

          if (targetPage === 'engineering') setTimeout(() => { window.location.href = __PAGES_PFX + 'projects.html'; }, 450);
          if (targetPage === 'art')         setTimeout(() => { window.location.href = __PAGES_PFX + 'art-lobby.html'; }, 450);
          if (targetPage === 'photo')       setTimeout(() => { window.location.href = __PAGES_PFX + 'photography.html'; }, 450);
        });
      });
  }

  // --------------------------------- CONTACT ME DATA STORAGE ---------------------------------
  const sendBtn = document.getElementById("sendTx");
  if (sendBtn) {
    sendBtn.addEventListener("click", () => {
      const name = document.getElementById("sender_id")?.value.trim() || "";
      const email = document.getElementById("comm_channel")?.value.trim() || "";
      const msg = document.getElementById("message_data")?.value.trim() || "";

      if (!name || !email || !msg) {
        alert("Fill in all fields before sending.");
        return;
      }
      const FORM_ID = "1FAIpQLSdlSe516OWIK0t9A-3PBpN6TU8YJh3QRGHamS5HXvuEJkUVLw";
      const endpoint = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;
      const data = new URLSearchParams();
      data.append("entry.1406986934", name);
      data.append("entry.654459799", email);
      data.append("entry.846955755", msg);

      fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: data.toString()
      });
      alert("Transmission sent.");
      document.getElementById("sender_id").value = "";
      document.getElementById("comm_channel").value = "";
      document.getElementById("message_data").value = "";
    });
  }

  // ------------------------------------------------------------------------------------ //
  // ------------------------------- PROJECT PAGE --------------------------------------- //
  // ------------------------------------------------------------------------------------ //
  if (document.getElementById('c1WavePath')) {
      const waveMain  = document.getElementById('c1WavePath');
      const waveTrail = document.getElementById('c1WaveTrail');
      const waveHead  = document.getElementById('c1WaveHead');

      if (waveMain && waveTrail && waveHead) {
        const W = 100;
        const baseY = 55;
        const amp = 9;
        const cycles = 2.2;
        const speed = 0.065;
        const samples = 34;
        const headLen = 6;
        let t = 0;
        const k = (2 * Math.PI * cycles) / W;

        function noise(x, time) {
          return 0.8 * Math.sin(0.9 * x + 2.1 * time) + 0.45 * Math.sin(1.7 * x - 1.4 * time);
        }
        function yAt(x, time) {
          const sine = Math.sin(k * x - time) * amp;
          const n = noise(x, time) * 0.35;
          return baseY + sine + n;
        }
        function points(time) {
          const pts = [];
          for (let i = 0; i <= samples; i++) {
            const x = (W * i) / samples;
            pts.push([x, yAt(x, time)]);
          }
          return pts;
        }
        function pathFromPts(pts) {
          let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
          const tension = 0.5;
          for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(0, i - 1)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(pts.length - 1, i + 2)];
            const c1x = p1[0] + (p2[0] - p0[0]) * (tension / 6);
            const c1y = p1[1] + (p2[1] - p0[1]) * (tension / 6);
            const c2x = p2[0] - (p3[0] - p1[0]) * (tension / 6);
            const c2y = p2[1] - (p3[1] - p1[1]) * (tension / 6);
            d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
          }
          return d;
        }
        function animate() {
          t += speed;
          const ptsNow = points(t);
          const ptsTrail = points(t - 0.35);
          waveMain.setAttribute('d', pathFromPts(ptsNow));
          waveTrail.setAttribute('d', pathFromPts(ptsTrail));
          const headCenter = Math.floor(((t * 8) % 1) * (samples - 1));
          const a = Math.max(0, headCenter - Math.floor(headLen / 2));
          const b = Math.min(samples, a + headLen);
          const headPts = ptsNow.slice(a, b + 1);
          waveHead.setAttribute('d', headPts.length > 1 ? pathFromPts(headPts) : '');
          requestAnimationFrame(animate);
        }
        requestAnimationFrame(animate);
      }

      // Needle Jitter
      document.querySelectorAll('.bento-tile[data-tile-id="c5"] .c5-needle').forEach(needle => {
        const base = parseFloat(getComputedStyle(needle).getPropertyValue('--ang').replace('deg',''));
        setInterval(() => {
          const jitter = (Math.random() - 0.5) * 4;
          needle.style.transform = `rotate(${base + jitter}deg)`;
        }, 120);
      });
  }

  // ------------------------------------------------------------------------------------ //
  // ------------------------------- ART LOBBY PAGE ------------------------------------- //
  // ------------------------------------------------------------------------------------ //

  if (document.querySelector('.locked-book-wrapper')) {
      const bookElements = document.querySelectorAll('.locked-book-wrapper');

      const bookConfig = [
        { height: 320, width: 45, angle: 0 },
        { height: 340, width: 40, angle: 0, customGap: 10 },
        { height: 300, width: 50, angle: 8, customGap: 5 },
        { height: 310, width: 38, angle: 5, customGap: 54 },
        { height: 350, width: 42, angle: -4 },
        { height: 290, width: 35, angle: 0 }
      ];

      bookElements.forEach((book, index) => {
        const config = bookConfig[index] || { height: 300, width: 40, angle: 0 };
        const nextConfig = bookConfig[index + 1] || null;
        const pivot = book.querySelector('.locked-book-pivot');
        const book3d = book.querySelector('.locked-book-3d');
        const spine = book.querySelector('.locked-book-spine');

        book.style.height = `${config.height}px`;
        book3d.style.height = `100%`;
        book.style.minWidth = `${config.width}px`;
        spine.style.width = `${config.width}px`;
        spine.style.transform = `rotateY(90deg) translateX(-${config.width}px)`;

        if (config.angle > 0) pivot.style.transformOrigin = 'bottom right';
        else if (config.angle < 0) pivot.style.transformOrigin = 'bottom left';
        else pivot.style.transformOrigin = 'bottom center';

        pivot.style.transform = `rotateZ(${config.angle}deg)`;

        let gap = 2;
        if (config.customGap !== undefined) {
          gap = config.customGap;
        } else if (nextConfig) {
          if (config.angle > 0 && nextConfig.angle < 0) {
            const overhangCurrent = Math.sin(Math.abs(config.angle) * (Math.PI/180)) * config.height;
            const overhangNext = Math.sin(Math.abs(nextConfig.angle) * (Math.PI/180)) * nextConfig.height;
            gap = overhangCurrent + overhangNext + 5;
          } else if ((config.angle > 0 && nextConfig.angle > 0) || (config.angle < 0 && nextConfig.angle < 0)) {
              gap = 6;
          }
        }
        book.style.marginRight = `${gap}px`;
      });

      bookElements.forEach(book => {

        // 1. Hover Effect (Existing)
        book.addEventListener('mouseenter', () => {
          bookElements.forEach(b => b.classList.remove('locked-active'));
          book.classList.add('locked-active');
        });
        book.parentElement.addEventListener('mouseleave', () => {
          book.classList.remove('locked-active');
        });

        // 2. Click Navigation (NEW)
        book.addEventListener('click', () => {
          const link = book.dataset.link;

          if (link) {
            // If it starts with http, open in new tab
            if (link.startsWith('http')) {
              window.open(link, '_blank', 'noopener,noreferrer');
            }
            // Otherwise, treat as internal page navigation
            else {
              window.location.href = link;
            }
          }
        });

      });
  }

  // ------------------------------------------------------------------------------------ //
  // ------------------------------- PORTRAITS PAGE ------------------------------------- //
  // ------------------------------------------------------------------------------------ //

  // !!! FIX: ISOLATED SCOPE FOR PORTRAITS !!!
  {
    const sheets = document.querySelectorAll('.paper-sheet');
    const nextBtn = document.querySelector('.next-btn'); // Class selector
    const prevBtn = document.querySelector('.prev-btn'); // Class selector
    const label = document.getElementById('dynamicLabel');

    // Check if we are on the Portraits page before running this
    if (sheets.length > 0 && nextBtn && prevBtn) {
        let currentIndex = 0;
        const totalSheets = sheets.length;
        let isAnimating = false;

        function updateStack() {
            sheets.forEach((sheet, index) => {
                sheet.classList.remove('fly-out-right', 'fly-out-left', 'active', 'next');
                let position = (index - currentIndex + totalSheets) % totalSheets;

                if (position === 0) {
                    sheet.style.zIndex = 10;
                    sheet.classList.add('active');
                    sheet.style.opacity = 1;
                    const note = sheet.querySelector('.handwritten-note').innerText;
                    if(label) label.innerText = `FIG 0${index + 1}. // ${note.toUpperCase()}`;
                } else if (position === 1) {
                    sheet.style.zIndex = 9;
                    sheet.classList.add('next');
                    sheet.style.opacity = 1;
                } else {
                    sheet.style.zIndex = 10 - position;
                    sheet.style.opacity = 0;
                }
            });
        }

        nextBtn.addEventListener('click', () => {
            if (isAnimating) return;
            isAnimating = true;
            const currentSheet = sheets[currentIndex];
            currentSheet.classList.add('fly-out-right');
            setTimeout(() => {
                currentIndex = (currentIndex + 1) % totalSheets;
                updateStack();
                isAnimating = false;
            }, 300);
        });

        prevBtn.addEventListener('click', () => {
            if (isAnimating) return;
            isAnimating = true;
            const prevIndex = (currentIndex - 1 + totalSheets) % totalSheets;
            const prevSheet = sheets[prevIndex];
            prevSheet.style.transition = 'none';
            prevSheet.classList.add('fly-out-left');
            prevSheet.style.opacity = 1;
            void prevSheet.offsetWidth;
            prevSheet.style.transition = '';
            prevSheet.classList.remove('fly-out-left');
            currentIndex = prevIndex;
            updateStack();
            setTimeout(() => {
                isAnimating = false;
            }, 300);
        });

        // SWIPE LOGIC
        const visualColumn = document.querySelector('.visual-column');
        if (visualColumn) {
            let touchStartX = 0;
            let touchEndX = 0;
            const minSwipeDistance = 50;

            visualColumn.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            visualColumn.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                const swipeDistance = touchEndX - touchStartX;
                if (Math.abs(swipeDistance) > minSwipeDistance) {
                    if (swipeDistance < 0) nextBtn.click();
                    else prevBtn.click();
                }
            });
        }

        // KEYBOARD SUPPORT
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') nextBtn.click();
            else if (e.key === 'ArrowLeft') prevBtn.click();
        });

        // Initial Setup
        updateStack();

        // PARALLAX (If applicable)
        const textCol = document.getElementById('parallaxText');
        const imgCol = document.getElementById('parallaxImage');
        if(textCol && imgCol){
            document.addEventListener('mousemove', (e) => {
                const mouseX = e.clientX - window.innerWidth / 2;
                const mouseY = e.clientY - window.innerHeight / 2;
                textCol.style.transform = `translate(${mouseX * 0.01}px, ${mouseY * 0.01}px)`;
                imgCol.style.transform = `translate(${mouseX * -0.015}px, ${mouseY * -0.015}px)`;
            });
        }
    }
  } // END PORTRAIT SCOPE

  // ------------------------------------------------------------------------------------ //
  // ------------------------------- URBAN SKETCH PAGE ---------------------------------- //
  // ------------------------------------------------------------------------------------ //

  // !!! ISOLATED SCOPE !!!
  {
    const pages = document.querySelectorAll('.page');
    const urbanNext = document.getElementById('nextBtn');
    const urbanPrev = document.getElementById('prevBtn');

    if (pages.length > 0 && urbanNext && urbanPrev) {

        // START AT 1
        // Index 0 is the "Left Side Start Page" (Already flipped in HTML)
        // Index 1 is the "Right Side Start Page" (Visible)
        let currentPage = 1;

        function updateZIndexes() {
            pages.forEach((page, index) => {
                if (page.classList.contains('flipped')) {
                    // LEFT STACK
                    page.style.zIndex = index + 1;
                } else {
                    // RIGHT STACK
                    page.style.zIndex = pages.length - index;
                }
            });

            // Optional: Dim buttons if at start/end limits
            urbanPrev.style.opacity = currentPage <= 1 ? "0.3" : "1";
            urbanNext.style.opacity = currentPage >= pages.length - 1 ? "0.3" : "1";
        }

        urbanNext.addEventListener('click', () => {
            // STOP BEFORE LAST PAGE
            // We do NOT want to flip the very last page (it's the back cover base)
            if (currentPage < pages.length - 1) {
                pages[currentPage].classList.add('flipped');
                currentPage++;
                updateZIndexes();
            }
        });

        urbanPrev.addEventListener('click', () => {
            // STOP BEFORE FIRST PAGE
            // We do NOT want to unflip Page 0 (it's the front cover base)
            if (currentPage > 1) {
                currentPage--;
                pages[currentPage].classList.remove('flipped');
                updateZIndexes();
            }
        });

        // Click Page to flip
        pages.forEach((page, index) => {
            page.addEventListener('click', () => {
                // Click Right Page -> Next (Only if allowed)
                if (index === currentPage) {
                     if (currentPage < pages.length - 1) urbanNext.click();
                }
                // Click Left Page -> Prev (Only if allowed)
                else if (index === currentPage - 1) {
                     if (currentPage > 1) urbanPrev.click();
                }
            });
        });

        updateZIndexes();
    }
  }

  // ------------------------------------------------------------------------------------ //
// ------------------------------- PHOTOGRAPHY PAGE ----------------------------------- //
// ------------------------------------------------------------------------------------ //

{
    const track = document.getElementById('track');
    // Robust selection: Try ID first, then fallback to class
    const stage = document.getElementById('cameraStage') || document.querySelector('.camera-stage-container');
    const nextBtn = document.getElementById('photoNext');
    const prevBtn = document.getElementById('photoPrev');
    const controls = document.querySelector('.carousel-controls');
    const modeBtns = document.querySelectorAll('.filter-btn[data-mode]');

    // Safety check: Only run if essential elements exist
    if (track && stage && nextBtn && prevBtn) {

        // Photography carousel only runs on /pages/photography.html, so
        // images live one level up under assets/images/projects/photography/.
        // Filenames are zero-padded (01.jpg .. 29.jpg) and lowercase.
        const CONFIG = {
            landscape: {
                folder: __ROOT_PFX + 'assets/images/projects/photography/horizontal/',
                count: 8,
                ext: '.jpg'
            },
            portrait: {
                folder: __ROOT_PFX + 'assets/images/projects/photography/vertical/',
                count: 29,
                ext: '.jpg'
            }
        };

        let currentMode = 'landscape';
        let currentIndex = 0;
        let slides = [];

        function loadSlides(mode) {
            track.innerHTML = '';
            const cfg = CONFIG[mode];

            for (let i = 1; i <= cfg.count; i++) {
                const div = document.createElement('div');
                div.className = 'c-slide';

                const img = document.createElement('img');
                // zero-pad index to match filename convention (01.jpg, 02.jpg, ...)
                const idxStr = String(i).padStart(2, '0');
                img.src = `${cfg.folder}${idxStr}${cfg.ext}`;
                img.onerror = function() { this.style.display = 'none'; };

                div.appendChild(img);
                track.appendChild(div);

                div.addEventListener('click', () => {
                    const idx = slides.indexOf(div);
                    const distance = idx - currentIndex;
                    if (distance === 1) nextBtn.click();
                    if (distance === -1) prevBtn.click();
                });
            }

            slides = Array.from(track.querySelectorAll('.c-slide'));
            currentIndex = 0;
            updateCarousel();
        }

        function updateCarousel() {
            slides.forEach((slide, index) => {
                const distance = index - currentIndex;
                if (Math.abs(distance) <= 2) {
                    slide.setAttribute('data-pos', distance);
                    slide.style.opacity = '';
                    slide.style.pointerEvents = 'auto';
                } else {
                    slide.removeAttribute('data-pos');
                    slide.style.opacity = 0;
                    slide.style.pointerEvents = 'none';
                }
            });
            prevBtn.style.opacity = currentIndex === 0 ? "0.3" : "1";
            nextBtn.style.opacity = currentIndex === slides.length - 1 ? "0.3" : "1";
        }

        modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const newMode = btn.dataset.mode;
                if (currentMode === newMode) return;

                modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (newMode === 'portrait') {
                    stage.classList.add('mode-portrait');
                    if (controls) controls.classList.add('mode-portrait');
                } else {
                    stage.classList.remove('mode-portrait');
                    if (controls) controls.classList.remove('mode-portrait');
                }

                currentMode = newMode;
                // Delay slightly to let rotation start
                setTimeout(() => loadSlides(newMode), 50);
            });
        });

        nextBtn.addEventListener('click', () => {
            if (currentIndex < slides.length - 1) {
                currentIndex++;
                updateCarousel();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        // Initialize
        loadSlides('landscape');
    }
}
  // ------------------------------------------------------------------------------------ //
  // --------------------------- ARCHIVED ASSETS LIBRARY -------------------------------- //
  // ------------------------------------------------------------------------------------ //

  if (document.querySelector('.book-item')) {
      const books = document.querySelectorAll('.book-item');
      books.forEach(book => {
        book.addEventListener('mouseenter', () => {
          books.forEach(otherBook => {
            if (otherBook !== book) otherBook.classList.remove('is-expanded');
          });
          book.classList.add('is-expanded');
        });

        book.parentElement.addEventListener('mouseleave', () => {
           book.classList.remove('is-expanded');
        });
      });
  }

  if (document.getElementById('portraitBoard')) {
    const board = document.getElementById('portraitBoard');
    const matte = board.querySelector('.specimen-matte');
    const accent = board.querySelector('.specimen-accent-block');

    board.addEventListener('mousemove', (e) => {
        const rect = board.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        matte.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        accent.style.transform = `perspective(1000px) translateZ(-50px) rotateX(${rotateX * 0.5}deg) rotateY(${rotateY * 0.5}deg) translateX(${rotateY}px) translateY(${rotateX}px)`;
    });

    board.addEventListener('mouseleave', () => {
        matte.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
        accent.style.transform = 'translateZ(0) rotateX(0) rotateY(0)';
    });
  }

});
