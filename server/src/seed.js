/* ============================================================
   Seed data — the site's current copy, captured from index.html
   Runs on first boot; `npm run seed` forces a content reset
   ============================================================ */
import { db, setKv } from "./db.js";
import { hashPassword } from "./passwords.js";

const content = {
  site: {
    brandName: "Glen Monks",
    tagline: "Functional Therapist",
    calendlyUrl: "https://calendly.com/gmsoulfood",
    fullscriptUrl: "https://us.fullscript.com/welcome/gmonks",
    email: "gmsoulfood@gmail.com",
    phone: "+44 7951 138 579",
    phoneHref: "tel:+447951138579",
    addressLine1: "11 Long Close, Bessacarr",
    addressLine2: "Doncaster, United Kingdom",
    location: "Doncaster · England",
    footerNote: "Glen Monks · Mind Body Matters",
    seoTitle: "Glen Monks — Functional Therapist · Mind, Body, Break Free",
    seoDescription:
      "Glen Monks is a functional therapist and mind-body coach in Doncaster, England. Holistic testing across the biological, psychological and social dimensions of your life — with yoga, meditation, somatic movement, nutrition and practitioner-grade supplements.",
    socials: [
      { label: "Instagram", url: "https://www.instagram.com/mind_body_matters/" },
      { label: "Facebook", url: "https://www.facebook.com/glenmonksmindbodymatters" },
      { label: "LinkedIn", url: "https://www.linkedin.com/in/glen-monks-442bb215/" },
      { label: "YouTube", url: "https://www.youtube.com/channel/UCbBExzbKyrAyxzKFDK4moPA" },
      { label: "Linktree", url: "https://linktr.ee/mind_body_matters" }
    ]
  },

  hero: {
    eyebrow: "Functional Therapy & Mind–Body Coaching · Doncaster, England",
    line1: "Where the",
    line2: "mind & body",
    line3: "break free.",
    subHtml:
      'Using the latest research in holistic testing, I analyse the <strong>biological</strong>, <strong>psychological</strong> and <strong>social</strong> dimensions of your life — uncovering root causes and charting a calmer, stronger way forward.',
    primaryCtaLabel: "Begin — free 30-minute call",
    primaryCtaUrl: "https://calendly.com/gmsoulfood",
    secondaryCtaLabel: "Explore the practice",
    stat1Value: "20+", stat1Label: "Years of practice",
    stat2Value: "6",  stat2Label: "Integrated disciplines",
    stat3Value: "3",  stat3Label: "Countries served",
    imageUrl: ""
  },

  marquee: {
    words: "Functional Therapy, Somatic Movement, Yoga, Meditation, Primal Nutrition, Holistic Lab Testing, Mind–Body Coaching"
  },

  philosophy: {
    eyebrow: "The Philosophy",
    headingHtml: "You are not broken.<br>You are a <em>living system</em><br>waiting to be understood.",
    leadHtml:
      "Symptoms are messages. Through the lens of the <strong>biopsychosocial model</strong>, every layer of your experience is read together — body chemistry, inner world, and the life that surrounds you — so healing stops being a guessing game.",
    photoUrl: "",
    photoAlt: "Glen Monks, functional therapist, in a wooded setting",
    badgeTitle: "Est. 2005",
    badgeSub: "Two decades of practice"
  },

  practice: {
    eyebrow: "The Practice",
    headingHtml: "Six disciplines.<br><em>One coherent path.</em>",
    leadHtml: "Each is offered on its own — and all of them speak to each other."
  },

  journey: {
    eyebrow: "The Journey",
    headingHtml: "From first breath<br><em>to lasting change.</em>",
    ctaLabel: "Take the first step",
    ctaUrl: "https://calendly.com/gmsoulfood"
  },

  band: {
    eyebrow: "Fullscript Dispensary",
    headingHtml: "Nature's pharmacy,<br><em>prescribed with precision.</em>",
    subHtml:
      "Professional-grade supplements from a practitioner you already know. A direct, discounted ordering service — shipped across the <strong>United Kingdom, United States and Canada</strong>.",
    ctaLabel: "Open the Fullscript store",
    ctaUrl: "https://us.fullscript.com/welcome/gmonks",
    imageUrl: ""
  },

  quote: {
    text: "Health is not the absence of symptoms. It is the full expression of the person you were always meant to be.",
    cite: "The GlenMonks philosophy"
  },

  library: {
    eyebrow: "The Library",
    headingHtml: "Words, free.<br><em>Take them with you.</em>",
    leadHtml: "Publications and guides written from the practice — every one of them complimentary."
  },

  contact: {
    eyebrow: "Begin",
    headingHtml: "Your first session<br><em>is on me.</em>",
    leadHtml:
      "Thirty minutes, freely given. Tell me where you are — we will leave you with a clearer picture and, if you want one, a plan.",
    calendlyLabel: "Schedule on Calendly",
    emailLabel: "gmsoulfood@gmail.com",
    hours: [
      { day: "Mon – Fri", label: "10:00 – 19:00", off: false },
      { day: "Saturday", label: "Half day", off: false },
      { day: "Sunday", label: "Offline", off: true }
    ]
  }
};

