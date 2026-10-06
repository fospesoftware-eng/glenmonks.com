/* ============================================================
   Glen Monks CMS — admin application (vanilla JS, no build)
   ============================================================ */
"use strict";

/* ---------------- HTTP ---------------- */
async function api(path, options = {}) {
  const opts = { credentials: "same-origin", headers: {}, ...options };
  if (opts.body && !(opts.body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch("/api/admin" + path, opts);
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ---------------- Tiny helpers ---------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function toast(message, isError = false) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.toggle("is-error", isError);
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add("is-on"));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.classList.remove("is-on"); setTimeout(() => (t.hidden = true), 300); }, 3200);
}

function modal(title, bodyNode) {
  $("#modalTitle").textContent = title;
  const body = $("#modalBody");
  body.innerHTML = "";
  body.appendChild(bodyNode);
  $("#modal").hidden = false;
}
function closeModal() { $("#modal").hidden = true; }
document.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

const ICONS = {
  dash: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  pages: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  services: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>',
  steps: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 19h14M7 15l4-4 3 3 5-7"/><circle cx="7" cy="15" r="1.4" fill="currentColor"/></svg>',
  library: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M18 3v16M8 7h6M8 11h6"/></svg>',
  posts: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5a2 2 0 0 1 2-2h9l5 5v13H6a2 2 0 0 1-2-2z"/><path d="M15 3v5h5M8 13h8M8 17h5"/></svg>',
  media: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 17 5-5 4 4 2-2 3 3"/></svg>',
  mail: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
  cog: '<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>'
};

/* Service icon choices (must match the website's cms.js ICONS) */
const SERVICE_ICONS = ["target", "feather", "pose", "bulb", "bottle", "community"];

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dash" },
  { id: "pages", label: "Page Content", icon: "pages" },
  { id: "services", label: "Services", icon: "services" },
  { id: "pillars", label: "Pillars", icon: "services" },
  { id: "steps", label: "Journey Steps", icon: "steps" },
  { id: "resources", label: "Library", icon: "library" },
  { id: "posts", label: "Journal / Posts", icon: "posts" },
  { id: "media", label: "Media Library", icon: "media" },
  { id: "enquiries", label: "Enquiries", icon: "mail" },
  { id: "settings", label: "Settings", icon: "cog" }
];

/* ---------------- State / routing ---------------- */
const state = {
  view: "dashboard",
  content: null,
  media: null,
  unread: 0
};

function go(view, param) {
  state.view = view;
  state.param = param;
  renderNav();
  const titles = Object.fromEntries(NAV.map((n) => [n.id, n.label]));
  $("#viewTitle").textContent = titles[view] || "Dashboard";
  $("#topbarRight").innerHTML = "";
  VIEWS[view] ? VIEWS[view]() : VIEWS.dashboard();
}

function renderNav() {
  $("#sideNav").innerHTML = NAV.map((n) => `
    <button data-view="${n.id}" class="${state.view === n.id || (state.view === "post-edit" && n.id === "posts") ? "is-active" : ""}">
      ${ICONS[n.icon]}<span>${n.label}</span>
      ${n.id === "enquiries" && state.unread ? `<span class="nav-badge">${state.unread}</span>` : ""}
    </button>`).join("");
  $("#sideNav").querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => go(b.dataset.view)));
}

async function loadContent(force = false) {
  if (!state.content || force) state.content = await api("/content");
  return state.content;
}
async function loadMedia(force = false) {
  if (!state.media || force) state.media = (await api("/media")).media;
  return state.media;
}

/* ---------------- Media picker modal ---------------- */
function openMediaPicker({ onPick, filter } = {}) {
  const box = document.createElement("div");
  box.innerHTML = `<div class="media-grid" data-grid><p class="muted">Loading media…</p></div>`;
  modal("Choose from the media library", box);
  const grid = box.querySelector("[data-grid]");
  loadMedia().then((items) => {
    const list = filter ? items.filter(filter) : items;
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">Nothing here yet — upload files in the <strong>Media Library</strong> first.</div>`;
      return;
    }
    grid.innerHTML = list.map((m) => `
      <div class="media-card" data-id="${m.id}" style="cursor:pointer">
        <div class="media-card__preview">
          ${m.mime.startsWith("image")
            ? `<img src="${m.url}" alt="${esc(m.original_name)}">`
            : `<span class="media-card__pdf">📄</span>`}
        </div>
        <div class="media-card__info"><span class="media-card__name">${esc(m.original_name)}</span></div>
      </div>`).join("");
    grid.querySelectorAll(".media-card").forEach((card) =>
      card.addEventListener("click", () => {
        const item = items.find((m) => m.id === Number(card.dataset.id));
        onPick(item);
        closeModal();
      }));
  });
}

/* ============================================================
   VIEWS
   ============================================================ */
const VIEWS = {};

