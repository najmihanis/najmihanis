document.addEventListener('DOMContentLoaded', () => {
    
    // Select Elements
    const outerRing = document.getElementById('nav-outer-ring');
    const innerRing = document.getElementById('nav-inner-ring');
    const knob = document.getElementById('nav-knob');
    const windows = document.querySelectorAll('.nav-window');
    const navDial = document.querySelector('.nav-dial');

    // State
    let isLocked = false;

    // --------------------------------- NAV DIAL ANIMATION ---------------------------------
    // 1. MOUSE TRACKING (Outer Ring Only)
    document.addEventListener('mousemove', (e) => {

        //--------------------- for RPM smaller gauge (HERO SIDE MODULE) ---------------------
         const needle = document.querySelector('.needle');
         if(needle) {
                const screenWidth = window.innerWidth;
                const mouseX = e.clientX;
                
                // Updated range to match the new SVG dial art
                // Map 0-100% screen width to -130deg to 45deg
                const rotation = -130 + ((mouseX / screenWidth) * 175);
                
                needle.style.transform = `rotate(${rotation}deg)`;
            }
        //--------------------- end RPM smaller gauge (HERO SIDE MODULE) ---------------------
        
        // If locked, do not track mouse
        if (isLocked || !navDial) return;

        const rect = navDial.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate Angle
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;
        let angleDeg = (Math.atan2(deltaY, deltaX) * 180 / Math.PI) + 90;

        // Math fix for 12 o'clock orientation
        if (angleDeg > 180) angleDeg -= 360;

        // Clamp between -45 (Left) and 45 (Right)
        const clampedAngle = Math.max(-45, Math.min(45, angleDeg));

        // Apply to Outer Ring Only
        if (outerRing) {
            outerRing.style.transform = `rotate(${clampedAngle}deg)`;
        }
    });

    // 2. CLICK INTERACTION (Lock & Align All Rings)
    windows.forEach(windowEl => {
        windowEl.addEventListener('click', () => {
            // Get the target angle from the HTML data attribute (-45, 0, or 45)
            const targetAngle = windowEl.getAttribute('data-angle');
            const targetPage  = windowEl.dataset.target;
            
            if (targetAngle) {
                isLocked = true; // Stop mouse tracking

                // Rotate EVERYTHING to the target
                // We use distinct transforms to allow for different transition speeds (defined in HTML/CSS)
                if (outerRing) outerRing.style.transform = `rotate(${targetAngle}deg)`;
                if (innerRing) innerRing.style.transform = `rotate(${targetAngle}deg)`;
                if (knob) knob.style.transform = `translate(-50%, -50%) rotate(${targetAngle}deg)`;
            }

            // Navigate after a short delay (feels intentional)
            if (targetPage === 'engineering') {
                setTimeout(() => {
                    window.location.href = 'projects.html';
                }, 450); // match your dial animation timing
            }
        });
    });

    // Optional: Click the main "Navigation" text or background to unlock?
    // For now, it stays locked until reload, or we could add an unlock trigger.

    // --------------------------------- RESPONSIVE UI SCALING ---------------------------------
    const scaleStage = document.getElementById('scaleStage');
    const deviceCasing = document.getElementById('deviceCasing');

    function updateNavOverlayEdges() {
        const inner = document.querySelector('.inner-casing'); // inner border target
        if (!inner) return;

        const r = inner.getBoundingClientRect();

        // Use integers to avoid sub-pixel drift
        const left = Math.round(r.left);
        const right = Math.round(window.innerWidth - r.right);

        document.documentElement.style.setProperty('--nav-left', `${left}px`);
        document.documentElement.style.setProperty('--nav-right', `${right}px`);
    }
    
    function updateUIScale() {
  if (!deviceCasing) return;

  // Force scale=1 to measure true casing width
  document.documentElement.style.setProperty('--ui-scale', 1);

  const vw = window.innerWidth;

  // Gutter shrinks with viewport (keeps the “same look” on iPhone)
  // - big screens: ~18–24px
  // - small phones: ~8–12px
  const gutter = Math.max(6, Math.min(18, Math.round(vw * 0.02)));
  document.documentElement.style.setProperty('--page-gutter', `${gutter}px`);

  // Compute scale based on WIDTH only (priority: casing fills screen width)
  const casingW = deviceCasing.getBoundingClientRect().width;
  const availableW = vw - gutter * 2;

  let scale = availableW / casingW;

  // clamp so it doesn't get ridiculous on huge monitors or microscopic on phones
  scale = Math.max(0.25, Math.min(scale, 1.15));

  // Apply scale globally
  document.documentElement.style.setProperty('--ui-scale', scale);

  // Keep overlay aligned to casing after scaling
  updateNavOverlayEdges();
}

    updateUIScale();
    window.addEventListener('resize', updateUIScale);
    window.addEventListener('load', updateUIScale);

    // --------------------------------- MOBILE NAV TOGGLE ---------------------------------
    const navToggle = document.querySelector('.nav-vent-toggle');
    const navPlate = document.getElementById('mobileNav');

    function setNavOpen(open) {
        document.body.classList.toggle('nav-open', open);
        if (navToggle) navToggle.setAttribute('aria-expanded', String(open));

        // Ensure overlay edges are correct at click time too
        updateNavOverlayEdges();
    }

    if (navToggle && navPlate) {
        navToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setNavOpen(!document.body.classList.contains('nav-open'));
        });
    }
  
 // --------------------------------- NAV BAR BUTTONS MAPPING GLOBALLY ---------------------------------
