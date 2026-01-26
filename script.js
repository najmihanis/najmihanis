document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------------------------------ //
  // ------------------------------- GLOBAL SETTINGS ------------------------------------ //
  // ------------------------------------------------------------------------------------ //

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
    document.documentElement.style.setProperty('--ui-scale', 1);
    const vw = window.innerWidth;
    const gutter = Math.max(6, Math.min(18, Math.round(vw * 0.02)));
    document.documentElement.style.setProperty('--page-gutter', `${gutter}px`);
    const casingW = deviceCasing.getBoundingClientRect().width;
    const availableW = vw - gutter * 2;
    let scale = availableW / casingW;
    scale = Math.max(0.25, Math.min(scale, 1.15));
    document.documentElement.style.setProperty('--ui-scale', scale);
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
  const NAV_ROUTES = {
    home: "index.html",
    about: "index.html#hero",
    "art-design": "art-lobby.html",      
    "engineering": "projects.html",      
    "photography": "photography.html",   
    resume: "https://drive.google.com/file/d/1H5tKhDrfGviwmIypsKUIibejHXK6Hu-X/view?usp=sharing",
    contact: "index.html#contact"
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

          if (targetPage === 'engineering') setTimeout(() => { window.location.href = 'projects.html'; }, 450);
          if (targetPage === 'art') setTimeout(() => { window.location.href = 'art-lobby.html'; }, 450);
          if (targetPage === 'photo') setTimeout(() => { window.location.href = 'photography.html'; }, 450);
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

        const CONFIG = {
            landscape: {
                folder: 'project pics/photography/horizontal/',
                count: 8,
                ext: '.JPG' // Case Sensitive
            },
            portrait: {
                folder: 'project pics/photography/vertical/',
                count: 29,
                ext: '.JPG'
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
                img.src = `${cfg.folder}${i}${cfg.ext}`;
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