/* ---------------- Dashboard ---------------- */
VIEWS.dashboard = async () => {
  const v = $("#view");
  v.innerHTML = `<p class="muted">Loading…</p>`;
  const stats = await api("/stats");
  state.unread = stats.unreadEnquiries;
  renderNav();
  const enquiries = (await api("/enquiries")).enquiries.slice(0, 5);
  const posts = (await api("/posts")).posts.slice(0, 5);

  v.innerHTML = `
    <div class="grid grid-stats">
      ${[
        [stats.publishedPosts, "Published posts"],
        [stats.draftPosts, "Draft posts"],
        [stats.unreadEnquiries, "Unread enquiries"],
        [stats.media, "Media files"]
      ].map(([n, l]) => `<div class="stat"><div class="stat__n">${n}</div><div class="stat__l">${l}</div></div>`).join("")}
    </div>

    <div class="section-row">
      <h3 style="font-size:15px">Latest enquiries</h3>
      <button class="btn btn--ghost btn--sm" data-go="enquiries">All enquiries</button>
    </div>
    ${enquiries.length ? enquiries.map((e) => `
      <div class="item ${e.is_read ? "" : "is-unread"}" style="margin-bottom:10px">
        <div class="enquiry__head">
          ${e.is_read ? "" : '<span class="dot"></span>'}
          <span class="enquiry__name">${esc(e.name)}</span>
          <span class="enquiry__email"><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></span>
          <span class="enquiry__date">${esc(e.created_at)}</span>
        </div>
      </div>`).join("") : `<div class="empty">No enquiries yet. They will appear here when the contact form is used.</div>`}

    <div class="section-row" style="margin-top:28px">
      <h3 style="font-size:15px">Recent posts</h3>
      <button class="btn btn--gold btn--sm" data-go="post-new">+ New post</button>
    </div>
    ${posts.length ? posts.map((p) => `
      <div class="item" style="margin-bottom:10px" data-edit-post="${p.id}" role="button">
        <div class="item__head">
          <span class="item__title">${esc(p.title)}</span>
          <span class="tag-pill ${p.status === "draft" ? "tag-draft" : ""}">${p.status}</span>
          <span class="item__meta">${esc(p.publishedAt || "not scheduled")}</span>
        </div>
      </div>`).join("") : `<div class="empty">No posts written yet.</div>`}`;

  v.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  v.querySelectorAll("[data-edit-post]").forEach((el) =>
    el.addEventListener("click", () => go("post-edit", Number(el.dataset.editPost))));
};

/* ---------------- Page content ---------------- */
const FIELD_SCHEMA = [
  { group: "site", title: "Brand, links & contact details", fields: [
    ["brandName", "Brand name"], ["tagline", "Tagline (under name)"],
    ["calendlyUrl", "Calendly URL", "url"], ["fullscriptUrl", "Fullscript URL", "url"],
    ["email", "Email address"], ["phone", "Telephone (display)"],
    ["addressLine1", "Address line 1"], ["addressLine2", "Address line 2"],
    ["location", "Location footer"], ["footerNote", "Footer copyright note"],
    ["seoTitle", "Browser tab / SEO title"],
    ["seoDescription", "SEO description", "textarea"]
  ]},
  { group: "hero", title: "Hero", fields: [
    ["eyebrow", "Eyebrow line"], ["line1", "Headline line 1"], ["line2", "Headline line 2"],
    ["line3", "Headline line 3 (italic)"], ["subHtml", "Sub-paragraph (HTML allowed)", "html"],
    ["primaryCtaLabel", "Primary button label"], ["primaryCtaUrl", "Primary button URL", "url"],
    ["secondaryCtaLabel", "Secondary button label"],
    ["stat1Value", "Stat 1 value"], ["stat1Label", "Stat 1 label"],
    ["stat2Value", "Stat 2 value"], ["stat2Label", "Stat 2 label"],
    ["stat3Value", "Stat 3 value"], ["stat3Label", "Stat 3 label"],
    ["imageUrl", "Hero background image (override)", "image"]
  ]},
  { group: "marquee", title: "Scrolling marquee", fields: [
    ["words", "Words (comma separated)", "textarea"]
  ]},
  { group: "philosophy", title: "Philosophy", fields: [
    ["eyebrow", "Eyebrow"], ["headingHtml", "Heading (HTML, <em> for gold italic, <br> for lines)", "html"],
    ["leadHtml", "Lead paragraph (HTML)", "html"],
    ["photoUrl", "Portrait photo (override)", "image"], ["photoAlt", "Photo alt text"],
    ["badgeTitle", "Photo badge title"], ["badgeSub", "Photo badge subtitle"]
  ]},
  { group: "practice", title: "Practice heading", fields: [
    ["eyebrow", "Eyebrow"], ["headingHtml", "Heading (HTML)", "html"], ["leadHtml", "Lead (HTML)", "html"]
  ]},
  { group: "journey", title: "Journey", fields: [
    ["eyebrow", "Eyebrow"], ["headingHtml", "Heading (HTML)", "html"],
    ["ctaLabel", "Button label"], ["ctaUrl", "Button URL", "url"]
  ]},
  { group: "band", title: "Fullscript band", fields: [
    ["eyebrow", "Eyebrow"], ["headingHtml", "Heading (HTML)", "html"], ["subHtml", "Paragraph (HTML)", "html"],
    ["ctaLabel", "Button label"], ["ctaUrl", "Button URL", "url"], ["imageUrl", "Background image (override)", "image"]
  ]},
  { group: "quote", title: "Pull quote", fields: [
    ["text", "Quote", "textarea"], ["cite", "Citation"]
  ]},
  { group: "library", title: "Library heading", fields: [
    ["eyebrow", "Eyebrow"], ["headingHtml", "Heading (HTML)", "html"], ["leadHtml", "Lead (HTML)", "html"]
  ]},
  { group: "contact", title: "Contact section", fields: [
    ["eyebrow", "Eyebrow"], ["headingHtml", "Heading (HTML)", "html"], ["leadHtml", "Lead (HTML)", "html"],
    ["calendlyLabel", "Calendly button label"], ["emailLabel", "Email button label"]
  ]}
];

