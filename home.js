const HOME_LOCKUP_STORAGE_KEY = "clairiva-home-lockup";
const revealElements = Array.from(document.querySelectorAll("[data-reveal]"));
const parallaxElements = Array.from(document.querySelectorAll("[data-parallax]"));
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

const brandLogo = document.getElementById("brand-logo");
const brandWordmark = document.getElementById("brand-wordmark");
const brandLineTop = document.getElementById("brand-line-top");
const brandLineBottom = document.getElementById("brand-line-bottom");

let revealObserver = null;
let rafId = 0;
let parallaxBound = false;

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

function updateParallax() {
  rafId = 0;

  if (reducedMotionQuery.matches || !parallaxElements.length) {
    parallaxElements.forEach((element) => {
      element.style.setProperty("--parallax-y", "0px");
    });
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
  setupParallax();
  window.requestAnimationFrame(() => {
    document.body.dataset.ready = "true";
  });
}

if (typeof reducedMotionQuery.addEventListener === "function") {
  reducedMotionQuery.addEventListener("change", handleMotionPreferenceChange);
} else if (typeof reducedMotionQuery.addListener === "function") {
  reducedMotionQuery.addListener(handleMotionPreferenceChange);
}

showHomepage();