const NAV_ROUTES = {
  home: "index.html",
  about: "index.html#hero",
  projects: "projects.html",
  resume: "resume.html",
  contact: "index.html#contact"
};

document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", (e) => {
    e.preventDefault();

    const key = el.dataset.nav;
    const target = NAV_ROUTES[key];
    if (!target) return;

    // If we're already on index and it's a hash jump, smooth scroll
    if (target.includes("#")) {
      const [page, hash] = target.split("#");
      const onSamePage =
        !page || page === "" ||
        location.pathname.endsWith("/" + page) ||
        location.pathname.endsWith(page);

      if (onSamePage) {
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    window.location.href = target;
  });
});

// --------------------------------- CONTACT ME DATA STORAGE ---------------------------------

const sendBtn = document.getElementById("sendTx");

if (sendBtn) {
  sendBtn.addEventListener("click", () => {
    const name = document.getElementById("sender_id")?.value.trim() || "";
    const email = document.getElementById("comm_channel")?.value.trim() || "";
    const msg = document.getElementById("message_data")?.value.trim() || "";

    // basic validation (optional)
    if (!name || !email || !msg) {
      alert("Fill in all fields before sending.");
      return;
    }

    // 1) your form endpoint
    const FORM_ID = "1FAIpQLSdlSe516OWIK0t9A-3PBpN6TU8YJh3QRGHamS5HXvuEJkUVLw";
    const endpoint = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;

    // 2) map your fields to the Google Form entry IDs
    const data = new URLSearchParams();
    data.append("entry.1406986934", name);   // <- replace
    data.append("entry.654459799", email);  // <- replace
    data.append("entry.846955755", msg);    // <- replace

    // 3) submit (no-cors is expected here)
    fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: data.toString()
    });

    // 4) UX feedback
    alert("Transmission sent.");
    document.getElementById("sender_id").value = "";
    document.getElementById("comm_channel").value = "";
    document.getElementById("message_data").value = "";
  });
}

// ------------------------------------------------------------------------------------ //
// ------------------------------- PROJECT PAGE --------------------------------------- //
// ------------------------------------------------------------------------------------ //

// ---- C1 Oscilloscope (scope-like: persistence + beam head + subtle noise) ----
const waveMain  = document.getElementById('c1WavePath');
const waveTrail = document.getElementById('c1WaveTrail');
const waveHead  = document.getElementById('c1WaveHead');

if (waveMain && waveTrail && waveHead) {
  const W = 100;
  const baseY = 55;

  const amp = 9;         // amplitude
  const cycles = 2.2;    // waves across the width
  const speed = 0.065;   // phase speed
  const samples = 34;    // smoothness

  // scope “beam head” window (in samples)
  const headLen = 6;     // length of bright head segment

  let t = 0;

  const k = (2 * Math.PI * cycles) / W;

  // tiny deterministic noise (no random flicker)
  function noise(x, time) {
    return 0.8 * Math.sin(0.9 * x + 2.1 * time) + 0.45 * Math.sin(1.7 * x - 1.4 * time);
  }

  function yAt(x, time) {
    const sine = Math.sin(k * x - time) * amp;
    const n = noise(x, time) * 0.35; // keep very subtle
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

  // Smooth path from points (Catmull-Rom -> cubic)
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
    const ptsTrail = points(t - 0.35); // persistence lag

    waveMain.setAttribute('d', pathFromPts(ptsNow));
    waveTrail.setAttribute('d', pathFromPts(ptsTrail));

    // Beam head: take a short segment near the “sweep” end
    // We'll animate the head index moving across samples.
    const headCenter = Math.floor(((t * 8) % 1) * (samples - 1)); // 0..samples-1
    const a = Math.max(0, headCenter - Math.floor(headLen / 2));
    const b = Math.min(samples, a + headLen);

    const headPts = ptsNow.slice(a, b + 1);
    waveHead.setAttribute('d', headPts.length > 1 ? pathFromPts(headPts) : '');

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ===== C5 gauge needle jitter =====
document.querySelectorAll(
  '.bento-tile[data-tile-id="c5"] .c5-needle'
).forEach(needle => {

  const base = parseFloat(
    getComputedStyle(needle)
      .getPropertyValue('--ang')
      .replace('deg','')
  );

  setInterval(() => {
    // subtle random jitter
    const jitter = (Math.random() - 0.5) * 4; // ±2deg
    needle.style.transform =
      `rotate(${base + jitter}deg)`;
  }, 120);
});








    
}
);