function fieldHtml(group, key, label, type, value) {
  const id = `f-${group}-${key}`;
  const v = esc(value);
  if (type === "textarea" || type === "html") {
    return `<div class="field full" data-field="${group}.${key}">
      <span>${esc(label)}</span>
      <textarea id="${id}" rows="${type === "html" ? 3 : 2}">${v}</textarea>
    </div>`;
  }
  if (type === "image") {
    return `<div class="field" data-field="${group}.${key}">
      <span>${esc(label)}</span>
      <div class="image-field">
        <div class="image-field__preview ${v ? "" : "is-empty"}" data-preview>${v ? `<img src="${v}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : "no image"}</div>
        <input id="${id}" value="${v}" placeholder="/uploads/… or external URL">
        <button type="button" class="btn btn--ghost btn--sm" data-pick>Library</button>
      </div>
    </div>`;
  }
  return `<div class="field" data-field="${group}.${key}">
    <span>${esc(label)}</span>
    <input id="${id}" value="${v}" ${type === "url" ? 'placeholder="https://…"' : ""}>
  </div>`;
}

VIEWS.pages = async () => {
  const v = $("#view");
  v.innerHTML = `<p class="muted">Loading…</p>`;
  const c = await loadContent(true);

  $("#topbarRight").innerHTML = `<button class="btn btn--gold btn--sm" id="savePages">Save all content</button>`;
  $("#savePages").addEventListener("click", savePages);

  v.innerHTML = FIELD_SCHEMA.map((section) => `
    <section class="panel" data-group="${section.group}">
      <h3>${section.title}</h3>
      <p class="panel__hint">Editing the “${section.group}” section</p>
      <div class="field-grid">
        ${section.fields.map(([key, label, type = "text"]) =>
          fieldHtml(section.group, key, label, type, c[section.group]?.[key] ?? "")).join("")}
      </div>
    </section>`).join("") + socialsHtml(c) + hoursHtml(c);

  // image pickers
  v.querySelectorAll("[data-pick]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const wrap = btn.closest(".image-field");
      openMediaPicker({
        filter: (m) => m.mime.startsWith("image"),
        onPick: (m) => {
          wrap.querySelector("input").value = m.url;
          wrap.querySelector("[data-preview]").innerHTML =
            `<img src="${m.url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
          wrap.querySelector("[data-preview]").classList.remove("is-empty");
        }
      });
    });
  });
};

function socialsHtml(c) {
  const rows = (c.site.socials || []).map((s, i) => `
    <div class="social-row" data-i="${i}" style="display:flex;gap:8px;margin-bottom:8px">
      <input data-social-label value="${esc(s.label)}" placeholder="Label" style="max-width:160px">
      <input data-social-url value="${esc(s.url)}" placeholder="https://…">
      <button type="button" class="btn btn--danger btn--sm" data-social-del>Remove</button>
    </div>`).join("");
  return `<section class="panel" data-group="site-socials">
    <h3>Social links</h3>
    <p class="panel__hint">Shown as icon row in the contact section (labels are used for accessibility)</p>
    <div id="socialRows">${rows}</div>
    <button type="button" class="btn btn--ghost btn--sm" id="addSocial">+ Add social link</button>
  </section>`;
}