const pillars = [
  { letter: "B", title: "Biological", body: "Holistic lab analysis, nutrition, movement, sleep and practitioner-grade supplementation." },
  { letter: "P", title: "Psychological", body: "Stress responses, thought patterns, trauma and a meditation practice built for real life." },
  { letter: "S", title: "Social", body: "Relationships, purpose, environment and the quiet weight — or support — of community." }
];

const services = [
  { icon: "target",  title: "Functional Therapy & Testing", body: "Advanced holistic lab analysis — including Organic Acids Testing — to decode what your biochemistry is actually saying." },
  { icon: "feather", title: "Somatic Movement Therapy", body: "Therapeutic movement that meets held tension in the body itself — and gently rewires the patterns stored there." },
  { icon: "pose",    title: "Yoga & Meditation", body: "Yoga Alliance–accredited teaching and an un-mystical, practical meditation for the life you actually live." },
  { icon: "bulb",    title: "Mind–Body Coaching", body: "One-to-one work across stress, habits and identity — the bridge between understanding yourself and changing your life." },
  { icon: "bottle",  title: "Nutrition & Supplementation", body: "Primal-nutrition principles and professional-grade Fullscript supplements, delivered at a discount to the UK, USA & Canada." },
  { icon: "community", title: "Trauma-Informed Community", body: "Connection, events and resources through Greenheart — a community built on safety, trust and shared humanity." }
];

const steps = [
  { title: "Begin", body: "A free thirty-minute conversation. No commitment — just a clear sense of whether this work is right for you." },
  { title: "Investigate", body: "A full case history and holistic lab testing, including organic acids analysis where it serves you." },
  { title: "Understand", body: "Your own biopsychosocial map — what is happening, why it is happening, and what your body is asking for." },
  { title: "Restore", body: "A living plan across nutrition, movement, meditation and coaching — adjusted as your system responds." }
];

const resources = [
  { tag: "Free Course",  title: "The Wildlife — Emotional Survival Kit", body: "A practical field guide for moving through difficult emotion and coming out the other side intact.", meta: "PDF · 2025", url: "https://glenmonks.com/wp-content/uploads/2025/04/THE-WILDLIFE-Emotional-Survival-Kit.pdf", wide: 0 },
  { tag: "Magazine",     title: "Good Mood Food", body: "What to eat for a steadier mind — the connection between the plate and the way you think, made edible.", meta: "PDF · Download", url: "https://glenmonks.com/wp-content/uploads/2023/12/Good-Mood-Food-Mag-GM.pdf", wide: 0 },
  { tag: "Publication",  title: "Mind Body Matters", body: "The flagship publication — the research, reasoning and stories behind the biopsychosocial approach.", meta: "PDF · Download", url: "https://d1fdloi71mui9q.cloudfront.net/SZlYhbu7TQ2tulJCoqvF_Mind%20Body%20Matters.pdf", wide: 0 },
  { tag: "Guide",        title: "Meditation Is Not What You Think", body: "A compact guide that dismantles the myths and hands you a practice that actually fits your day.", meta: "PDF · Compact Ed.", url: "https://glenmonks.com/wp-content/uploads/2023/08/Compact-Meditation-is-NOT-what-you-think.pdf", wide: 0 },
  { tag: "Community",    title: "Greenheart — Trauma-Informed Community", body: "Healing does not happen in isolation. Explore the wider community, its gatherings and its support.", meta: "greenheartcommunity.org", url: "https://www.greenheartcommunity.org/", wide: 1 }
];

export function seedDatabase({ force = false } = {}) {
  db.exec("BEGIN");
  try {
    if (force) {
      db.exec("DELETE FROM sessions; DELETE FROM posts; DELETE FROM resources; DELETE FROM steps; DELETE FROM services; DELETE FROM pillars; DELETE FROM kv;");
      const users = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
      if (users === 0) {
        db.prepare("INSERT INTO users (username, pass_hash) VALUES (?, ?)")
          .run("admin", hashPassword("glenmonks2026"));
      }
    } else {
      db.prepare("INSERT OR IGNORE INTO users (username, pass_hash) VALUES (?, ?)")
        .run("admin", hashPassword("glenmonks2026"));
    }

    for (const [key, value] of Object.entries(content)) setKv(key, value);

    const insCollection = (table, rows) => {
      const cols = Object.keys(rows[0]);
      const placeholders = ["?", ...cols.map(() => "?")].join(", ");
      const insert = db.prepare(`INSERT INTO ${table} (pos, ${cols.join(", ")}) VALUES (${placeholders})`);
      rows.forEach((row, i) => insert.run(i, ...Object.values(row)));
    };
    if (db.prepare("SELECT COUNT(*) AS n FROM pillars").get().n === 0)   insCollection("pillars", pillars);
    if (db.prepare("SELECT COUNT(*) AS n FROM services").get().n === 0)  insCollection("services", services);
    if (db.prepare("SELECT COUNT(*) AS n FROM steps").get().n === 0)     insCollection("steps", steps);
    if (db.prepare("SELECT COUNT(*) AS n FROM resources").get().n === 0) insCollection("resources", resources);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

/* Allow `npm run seed` to force-reset content (users/enquiries/media kept) */
if (process.argv[1] && process.argv[1].endsWith("seed.js") && process.argv.includes("--force")) {
  seedDatabase({ force: true });
  console.log("✓ Content re-seeded (admin password reset to the default)");
}
