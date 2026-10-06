/* ============================================================
   Glen Monks Journal — listing + ?slug= article rendering
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("journalRoot");

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  }

  function getSlug() {
    var p = new URLSearchParams(window.location.search).get("slug");
    return p ? String(p).trim() : "";
  }

  /* ---------------- Listing ---------------- */
  function renderList() {
    document.title = "The Journal — Glen Monks";
    root.innerHTML =
      '<header class="section__head journal__head">' +
        '<p class="eyebrow"><span class="eyebrow__num">✦</span> The Journal</p>' +
        '<h1 class="h2">Notes from <em>the practice.</em></h1>' +
        '<p class="lead section__head-sub">Articles on functional therapy, mind-body work, nutrition and the business of putting yourself back together.</p>' +
      '</header>' +
      '<div class="journal__grid" id="postGrid"><p class="muted">Loading articles…</p></div>';

    fetch("/api/posts?limit=50")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var posts = data.posts || [];
        var grid = document.getElementById("postGrid");
        if (!posts.length) {
          grid.innerHTML = '<div class="journal__empty" style="grid-column:1/-1">Articles are on their way — please check back soon.</div>';
          return;
        }
        grid.innerHTML = posts.map(function (p) {
          var tag = (p.tags && p.tags[0]) ? esc(p.tags[0]) : "Article";
          return '<a class="post-card" href="blog.html?slug=' + encodeURIComponent(p.slug) + '">' +
            (p.coverUrl
              ? '<div class="post-card__cover"><img src="' + esc(p.coverUrl) + '" alt="' + esc(p.title) + '" loading="lazy"></div>'
              : "") +
            '<div class="post-card__body">' +
              '<div class="post-card__meta"><span>' + formatDate(p.publishedAt) + '</span>' +
                '<span class="dot-gold"></span><span>' + tag + "</span></div>" +
              '<h2 class="post-card__title">' + esc(p.title) + "</h2>" +
              (p.excerpt ? '<p class="post-card__excerpt">' + esc(p.excerpt) + "</p>" : "") +
              '<span class="post-card__more">Read article →</span>' +
            "</div></a>";
        }).join("");
      })
      .catch(function () {
        document.getElementById("postGrid").innerHTML =
          '<div class="journal__empty" style="grid-column:1/-1">The journal is temporarily unavailable. Please try again shortly.</div>';
      });
  }

  /* ---------------- Article ---------------- */
  function renderArticle(slug) {
    root.innerHTML = '<div class="article__inner"><p class="muted">Loading…</p></div>';
    fetch("/api/posts/" + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error("not-found");
        return r.json();
      })
      .then(function (data) {
        var p = data.post;
        document.title = p.title + " — Glen Monks";
        var meta = document.querySelector('meta[name="description"]');
        if (meta && p.excerpt) meta.setAttribute("content", p.excerpt);

        root.innerHTML =
          '<article class="article__inner">' +
            '<a class="article__back" href="blog.html">← All articles</a>' +
            '<div class="article__meta"><span>' + formatDate(p.publishedAt) + "</span>" +
              (p.tags && p.tags.length ? '<span>·</span><span>' + esc(p.tags.join(" · ")) + "</span>" : "") +
            "</div>" +
            '<h1 class="article__title">' + esc(p.title) + "</h1>" +
            (p.excerpt ? '<p class="article__excerpt">' + esc(p.excerpt) + "</p>" : "") +
            (p.coverUrl ? '<figure class="article__cover"><img src="' + esc(p.coverUrl) + '" alt="' + esc(p.title) + '"></figure>' : "") +
            '<div class="article__body">' + p.bodyHtml + "</div>" +
            (p.tags && p.tags.length
              ? '<div class="article__tags">' + p.tags.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>"
              : "") +
          "</article>";
        root.parentElement.classList.remove("journal");
        root.parentElement.classList.add("article");
        window.scrollTo(0, 0);
      })
      .catch(function () {
        root.innerHTML =
          '<div class="article__inner">' +
            '<a class="article__back" href="blog.html">← All articles</a>' +
            '<div class="journal__empty"><h2 class="h2" style="margin-bottom:12px">Article not found</h2>' +
            '<p class="muted">It may have been moved or unpublished.</p></div>' +
          "</div>";
      });
  }

  var slug = getSlug();
  if (slug) renderArticle(slug); else renderList();
})();