function hoursHtml(c) {
  const rows = (c.contact.hours || []).map((h, i) => `
    <div class="hours-row" data-i="${i}" style="display:flex;gap:8px;margin-bottom:8px">
      <input data-hours-day value="${esc(h.day)}" placeholder="Day" style="max-width:140px">
      <input data-hours-label value="${esc(h.label)}" placeholder="Hours / status">
      <label class="checkbox-row" style="white-space:nowrap;font-size:12px;color:var(--ink-dim)">
        <input type="checkbox" data-hours-off ${h.off ? "checked" : ""}> Offline
      </label>
      <button type="button" class="btn btn--danger btn--sm" data-hours-del>Remove</button>
    </div>`).join("");
  return `<section class="panel" data-group="contact-hours">
    <h3>Opening hours</h3>
    <p class="panel__hint">Rows shown on the contact card</p>
    <div id="hoursRows">${rows}</div>
    <button type="button" class="btn btn--ghost btn--sm" id="addHours">+ Add row</button>
  </section>`;
}

async function savePages() {
  const btn = $("#savePages");
  btn.disabled = true; btn.textContent = "Saving…";
  try {
    const payload = {};
    document.querySelectorAll("[data-field]").forEach((el) => {
      const [group, key] = el.dataset.field.split(".");
      (payload[group] ||= {})[key] = el.querySelector("input,textarea").value;
    });
    // socials
    payload.site ||= {};
    payload.site.socials = [...document.querySelectorAll(".social-row")].map((row) => ({
      label: row.querySelector("[data-social-label]").value.trim(),
      url: row.querySelector("[data-social-url]").value.trim()
    })).filter((s) => s.label || s.url);
    // hours
    payload.contact ||= {};
    payload.contact.hours = [...document.querySelectorAll(".hours-row")].map((row) => ({
      day: row.querySelector("[data-hours-day]").value.trim(),
      label: row.querySelector("[data-hours-label]").value.trim(),
      off: row.querySelector("[data-hours-off]").checked
    })).filter((h) => h.day || h.label);

    await api("/content", { method: "PUT", body: payload });
    state.content = null;
    toast("All content saved — refresh the website to see it");
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = "Save all content";
  }
}

/* Repeating social / hours rows are wired each render via delegation */
document.addEventListener("click", (e) => {
  if (e.target.id === "addSocial") {
    const wrap = document.createElement("div");
    wrap.className = "social-row";
    wrap.style.cssText = "display:flex;gap:8px;margin-bottom:8px";
    wrap.innerHTML = `<input data-social-label placeholder="Label" style="max-width:160px">
      <input data-social-url placeholder="https://…">
      <button type="button" class="btn btn--danger btn--sm" data-social-del>Remove</button>`;
    $("#socialRows").appendChild(wrap);
  }
  if (e.target.hasAttribute("data-social-del")) e.target.closest(".social-row").remove();
  if (e.target.id === "addHours") {
    const wrap = document.createElement("div");
    wrap.className = "hours-row";
    wrap.style.cssText = "display:flex;gap:8px;margin-bottom:8px";
    wrap.innerHTML = `<input data-hours-day placeholder="Day" style="max-width:140px">
      <input data-hours-label placeholder="Hours / status">
      <label class="checkbox-row" style="white-space:nowrap;font-size:12px;color:var(--ink-dim)">
        <input type="checkbox" data-hours-off> Offline
      </label>
      <button type="button" class="btn btn--danger btn--sm" data-hours-del>Remove</button>`;
    $("#hoursRows").appendChild(wrap);
  }
  if (e.target.hasAttribute("data-hours-del")) e.target.closest(".hours-row").remove();
});

/* ---------------- Generic collections ---------------- */
const COLLECTION_CONFIG = {
  services: {
    title: "Services — the six disciplines",
    hint: "Shown as the practice grid. Cards reflow automatically as you add, remove or reorder.",
    newLabel: "+ Add service",
    fields: [
      ["icon", "Icon", "icon"],
      ["title", "Title"],
      ["body", "Description", "textarea"]
    ]
  },
  pillars: {
    title: "Philosophy pillars",
    hint: "The B / P / S biopsychosocial rows. Keep the letter to a single initial.",
    newLabel: "+ Add pillar",
    fields: [
      ["letter", "Circle letter"],
      ["title", "Title"],
      ["body", "Description", "textarea"]
    ]
  },
  steps: {
    title: "Journey steps",
    hint: "The four stages, shown left to right (numbers are generated automatically).",
    newLabel: "+ Add step",
    fields: [
      ["title", "Title"],
      ["body", "Description", "textarea"]
    ]
  },
  resources: {
    title: "Library resources",
    hint: "Free guides, PDFs and links. Use Library to link an uploaded PDF, or paste an external URL.",
    newLabel: "+ Add resource",
    fields: [
      ["tag", "Tag pill (e.g. Guide)"],
      ["title", "Title"],
      ["body", "Description", "textarea"],
      ["meta", "Meta line (e.g. PDF · 2025)"],
      ["url", "Link", "media-link"],
      ["wide", "Full-width card", "checkbox"]
    ]
  }
};

