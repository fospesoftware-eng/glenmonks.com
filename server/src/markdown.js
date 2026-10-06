/* ============================================================
   Tiny, safe Markdown → HTML (no dependencies)
   Supports headings, bold/italic, links, lists, quotes, rules,
   paragraphs. All raw HTML is escaped first.
   ============================================================ */

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeHref(url) {
  const u = String(url).trim();
  if (/^(https?:|mailto:|\/|\.\/|#)/i.test(u)) return u;
  return "#";
}

function inline(text) {
  let out = escapeHtml(text);
  // inline code
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // links [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) =>
    `<a href="${safeHref(url)}" rel="noopener">${label}</a>`);
  // bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  return out;
}

export function renderMarkdown(src) {
  const lines = String(src || "").replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let list = null;       // 'ul' | 'ol'
  let quote = false;
  let para = [];

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeList = () => { if (list) { html.push(`</${list}>`); list = null; } };
  const closeQuote = () => { if (quote) { flushPara(); html.push("</blockquote>"); quote = false; } };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) { flushPara(); closeList(); closeQuote(); continue; }

    if (line === "---" || line === "***") {
      flushPara(); closeList(); closeQuote();
      html.push("<hr>");
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara(); closeList(); closeQuote();
      const level = h[1].length + 1; // ## → h3 keeps post titles as the h1
      html.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushPara(); closeList();
      if (!quote) { html.push("<blockquote>"); quote = true; }
      para.push(line.replace(/^>\s?/, ""));
      continue;
    }
    closeQuote();

    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const type = ul ? "ul" : "ol";
      if (list !== type) { closeList(); html.push(`<${type}>`); list = type; }
      html.push(`<li>${inline((ul || ol)[1])}</li>`);
      continue;
    }
    closeList();
    para.push(line);
  }
  flushPara(); closeList(); closeQuote();
  return html.join("\n");
}

/* Plain-text excerpt for cards */
export function toExcerpt(src, max = 180) {
  const text = String(src || "")
    .replace(/^#{1,6}\s+/gm, "").replace(/[*_`>\-\[\]]/g, "")
    .replace(/\]\(([^)]+)\)/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}
