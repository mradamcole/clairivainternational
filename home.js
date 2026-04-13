const HOME_LOCKUP_STORAGE_KEY = "clairiva-home-lockup";
const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
const parallaxElements = Array.from(document.querySelectorAll("[data-parallax]"));
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const trustScatterGrid = document.querySelector("[data-trust-scatter]");
const trustScatterItems = trustScatterGrid
  ? Array.from(trustScatterGrid.querySelectorAll(".trust-grid__item"))
  : [];

const brandLogo = document.getElementById("brand-logo");
const brandWordmark = document.getElementById("brand-wordmark");
const brandLineTop = document.getElementById("brand-line-top");
const brandLineBottom = document.getElementById("brand-line-bottom");

let revealObserver = null;
let rafId = 0;
let parallaxBound = false;
let trustScatterResizeObserver = null;
let trustScatterResizeTimer = 0;
let trustScatterLastWidth = 0;

function trustRectsOverlap(a, b, gap) {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function trustHitBoxForTilt(w, h, tiltDeg) {
  const rad = (Math.abs(tiltDeg) * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const bw = w * c + h * s;
  const bh = w * s + h * c;
  const ox = (bw - w) / 2;
  const oy = (bh - h) / 2;
  return { bw, bh, ox, oy };
}

function layoutTrustScatter() {
  if (!trustScatterGrid || trustScatterItems.length === 0) {
    return;
  }

  const pad = 10;
  const gap = 16;
  const cw = trustScatterGrid.clientWidth;

  if (cw <= 0) {
    return;
  }

  const usable = Math.max(1, cw - pad * 2);
  const vw = window.innerWidth || 1;

  const specs = trustScatterItems.map((wrap) => {
    const wide = Math.random() < 0.48;
    let wMin;
    let wMax;
    if (wide) {
      wMin = Math.max(200, usable * (0.3 + Math.random() * 0.08));
      wMax = Math.max(wMin + 24, Math.min(usable, usable * (0.42 + Math.random() * 0.12)));
    } else {
      wMin = Math.max(140, usable * (0.2 + Math.random() * 0.07));
      wMax = Math.max(wMin + 20, Math.min(usable * 0.36, usable));
    }
    const widthPx = Math.min(wMax, wMin + Math.random() * (wMax - wMin));

    const tiltDeg = (Math.random() - 0.5) * 6.2;
    const padRem = (1.05 + Math.random() * 0.42).toFixed(2);
    const radiusPx = `${Math.round(16 + Math.random() * 18)}px`;
    const nudgeX = `${((Math.random() - 0.5) * 10).toFixed(1)}px`;
    const nudgeY = `${((Math.random() - 0.5) * 8).toFixed(1)}px`;
    const z = String(2 + Math.floor(Math.random() * 10));
    const enterDir = Math.random() < 0.5 ? -1 : 1;
    const enterDistPx = Math.round(vw * (0.4 + Math.random() * 0.35));

    return { wrap, widthPx, tiltDeg, padRem, radiusPx, nudgeX, nudgeY, z, enterDir, enterDistPx };
  });

  for (const s of specs) {
    const card = s.wrap.querySelector(".trust-card");
    s.wrap.style.width = `${s.widthPx}px`;
    s.wrap.style.left = "0px";
    s.wrap.style.top = "0px";
    s.wrap.style.zIndex = s.z;
    s.wrap.dataset.trustEnterDir = String(s.enterDir);
    s.wrap.dataset.trustEnterDist = String(s.enterDistPx);
    s.wrap.style.setProperty("--trust-rotate", `${s.tiltDeg.toFixed(2)}deg`);
    s.wrap.style.setProperty("--trust-nudge-x", s.nudgeX);
    s.wrap.style.setProperty("--trust-nudge-y", s.nudgeY);
    if (card) {
      card.style.setProperty("--trust-card-pad", `${s.padRem}rem`);
      card.style.setProperty("--trust-card-radius", s.radiusPx);
    }
  }

  const measured = specs.map((s) => {
    const { wrap, tiltDeg } = s;
    const w = wrap.offsetWidth;
    const h = wrap.offsetHeight;
    const { bw, bh, ox, oy } = trustHitBoxForTilt(w, h, tiltDeg);
    return { ...s, w, h, bw, bh, ox, oy };
  });

  measured.sort((a, b) => b.w * b.h - a.w * a.h);

  const placed = [];
  let canvasH = Math.max(cw * 0.58, 420);

  const hitAt = (x, y, box) => ({
    x: x - box.ox,
    y: y - box.oy,
    w: box.bw,
    h: box.bh,
  });

  for (const s of measured) {
    const { wrap, w, h, ox, oy, bw, bh } = s;
    let x = pad;
    let y = pad;
    let found = false;

    for (let attempt = 0; attempt < 920; attempt += 1) {
      let yMax = canvasH - h - pad;
      if (yMax < pad) {
        canvasH += Math.max(h * 0.5, 88);
        yMax = canvasH - h - pad;
      }

      const bands = 6;
      const band = Math.floor(Math.random() * bands);
      const span = Math.max(1, cw - w - pad * 2);
      const slice = span / bands;
      x = pad + band * slice + Math.random() * Math.max(1, slice);
      x = Math.min(Math.max(x, pad), cw - w - pad);

      const ySpan = Math.max(1, yMax - pad);
      y = pad + Math.pow(Math.random(), 0.52 + Math.random() * 0.35) * ySpan;

      const candidateHit = hitAt(x, y, { ox, oy, bw, bh });
      if (!placed.some((p) => trustRectsOverlap(candidateHit, p.hit, gap))) {
        placed.push({ hit: candidateHit });
        found = true;
        break;
      }
    }

    if (!found) {
      let fallbackY = pad;
      for (const p of placed) {
        fallbackY = Math.max(fallbackY, p.hit.y + p.hit.h + gap);
      }

      let slotted = false;
      for (let t = 0; t < 220; t += 1) {
        x = pad + Math.random() * Math.max(1, cw - w - pad * 2);
        const candidateHit = hitAt(x, fallbackY, { ox, oy, bw, bh });
        if (!placed.some((p) => trustRectsOverlap(candidateHit, p.hit, gap))) {
          y = fallbackY;
          placed.push({ hit: candidateHit });
          slotted = true;
          break;
        }
      }

      if (!slotted) {
        const step = Math.max(14, Math.floor(w / 9));
        outer: for (let xi = pad; xi <= cw - w - pad; xi += step) {
          for (let yi = fallbackY; yi <= fallbackY + h * 2.2; yi += 10) {
            const candidateHit = hitAt(xi, yi, { ox, oy, bw, bh });
            if (!placed.some((p) => trustRectsOverlap(candidateHit, p.hit, gap))) {
              x = xi;
              y = yi;
              placed.push({ hit: candidateHit });
              slotted = true;
              break outer;
            }
          }
        }
      }

      if (!slotted) {
        y = fallbackY;
        x = pad;
        let guard = 0;
        while (
          guard < 500 &&
          placed.some((p) => trustRectsOverlap(hitAt(x, y, { ox, oy, bw, bh }), p.hit, gap))
        ) {
          y += gap + 8;
          guard += 1;
        }
        placed.push({ hit: hitAt(x, y, { ox, oy, bw, bh }) });
      }

      canvasH = Math.max(canvasH, y + h + pad);
    } else {
      canvasH = Math.max(canvasH, y + h + pad);
    }

    wrap.style.left = `${x}px`;
    wrap.style.top = `${y}px`;
  }

  trustScatterGrid.style.minHeight = `${Math.ceil(canvasH + pad)}px`;
}

function scheduleTrustScatterLayout() {
  if (!trustScatterGrid) {
    return;
  }

  window.clearTimeout(trustScatterResizeTimer);
  trustScatterResizeTimer = window.setTimeout(() => {
    const w = trustScatterGrid.clientWidth;
    if (w === trustScatterLastWidth && trustScatterLastWidth > 0) {
      return;
    }
    trustScatterLastWidth = w;
    layoutTrustScatter();
    requestParallaxUpdate();
  }, 120);
}

function setupTrustScatter() {
  if (!trustScatterGrid || trustScatterItems.length === 0) {
    return;
  }

  layoutTrustScatter();
  trustScatterLastWidth = trustScatterGrid.clientWidth;

  if (typeof ResizeObserver === "function") {
    trustScatterResizeObserver?.disconnect();
    trustScatterResizeObserver = new ResizeObserver(() => {
      scheduleTrustScatterLayout();
    });
    trustScatterResizeObserver.observe(trustScatterGrid);
  } else {
    window.addEventListener("resize", scheduleTrustScatterLayout);
  }
}

function applyStoredLockup() {
  let savedLockup = null;

  try {
    savedLockup = window.sessionStorage.getItem(HOME_LOCKUP_STORAGE_KEY);
    window.sessionStorage.removeItem(HOME_LOCKUP_STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to read Clairiva home lockup.", error);
  }

  if (!savedLockup) {
    return;
  }

  try {
    const styles = JSON.parse(savedLockup);

    if (styles.logoStyle) {
      brandLogo.style.cssText = styles.logoStyle;
    }

    if (styles.wordmarkStyle) {
      brandWordmark.style.cssText = styles.wordmarkStyle;
    }

    if (styles.lineTopStyle) {
      brandLineTop.style.cssText = styles.lineTopStyle;
    }

    if (styles.lineBottomStyle) {
      brandLineBottom.style.cssText = styles.lineBottomStyle;
    }
  } catch (error) {
    console.warn("Unable to restore Clairiva home lockup.", error);
  }
}

function revealAll() {
  revealElements.forEach((element) => {
    element.classList.add("is-visible");
  });
}

function setupReveals() {
  if (!revealElements.length) {
    return;
  }

  if (reducedMotionQuery.matches || !("IntersectionObserver" in window)) {
    revealAll();
    return;
  }

  revealObserver?.disconnect();
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.15,
    }
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
}

function updateTrustScrollEnter() {
  if (!trustScatterGrid || trustScatterItems.length === 0) {
    return;
  }

  if (reducedMotionQuery.matches) {
    trustScatterItems.forEach((wrap) => {
      wrap.style.setProperty("--trust-enter-x", "0px");
    });
    return;
  }

  const viewportHeight = window.innerHeight || 1;
  const gridTop = trustScatterGrid.getBoundingClientRect().top;
  const rangeStart = viewportHeight * 1.05;
  const rangeEnd = viewportHeight * 0.26;
  const span = Math.max(1, rangeStart - rangeEnd);
  let progress = (rangeStart - gridTop) / span;
  progress = Math.max(0, Math.min(1, progress));
  progress = progress * progress * (3 - 2 * progress);

  trustScatterItems.forEach((wrap) => {
    const dir = Number.parseFloat(wrap.dataset.trustEnterDir || "1");
    const dist = Number.parseFloat(wrap.dataset.trustEnterDist || "0");
    const sign = Number.isFinite(dir) && dir < 0 ? -1 : 1;
    const amplitude = Number.isFinite(dist) && dist > 0 ? dist : Math.round(viewportHeight * 0.55);
    const enterX = (1 - progress) * sign * amplitude;
    wrap.style.setProperty("--trust-enter-x", `${enterX.toFixed(2)}px`);
  });
}

function updateParallax() {
  rafId = 0;

  if (reducedMotionQuery.matches || !parallaxElements.length) {
    parallaxElements.forEach((element) => {
      element.style.setProperty("--parallax-y", "0px");
    });
    updateTrustScrollEnter();
    return;
  }

  const viewportHeight = window.innerHeight || 1;
  const scrollY = window.scrollY || window.pageYOffset || 0;

  parallaxElements.forEach((element) => {
    const speed = Number.parseFloat(element.dataset.parallax || "0");

    if (!Number.isFinite(speed) || speed === 0) {
      element.style.setProperty("--parallax-y", "0px");
      return;
    }

    const rect = element.getBoundingClientRect();
    let offset = 0;

    if (window.getComputedStyle(element).position === "fixed") {
      offset = scrollY * speed * -0.18;
    } else {
      const distanceFromViewportCenter = rect.top + (rect.height / 2) - (viewportHeight / 2);
      offset = distanceFromViewportCenter * speed * -0.22;
    }

    element.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
  });

  updateTrustScrollEnter();
}

function requestParallaxUpdate() {
  if (rafId) {
    return;
  }

  rafId = window.requestAnimationFrame(updateParallax);
}

function setupParallax() {
  updateParallax();

  if (reducedMotionQuery.matches || !parallaxElements.length || parallaxBound) {
    return;
  }

  window.addEventListener("scroll", requestParallaxUpdate, { passive: true });
  window.addEventListener("resize", requestParallaxUpdate);
  parallaxBound = true;
}

function handleMotionPreferenceChange() {
  setupReveals();
  requestParallaxUpdate();
}

async function showHomepage() {
  applyStoredLockup();

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  setupReveals();
  setupTrustScatter();
  setupParallax();
  window.requestAnimationFrame(() => {
    document.body.dataset.ready = "true";
    layoutTrustScatter();
    requestParallaxUpdate();
  });
}

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);
} else if (typeof reducedMotionQuery.addListener === "function") {
  reducedMotionQuery.addListener(handleMotionPreferenceChange);
}

showHomepage();