function itemField(name, cfg, value) {
  const [key, label, type = "text"] = cfg;
  if (type === "textarea") {
    return `<label><span>${label}</span><textarea name="${key}" rows="3">${esc(value)}</textarea></label>`;
  }
  if (type === "checkbox") {
    return `<label class="checkbox-row"><input type="checkbox" name="${key}" ${value ? "checked" : ""}> ${label}</label>`;
  }
  if (type === "icon") {
    return `<label><span>${label}</span>
      <div class="icon-swatches">
        ${SERVICE_ICONS.map((ic) => `
          <label><input type="radio" name="icon" value="${ic}" ${value === ic ? "checked" : ""}> ${ic}</label>`).join("")}
      </div></label>`;
  }
  if (type === "media-link") {
    return `<label><span>${label}</span>
      <div class="image-field">
        <input name="${key}" value="${esc(value)}" placeholder="/uploads/… or https://…">
        <button type="button" class="btn btn--ghost btn--sm" data-pick-file>Library</button>
      </div></label>`;
  }
  return `<label><span>${label}</span><input name="${key}" value="${esc(value)}"></label>`;
}

function renderCollection(name) {
  const cfg = COLLECTION_CONFIG[name];
  return async () => {
    const v = $("#view");
    v.innerHTML = `<p class="muted">Loading…</p>`;
    $("#topbarRight").innerHTML = `<button class="btn btn--gold btn--sm" id="addItem">${cfg.newLabel}</button>`;
    $("#addItem").addEventListener("click", async () => {
      await api(`/collections/${name}`, { method: "POST", body: { title: "New item", body: "", icon: "target" } });
      draw();
    });

    async function draw() {
      const { items } = await api(`/collections/${name}`);
      v.innerHTML = `
        <div class="section-row"><p class="muted" style="margin:0">${cfg.hint}</p></div>
        ${items.length ? items.map((item) => `
          <div class="item" data-id="${item.id}">
            <div class="item__head">
              <span class="item__title">${esc(item.title || "Untitled")}</span>
              <span class="item__actions">
                <button class="btn btn--ghost btn--sm" data-move="up" title="Move up">↑</button>
                <button class="btn btn--ghost btn--sm" data-move="down" title="Move down">↓</button>
                <button class="btn btn--ghost btn--sm" data-edit>Edit</button>
                <button class="btn btn--danger btn--sm" data-del>Delete</button>
              </span>
            </div>
            ${item.body ? `<p class="item__body">${esc(item.body.slice(0, 120))}${item.body.length > 120 ? "…" : ""}</p>` : ""}
            <form class="item-form">
              ${cfg.fields.map((f) => itemField(name, f, item[f[0]])).join("")}
              <div class="item__actions" style="margin-top:12px">
                <button type="submit" class="btn btn--gold btn--sm">Save item</button>
                <button type="button" class="btn btn--ghost btn--sm" data-cancel>Done</button>
              </div>
            </form>
          </div>`).join("") : `<div class="empty">Nothing here yet.</div>`}`;

      v.querySelectorAll(".item").forEach((card) => {
        const id = card.dataset.id;
        card.querySelector("[data-edit]").addEventListener("click", () => card.classList.toggle("is-open"));
        card.querySelector("[data-cancel]").addEventListener("click", () => card.classList.remove("is-open"));
        card.querySelector("[data-move='up']").addEventListener("click", async () => {
          await api(`/collections/${name}/${id}/move`, { method: "POST", body: { dir: "up" } }); draw();
        });
        card.querySelector("[data-move='down']").addEventListener("click", async () => {
          await api(`/collections/${name}/${id}/move`, { method: "POST", body: { dir: "down" } }); draw();
        });
        card.querySelector("[data-del]").addEventListener("click", async () => {
          if (!confirm("Delete this item? This cannot be undone.")) return;
          await api(`/collections/${name}/${id}`, { method: "DELETE" }); draw();
        });
        const pickBtn = card.querySelector("[data-pick-file]");
        if (pickBtn) pickBtn.addEventListener("click", () => openMediaPicker({
          onPick: (m) => { card.querySelector("input[name='url']").value = m.url; }
        }));
        card.querySelector("form").addEventListener("submit", async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          const body = {};
          cfg.fields.forEach(([key, , type]) => {
            body[key] = type === "checkbox" ? !!fd.get(key) : (fd.get(key) ?? "");
          });
          try {
            await api(`/collections/${name}/${id}`, { method: "PUT", body });
            toast("Saved"); draw();
          } catch (err) { toast(err.message, true); }
        });
      });
    }
    draw();
  };
}
VIEWS.services = renderCollection("services");
VIEWS.pillars = renderCollection("pillars");
VIEWS.steps = renderCollection("steps");
VIEWS.resources = renderCollection("resources");

