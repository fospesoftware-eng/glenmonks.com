/* ============================================================
   GLEN MONKS — interactions & motion
   ============================================================ */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const body = document.body;

  /* ----------------------------------------------------------
     1. SPLIT TEXT — hero headline into choreographed chars
     ---------------------------------------------------------- */
  const splitEls = document.querySelectorAll("[data-split]");
  splitEls.forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    let i = 0;
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = ch === " " ? "\u00A0" : ch;
      span.style.transitionDelay = (0.25 + i * 0.045) + "s";
      el.appendChild(span);
      i++;
    }
    el.setAttribute("aria-hidden", "true");
  });
  // Keep the headline readable for assistive technology
  const heroTitle = document.querySelector(".hero__title");
  if (heroTitle) {
    const label = Array.from(splitEls).map((el) =>
      el.getAttribute("aria-label") || el.textContent.replace(/\u00A0/g, " ")
    ).join(" ");
    heroTitle.setAttribute("aria-label", label.replace(/\s+/g, " ").trim());
  }

  /* Pull quote — words light up as they cross the screen */
  const quote = document.querySelector("[data-reveal='text']");
  if (quote) {
    const words = quote.textContent.trim().split(/\s+/);
    quote.textContent = "";
    words.forEach((w) => {
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = w + " ";
      quote.appendChild(s);
    });
  }

  /* ----------------------------------------------------------
     2. PRELOADER
     ---------------------------------------------------------- */
  const preloader = document.getElementById("preloader");
  const preCount  = document.getElementById("preCount");

  function finishLoading() {
    body.classList.add("is-loaded");
    window.setTimeout(() => {
      if (preloader) {
        preloader.classList.add("is-done");
        body.classList.remove("is-locked");
        window.setTimeout(() => preloader.remove(), 1200);
      }
    }, reduceMotion ? 0 : 400);
  }

  if (reduceMotion) {
    if (preloader) preloader.remove();
    finishLoading();
  } else {
    body.classList.add("is-locked");
    const start = performance.now();
    const DURATION = 1700;
    let current = 0;

    function tick(now) {
      const p = Math.min((now - start) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      current = Math.round(eased * 100);
      if (preCount) preCount.textContent = current;
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        window.setTimeout(finishLoading, 250);
      }
    }
    requestAnimationFrame(tick);
    // Safety: never trap the user behind the loader
    window.setTimeout(finishLoading, 4200);
  }

  /* ----------------------------------------------------------
     3. CUSTOM CURSOR
     ---------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    const cursor = document.querySelector(".cursor");
    const dot = cursor.querySelector(".cursor__dot");
    const ring = cursor.querySelector(".cursor__ring");
    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;

    addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      const hot = e.target.closest("a, button, [data-cursor='hover']");
      cursor.classList.toggle("is-hover", !!hot);
    }, { passive: true });

    document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
    document.addEventListener("mouseenter", () => cursor.classList.remove("is-hidden"));

    (function ringLoop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(ringLoop);
    })();
  }

  /* ----------------------------------------------------------
     4. MAGNETIC ELEMENTS
     ---------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.28}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate(0,0)";
      });
    });
  }

  /* ----------------------------------------------------------
     5. NAV — scroll state + hide on scroll down
     ---------------------------------------------------------- */
  const nav = document.getElementById("nav");
  let lastY = scrollY;

  function onScrollNav() {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    if (!body.classList.contains("menu-open")) {
      if (y > lastY && y > 320) nav.classList.add("is-hidden");
      else nav.classList.remove("is-hidden");
    }
    lastY = y;
  }
  addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  /* ----------------------------------------------------------
     6. MOBILE MENU
     ---------------------------------------------------------- */
  const burger = document.getElementById("burger");
  const menu = document.getElementById("mobileMenu");

  function toggleMenu(force) {
    const open = force !== undefined ? force : !menu.classList.contains("is-open");
    menu.classList.toggle("is-open", open);
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open);
    body.classList.toggle("is-locked", open);
    body.classList.toggle("menu-open", open);
    nav.classList.toggle("is-hidden", false);
  }
  burger.addEventListener("click", () => toggleMenu());
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  /* ----------------------------------------------------------
     7. SCROLL PROGRESS + SHARED SCROLL TICK
     ---------------------------------------------------------- */
  const progressBar = document.querySelector(".scroll-progress span");
  const parallaxEls = [];

  document.querySelectorAll("[data-parallax]").forEach((el) => {
    parallaxEls.push({ el, f: parseFloat(el.dataset.parallax) || 0.15, inner: false });
  });
  document.querySelectorAll("[data-parallax-img]").forEach((el) => {
    parallaxEls.push({ el, f: parseFloat(el.dataset.parallaxImg) || 0.12, inner: true, scale: 1.08 });
  });

  function renderProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    progressBar.style.transform = `scaleX(${p})`;
  }

  function renderParallax() {
    if (reduceMotion) return;
    const vh = innerHeight;
    for (const item of parallaxEls) {
      const r = item.el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const delta = r.top + r.height / 2 - vh / 2;
      const scale = item.scale ? ` scale(${item.scale})` : "";
      item.el.style.transform = `translate3d(0, ${(-delta * item.f).toFixed(1)}px, 0)${scale}`;
    }
  }

  let ticking = false;
  addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        renderProgress();
        renderParallax();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  renderProgress();

  /* ----------------------------------------------------------
     8. REVEAL ON SCROLL (stagger aware)
     ---------------------------------------------------------- */
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    if (el.dataset.revealDelay) {
      el.style.setProperty("--rd", (parseInt(el.dataset.revealDelay, 10) * 0.12) + "s");
    }
  });

  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        revealIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });

  document.querySelectorAll("[data-reveal]").forEach((el) => revealIO.observe(el));

  /* Pull-quote word lighting */
  const quoteWords = quote ? Array.from(quote.querySelectorAll(".w")) : [];
  if (quote && quoteWords.length && !reduceMotion) {
    const quoteIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          quoteWords.forEach((w, i) => {
            setTimeout(() => w.classList.add("is-lit"), i * 55);
          });
          quoteIO.unobserve(quote);
        }
      });
    }, { threshold: 0.35 });
    quoteIO.observe(quote);
  } else {
    quoteWords.forEach((w) => w.classList.add("is-lit"));
  }

  /* ----------------------------------------------------------
     9. COUNTERS
     ---------------------------------------------------------- */
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    const start = performance.now();
    const D = 1800;
    (function step(now) {
      const p = Math.min((now - start) / D, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased) + (p === 1 ? suffix : "");
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        countIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => countIO.observe(el));

  /* ----------------------------------------------------------
     10. SERVICE CARDS — tilt + spotlight
     ---------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (px * 100) + "%");
        card.style.setProperty("--my", (py * 100) + "%");
        const rotY = (px - 0.5) * 5;
        const rotX = (0.5 - py) * 5;
        card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ----------------------------------------------------------
     11. HOUSEKEEPING
     ---------------------------------------------------------- */
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  renderParallax();

})();
