/* ============================================================
   Glen Monks CMS — public site hydration
   Fetches editable content from the CMS and hydrates the static
   page BEFORE main.js runs (which is injected at the end).
   If the API is unreachable, the static markup stays as-is.
   ============================================================ */
(function () {
  "use strict";

  function loadMainJs() {
    var s = document.createElement("script");
    s.src = "assets/js/main.js";
    document.body.appendChild(s);
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* Service icons — names set in the admin map back to the original SVGs */
  var SERVICE_ICONS = {
    target: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M24 6v36M6 24h36"/><circle cx="24" cy="24" r="13"/><circle cx="24" cy="24" r="4.5"/></svg>',
    feather: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M8 40c8-14 14-20 32-32-2 16-10 26-24 32"/><path d="M8 40c6-4 12-8 18-14"/><circle cx="34" cy="14" r="2"/></svg>',
    pose: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="24" cy="14" r="5"/><path d="M24 19v10M24 29l-9 13M24 29l9 13M14 24h20"/></svg>',
    bulb: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M24 8c-7 0-11 5-11 11 0 5 3 8 3 12h16c0-4 3-7 3-12 0-6-4-11-11-11Z"/><path d="M20 39c0 2 2 3 4 3s4-1 4-3"/></svg>',
    bottle: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M34 8H18l-4 6v26h20V14l-4-6Z"/><path d="M14 14h20M24 20v14M19 27h10"/></svg>',
    community: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="24" cy="18" r="9"/><path d="M8 42c2-8 8-12 16-12s14 4 16 12"/></svg>'
  };

  var SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 8h2V5h-2c-2.2 0-3.5 1.4-3.5 3.6V11H8v3h2.5v7h3v-7H16l.5-3h-3V8.8c0-.6.3-.8 1-.8Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="12" rx="4"/><path d="m11 9.5 4 2.5-4 2.5v-5Z" fill="currentColor" stroke="none"/></svg>',
    linktree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v18M7 8l5-5 5 5M5 13l7 8 7-8"/></svg>'
  };

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  function lookup(c, dotted) {
    return dotted.split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, c);
  }

  function hydrate(c) {
    /* ---- simple declarative hooks ---- */
    document.querySelectorAll("[data-cms-text]").forEach(function (el) {
      var v = lookup(c, el.getAttribute("data-cms-text"));
      if (v != null && v !== "") el.textContent = v;
    });
    document.querySelectorAll("[data-cms-html]").forEach(function (el) {
      var v = lookup(c, el.getAttribute("data-cms-html"));
      if (v != null && v !== "") el.innerHTML = v;
    });
    document.querySelectorAll("[data-cms-href]").forEach(function (el) {
      var v = lookup(c, el.getAttribute("data-cms-href"));
      if (v) el.setAttribute("href", v);
    });
    document.querySelectorAll("[data-cms-mailto]").forEach(function (el) {
      var v = lookup(c, el.getAttribute("data-cms-mailto"));
      if (v) el.setAttribute("href", "mailto:" + v);
    });
    document.querySelectorAll("[data-cms-src]").forEach(function (el) {
      var v = lookup(c, el.getAttribute("data-cms-src"));
      if (v) el.setAttribute("src", v);
    });
    document.querySelectorAll("[data-cms-alt]").forEach(function (el) {
      var v = lookup(c, el.getAttribute("data-cms-alt"));
      if (v) el.setAttribute("alt", v);
    });
    document.querySelectorAll("[data-cms-bg]").forEach(function (el) {
      var v = lookup(c, el.getAttribute("data-cms-bg"));
      if (v) el.style.backgroundImage = 'url("' + v.replace(/"/g, "%22") + '")';
    });
    var titleEl = document.querySelector("[data-cms-title]");
    if (titleEl) {
      var t = lookup(c, titleEl.getAttribute("data-cms-title"));
      if (t) document.title = t;
    }
    var metaEl = document.querySelector("[data-cms-meta]");
    if (metaEl) {
      var d = lookup(c, metaEl.getAttribute("data-cms-meta"));
      if (d) metaEl.setAttribute("content", d);
    }

    /* ---- animated counters: "20+" -> count 20, suffix "+" ---- */
    document.querySelectorAll("[data-cms-stat]").forEach(function (el) {
      var v = String(lookup(c, el.getAttribute("data-cms-stat")) || "");
      var m = v.match(/^\s*(\d+)(.*)$/);
      if (m) {
        el.setAttribute("data-count", m[1]);
        el.setAttribute("data-suffix", (m[2] || "").trim());
        el.textContent = "0";
      } else if (v) {
        el.removeAttribute("data-count");
        el.textContent = v;
      }
    });

    /* ---- brand in nav + preloader ---- */
    var navName = document.querySelector(".nav__name");
    if (navName && c.site) {
      var small = navName.querySelector("small");
      if (navName.firstChild && navName.firstChild.nodeType === 3) {
        navName.firstChild.nodeValue = c.site.brandName;
      } else {
        navName.insertBefore(document.createTextNode(c.site.brandName), navName.firstChild);
      }
      if (small) small.textContent = c.site.tagline;
    }
    var preEyebrow = document.querySelector(".preloader__eyebrow");
    if (preEyebrow && c.site && c.site.brandName) preEyebrow.textContent = c.site.brandName;

    /* ---- marquee ---- */
    var marquee = document.getElementById("cms-marquee");
    if (marquee && c.marquee && c.marquee.words) {
      var words = c.marquee.words.split(",").map(function (w) { return w.trim(); }).filter(Boolean);
      var set = words.map(function (w) { return "<span>" + esc(w) + "</span><i>✦</i>"; }).join("");
      marquee.innerHTML = set + set;
    }

    /* ---- pillars ---- */
    var pillars = document.getElementById("cms-pillars");
    if (pillars && Array.isArray(c.pillars)) {
      pillars.innerHTML = c.pillars.map(function (p, i) {
        return '<article class="pillar" data-reveal="up" data-reveal-delay="' + (i % 3) + '">' +
          '<span class="pillar__num">' + esc(p.letter) + "</span>" +
          "<div><h3>" + esc(p.title) + "</h3><p>" + esc(p.body) + "</p></div></article>";
      }).join("");
    }

    /* ---- services ---- */
    var services = document.getElementById("cms-services");
    if (services && Array.isArray(c.services)) {
      var delays = ["", "0", "1", "0", "1", "2"];
      services.innerHTML = c.services.map(function (s, i) {
        var d = delays[i % delays.length];
        var icon = SERVICE_ICONS[s.icon] || SERVICE_ICONS.target;
        var delayAttr = d === "" ? "" : ' data-reveal-delay="' + d + '"';
        return '<article class="service" data-reveal="up"' + delayAttr + ' data-tilt data-cursor="hover">' +
          '<span class="service__num">' + String(i + 1).padStart(2, "0") + "</span>" +
          '<div class="service__icon" aria-hidden="true">' + icon + "</div>" +
          "<h3>" + esc(s.title) + "</h3><p>" + esc(s.body) + "</p>" +
          '<span class="service__line" aria-hidden="true"></span></article>';
      }).join("");
    }

    /* ---- steps ---- */
    var steps = document.getElementById("cms-steps");
    if (steps && Array.isArray(c.steps)) {
      steps.innerHTML = c.steps.map(function (s, i) {
        return '<li class="step" data-reveal="up" data-reveal-delay="' + i + '">' +
          '<span class="step__num">' + String(i + 1).padStart(2, "0") + "</span>" +
          "<h3>" + esc(s.title) + "</h3><p>" + esc(s.body) + "</p></li>";
      }).join("");
    }

    /* ---- resources ---- */
    var resources = document.getElementById("cms-resources");
    if (resources && Array.isArray(c.resources)) {
      var rDelays = ["0", "1", "2", "0"];
      resources.innerHTML = c.resources.map(function (r, i) {
        var wide = r.wide === 1 || r.wide === true;
        var delayAttr = wide ? "" : ' data-reveal-delay="' + rDelays[i % rDelays.length] + '"';
        return '<a class="resource' + (wide ? " resource--wide" : "") + '" ' +
          'href="' + esc(r.url || "#") + '" target="_blank" rel="noopener" data-reveal="up"' + delayAttr + ' data-cursor="hover">' +
          '<div class="resource__top"><span class="resource__tag">' + esc(r.tag) + "</span>" +
          '<span class="resource__arrow" aria-hidden="true">' + ARROW + "</span></div>" +
          "<h3>" + esc(r.title) + "</h3><p>" + esc(r.body) + "</p>" +
          '<span class="resource__meta">' + esc(r.meta) + "</span></a>";
      }).join("");
    }

    /* ---- socials ---- */
    var socials = document.getElementById("cms-socials");
    if (socials && Array.isArray(c.site.socials) && c.site.socials.length) {
      socials.innerHTML = c.site.socials.map(function (s) {
        var key = String(s.label || "").toLowerCase().trim();
        var icon = SOCIAL_ICONS[key] ||
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/></svg>';
        return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener" aria-label="' + esc(s.label) + '" data-cursor="hover">' + icon + "</a>";
      }).join("");
    }

    /* ---- opening hours ---- */
    var hours = document.getElementById("cms-hours");
    if (hours && Array.isArray(c.contact.hours)) {
      hours.innerHTML = c.contact.hours.map(function (h) {
        return "<li><span>" + esc(h.day) + "</span><i></i><b" + (h.off ? ' class="is-off"' : "") + ">" +
          esc(h.label) + "</b></li>";
      }).join("");
    }
  }

  /* ---------------- Contact form ---------------- */
  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;
    var msg = document.getElementById("contactFormMsg");
    var btn = form.querySelector('button[type="submit"]');

    function setMessage(text, ok) {
      msg.textContent = text;
      msg.className = "contact-form__msg" + (ok ? " is-ok" : " is-error");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        message: String(fd.get("message") || "").trim(),
        company: String(fd.get("company") || "")
      };
      if (payload.company) { setMessage("Thank you — your message is on its way.", true); form.reset(); return; }
      btn.disabled = true;
      var label = btn.querySelector(".btn__label");
      var originalLabel = label ? label.textContent : "";
      if (label) label.textContent = "Sending…";

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      }).then(function (r) {
        if (r.ok) {
          setMessage("Thank you — your message is on its way. I will be in touch shortly.", true);
          form.reset();
        } else {
          setMessage(r.data.error || "Something went wrong. Please email me directly.", false);
        }
      }).catch(function () {
        setMessage("Connection problem. Please email gmsoulfood@gmail.com directly.", false);
      }).finally(function () {
        btn.disabled = false;
        if (label) label.textContent = originalLabel;
      });
    });
  }

  /* ---------------- Boot ---------------- */
  var controller = ("AbortController" in window) ? new AbortController() : null;
  var timeout = setTimeout(function () { if (controller) controller.abort(); }, 6000);

  fetch("/api/content", controller ? { signal: controller.signal } : undefined)
    .then(function (res) {
      if (!res.ok) throw new Error("CMS " + res.status);
      return res.json();
    })
    .then(function (data) {
      clearTimeout(timeout);
      try { hydrate(data); } catch (err) { console.warn("CMS hydration issue:", err); }
      initContactForm();
      loadMainJs();
    })
    .catch(function () {
      /* API unavailable (e.g. opened as a plain static file) — keep the static page */
      clearTimeout(timeout);
      initContactForm();
      loadMainJs();
    });
})();