/* ---------------- Posts ---------------- */
VIEWS.posts = async () => {
  const v = $("#view");
  v.innerHTML = `<p class="muted">Loading…</p>`;
  $("#topbarRight").innerHTML = `<a class="btn btn--gold btn--sm" href="#" id="newPost">+ New post</a>`;
  $("#newPost").addEventListener("click", (e) => { e.preventDefault(); go("post-new"); });
  const { posts } = await api("/posts");
  v.innerHTML = posts.length ? posts.map((p) => `
    <div class="item" data-id="${p.id}">
      <div class="item__head">
        <span class="item__title">${esc(p.title)}</span>
        <span class="tag-pill ${p.status === "draft" ? "tag-draft" : ""}">${p.status}</span>
        <span class="item__meta">/${esc(p.slug)}</span>
        <span class="item__meta">${esc(p.publishedAt || "draft")}</span>
        <span class="item__actions">
          ${p.status === "published" ? `<a class="btn btn--ghost btn--sm" href="/blog.html?slug=${esc(p.slug)}" target="_blank">View ↗</a>` : ""}
          <button class="btn btn--ghost btn--sm" data-edit>Edit</button>
          <button class="btn btn--danger btn--sm" data-del>Delete</button>
        </span>
      </div>
      ${p.excerpt ? `<p class="item__body">${esc(p.excerpt.slice(0, 140))}</p>` : ""}
    </div>`).join("") : `<div class="empty">No posts yet — your first article is one click away.</div>`;

  v.querySelectorAll(".item").forEach((card) => {
    card.querySelector("[data-edit]").addEventListener("click", () => go("post-edit", Number(card.dataset.id)));
    card.querySelector("[data-del]").addEventListener("click", async () => {
      if (!confirm("Delete this post permanently?")) return;
      await api(`/posts/${card.dataset.id}`, { method: "DELETE" });
      go("posts");
    });
  });
};

VIEWS["post-new"] = () => renderPostEditor(null);
VIEWS["post-edit"] = (id) => renderPostEditor(state.param || id);

async function renderPostEditor(id) {
  const v = $("#view");
  v.innerHTML = `<p class="muted">Loading…</p>`;
  const media = await loadMedia();
  const images = media.filter((m) => m.mime.startsWith("image"));
  let post = { title: "", slug: "", excerpt: "", body: "", tags: "", status: "draft", publishedAt: "", cover_media_id: null, coverUrl: "" };
  if (id) {
    const data = await api(`/posts/${id}`);
    post = { ...data.post, tags: data.post.tagsList.join(", ") };
  }

  $("#viewTitle").textContent = id ? "Edit post" : "New post";
  $("#topbarRight").innerHTML = `<button class="btn btn--ghost btn--sm" id="backPosts">← All posts</button>`;
  $("#backPosts").addEventListener("click", () => go("posts"));

  v.innerHTML = `
    <form class="post-editor" id="postForm">
      <div class="panel">
        <div class="field-grid">
          <div class="field full"><span>Title</span><input name="title" value="${esc(post.title)}" required></div>
          <div class="field"><span>Slug (URL)</span><input name="slug" value="${esc(post.slug)}" placeholder="auto-generated from title"></div>
          <div class="field"><span>Publish date</span><input type="date" name="publishedAt" value="${esc((post.publishedAt || "").slice(0, 10))}"></div>
          <div class="field"><span>Tags (comma separated)</span><input name="tags" value="${esc(post.tags)}"></div>
          <div class="field">
            <span>Cover image</span>
            <div class="image-field">
              <div class="image-field__preview ${post.coverUrl ? "" : "is-empty"}" data-cover-preview>
                ${post.coverUrl ? `<img src="${post.coverUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : "no image"}
              </div>
              <select name="coverMediaId">
                <option value="">— None —</option>
                ${images.map((m) => `<option value="${m.id}" ${m.id === post.cover_media_id ? "selected" : ""}>${esc(m.original_name)}</option>`).join("")}
              </select>
            </div>
            ${images.length ? "" : '<p class="hint">Upload an image in the Media Library first.</p>'}
          </div>
          <div class="field full"><span>Excerpt (shown on cards and in search results)</span><textarea name="excerpt" rows="2">${esc(post.excerpt)}</textarea></div>
        </div>
      </div>

      <div class="panel">
        <h3>Body — Markdown</h3>
        <p class="panel__hint">## heading · **bold** · *italic* · [link](https://…) · - list item · blank line between paragraphs</p>
        <div class="markdown-toolbar" id="mdBar">
          <button type="button" data-md="## ">H2</button>
          <button type="button" data-md="### ">H3</button>
          <button type="button" data-md="bold">Bold</button>
          <button type="button" data-md="italic">Italic</button>
          <button type="button" data-md="link">Link</button>
          <button type="button" data-md="list">List</button>
          <button type="button" data-toggle-preview type="button">Preview</button>
        </div>
        <div class="md-grid">
          <textarea name="body" id="mdBody" placeholder="Write here…">${esc(post.body)}</textarea>
          <div class="md-preview" id="mdPreview" hidden></div>
        </div>
        <div class="post-actions">
          <button type="submit" class="btn btn--gold" name="status" value="published">${id ? "Update" : "Publish"} post</button>
          <button type="submit" class="btn btn--ghost" name="status" value="draft">Save draft</button>
          <label class="checkbox-row" style="margin-left:auto;font-size:12.5px;color:var(--ink-dim)">
            Status: <strong id="statusLabel" style="color:var(--gold-2)">${post.status}</strong>
          </label>
        </div>
      </div>
    </form>`;

  const form = $("#postForm");
  const bodyTa = $("#mdBody");
  const preview = $("#mdPreview");
  let previewOn = false;
  let previewTimer;

  async function refreshPreview() {
    const { bodyHtml } = await api("/posts/preview", { method: "POST", body: { body: bodyTa.value } });
    preview.innerHTML = bodyHtml || '<p class="muted">Nothing to preview yet.</p>';
  }
  bodyTa.addEventListener("input", () => {
    if (!previewOn) return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(refreshPreview, 250);
  });

  $("#mdBar").querySelectorAll("[data-md]").forEach((b) => b.addEventListener("click", () => {
    const start = bodyTa.selectionStart, end = bodyTa.selectionEnd;
    const sel = bodyTa.value.slice(start, end) || "text";
    const action = b.dataset.md;
    let insert;
    if (action === "bold") insert = `**${sel}**`;
    else if (action === "italic") insert = `*${sel}*`;
    else if (action === "link") insert = `[${sel}](https://)`;
    else if (action === "list") insert = `- ${sel}`;
    else insert = action + sel;
    bodyTa.setRangeText(insert, start, end, "end");
    bodyTa.focus();
  }));
  const previewBtn = document.querySelector("[data-toggle-preview]");
  previewBtn.addEventListener("click", async () => {
    previewOn = !previewOn;
    preview.hidden = !previewOn;
    previewBtn.textContent = previewOn ? "Edit" : "Preview";
    if (previewOn) await refreshPreview();
  });

  form.querySelector('[name="coverMediaId"]').addEventListener("change", (e) => {
    const m = images.find((x) => x.id === Number(e.target.value));
    const box = $("[data-cover-preview]");
    if (m) {
      box.innerHTML = `<img src="${m.url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
      box.classList.remove("is-empty");
    } else {
      box.innerHTML = "no image";
      box.classList.add("is-empty");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitter = e.submitter;
    const fd = new FormData(form);
    const payload = {
      title: fd.get("title"),
      slug: fd.get("slug"),
      excerpt: fd.get("excerpt"),
      body: fd.get("body"),
      tags: fd.get("tags"),
      coverMediaId: fd.get("coverMediaId") || null,
      publishedAt: fd.get("publishedAt") || null,
      status: submitter?.value || "draft"
    };
    $("#statusLabel").textContent = payload.status;
    try {
      if (id) await api(`/posts/${id}`, { method: "PUT", body: payload });
      else {
        const { post: created } = await api("/posts", { method: "POST", body: payload });
        id = created.id;
      }
      toast(payload.status === "published" ? "Published — live on the Journal page" : "Draft saved");
      go("posts");
    } catch (err) { toast(err.message, true); }
  });
}

/* ---------------- Media library ---------------- */
VIEWS.media = () => {
  const v = $("#view");
  v.innerHTML = `
    <div class="dropzone" id="dropzone">
      <strong>Click to choose files</strong> or drag images / PDFs here (max 16 MB each)
      <input type="file" id="fileInput" multiple accept="image/*,application/pdf" hidden>
    </div>
    <div class="media-grid" id="mediaGrid"><p class="muted">Loading…</p></div>`;

  const dz = $("#dropzone");
  const input = $("#fileInput");
  dz.addEventListener("click", () => input.click());
  input.addEventListener("change", () => uploadFiles(input.files));
  ["dragover", "dragenter"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("is-over"); }));
  dz.addEventListener("drop", (e) => uploadFiles(e.dataTransfer.files));

  async function uploadFiles(files) {
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try { await api("/upload", { method: "POST", body: fd }); }
      catch (err) { toast(`${file.name}: ${err.message}`, true); }
    }
    toast("Upload complete");
    draw();
  }

  async function draw() {
    const media = await loadMedia(true);
    const grid = $("#mediaGrid");
    if (!media.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">No files uploaded yet.</div>`;
      return;
    }
    grid.innerHTML = media.map((m) => `
      <div class="media-card" data-id="${m.id}">
        <div class="media-card__preview">
          ${m.mime.startsWith("image")
            ? `<img src="${m.url}" alt="${esc(m.original_name)}">`
            : `<span class="media-card__pdf">📄</span>`}
        </div>
        <div class="media-card__info">
          <span class="media-card__name" title="${esc(m.original_name)}">${esc(m.original_name)}</span>
          <div class="media-card__actions">
            <button class="btn btn--ghost btn--sm" data-copy data-url="${m.url}">Copy URL</button>
            <a class="btn btn--ghost btn--sm" href="${m.url}" target="_blank">Open</a>
            <button class="btn btn--danger btn--sm" data-del>Delete</button>
          </div>
        </div>
      </div>`).join("");

    grid.querySelectorAll(".media-card").forEach((card) => {
      card.querySelector("[data-copy]").addEventListener("click", async (e) => {
        try {
          await navigator.clipboard.writeText(e.target.dataset.url);
          toast("URL copied to clipboard");
        } catch { toast(e.target.dataset.url); }
      });
      card.querySelector("[data-del]").addEventListener("click", async () => {
        if (!confirm("Delete this file? Posts or links pointing to it will break.")) return;
        await api(`/media/${card.dataset.id}`, { method: "DELETE" });
        draw();
      });
    });
  }
  draw();
};

/* ---------------- Enquiries ---------------- */
VIEWS.enquiries = async () => {
  const v = $("#view");
  v.innerHTML = `<p class="muted">Loading…</p>`;
  const { enquiries } = await api("/enquiries");
  state.unread = enquiries.filter((e) => !e.is_read).length;
  renderNav();

  if (!enquiries.length) {
    v.innerHTML = `<div class="empty">No enquiries yet.</div>`;
    return;
  }
  v.innerHTML = enquiries.map((e) => `
    <div class="item enquiry ${e.is_read ? "" : "is-unread"}" data-id="${e.id}">
      <div class="enquiry__head">
        ${e.is_read ? "" : '<span class="dot"></span>'}
        <span class="enquiry__name">${esc(e.name)}</span>
        <span class="enquiry__email"><a href="mailto:${esc(e.email)}">${esc(e.email)}</a></span>
        <span class="enquiry__date">${esc(e.created_at)}</span>
        <span class="item__actions">
          <button class="btn btn--ghost btn--sm" data-toggle>${e.is_read ? "Mark unread" : "Mark read"}</button>
          <button class="btn btn--danger btn--sm" data-del>Delete</button>
        </span>
      </div>
      <p class="enquiry__msg">${esc(e.message)}</p>
    </div>`).join("");

  v.querySelectorAll(".enquiry").forEach((card) => {
    card.querySelector("[data-toggle]").addEventListener("click", async () => {
      const isUnread = card.classList.contains("is-unread");
      await api(`/enquiries/${card.dataset.id}`, { method: "PATCH", body: { isRead: !isUnread } });
      go("enquiries");
    });
    card.querySelector("[data-del]").addEventListener("click", async () => {
      if (!confirm("Delete this enquiry?")) return;
      await api(`/enquiries/${card.dataset.id}`, { method: "DELETE" });
      go("enquiries");
    });
  });
};

/* ---------------- Settings ---------------- */
VIEWS.settings = () => {
  const v = $("#view");
  v.innerHTML = `
    <section class="panel" style="max-width:520px">
      <h3>Account</h3>
      <p class="panel__hint">Signed in as <strong>admin</strong>. Use a strong, unique password.</p>
      <form id="pwForm" style="display:flex;flex-direction:column;gap:14px">
        <label><span>Current password</span><input type="password" name="currentPassword" required></label>
        <label><span>New password (at least 10 characters)</span><input type="password" name="newPassword" minlength="10" required></label>
        <p class="form-error" id="pwMsg"></p>
        <button class="btn btn--gold" type="submit" style="align-self:flex-start">Update password</button>
      </form>
    </section>
    <section class="panel" style="max-width:520px">
      <h3>About this CMS</h3>
      <p class="muted" style="font-size:13px">
        Content is stored in a local SQLite database (<code>server/data/glenmonks.db</code>).
        Uploaded files live in <code>server/uploads/</code>. Back both up by copying those two items.
      </p>
    </section>`;
  $("#pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const msg = $("#pwMsg");
    msg.className = "form-error"; msg.textContent = "";
    try {
      const r = await api("/password", {
        method: "PUT",
        body: { currentPassword: fd.get("currentPassword"), newPassword: fd.get("newPassword") }
      });
      if (r.reauth) {
        await api("/logout", { method: "POST" });
        location.reload();
      } else {
        toast("Password updated");
      }
    } catch (err) { msg.textContent = err.message; }
  });
};

/* ============================================================
   BOOT — login gate
   ============================================================ */
$("#logoutBtn").addEventListener("click", async () => {
  await api("/logout", { method: "POST" });
  location.reload();
});

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const err = $("#loginError");
  err.textContent = "";
  try {
    await api("/login", {
      method: "POST",
      body: { username: fd.get("username"), password: fd.get("password") }
    });
    boot();
  } catch (ex) {
    err.textContent = ex.message;
  }
});

async function boot() {
  try {
    const me = await api("/me");
    $("#login").hidden = true;
    $("#app").hidden = false;
    go("dashboard");
  } catch {
    $("#login").hidden = false;
    $("#app").hidden = true;
  }
}
boot();
