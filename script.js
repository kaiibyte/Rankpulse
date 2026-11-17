
/* ==========================================
   RANKPULSE — COMPLETE JAVASCRIPT
========================================== */

/* SUPABASE */

const SUPABASE_URL = "https://nwuyuncvtaliryuoqrap.supabase.co";
const SUPABASE_KEY = "sb_publishable_qTkztL9y-_W4I-x99J0REQ_Y0TDwzzM";

const API_BASE = "https://rankpulseapi.kaiiiiiiii6767.workers.dev/api";

let supabaseClient = null;

if (window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

/* HELPERS */

const $ = id => document.getElementById(id);

function on(id, event, callback) {
  const element = $(id);
  if (element) element.addEventListener(event, callback);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function setMessage(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function getInitial(name) {
  return String(name || "?").charAt(0).toUpperCase();
}

/* HERO DATABASE */

const HEROES = [
  "Aamon","Aldous","Alice","Alpha","Angela","Argus","Arlott",
  "Atlas","Aulus","Aurora","Badang","Balmond","Bane","Barats",
  "Baxia","Beatrix","Belerick","Benedetta","Brody","Bruno",
  "Carmilla","Cecilion","Chang'e","Chip","Chou","Cici",
  "Claude","Clint","Cyclops","Diggie","Dyrroth","Edith",
  "Esmeralda","Estes","Fanny","Faramis","Floryn","Franco",
  "Fredrinn","Freya","Gatotkaca","Gloo","Gord","Granger",
  "Grock","Guinevere","Gusion","Hanabi","Hanzo","Harith",
  "Harley","Hayabusa","Helcurt","Hilda","Hylos","Irithel",
  "Ixia","Jawhead","Johnson","Joy","Julian","Kadita",
  "Kagura","Kaja","Karina","Karrie","Khaleed","Kimmy",
  "Lancelot","Lapu-Lapu","Layla","Leomord","Lesley","Ling",
  "Lolita","Lunox","Luo Yi","Lylia","Marcel","Martis",
  "Masha","Mathilda","Melissa","Minotaur","Minsitthar","Miya",
  "Moskov","Nana","Natalia","Natan","Novaria","Odette",
  "Paquito","Pharsa","Popol and Kupa","Rafaela","Roger",
  "Ruby","Saber","Selena","Silvanna","Sun","Tigreal",
  "Uranus","Vale","Valentina","Valir","Vexana","Wanwan",
  "X.Borg","Xavier","Yi Sun-shin","Yin","Yu Zhong","Yve",
  "Zhask","Zilong"
];

/* NAVIGATION */

function navigateTo(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const page = $("page-" + pageName);
  if (!page) return;

  page.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  const title = $("topbarTitle");
  if (title) title.textContent = pageName.toUpperCase();

  if (pageName === "draft") updateRecommendations();
  if (pageName === "heroes") renderHeroDatabase();
  if (pageName === "tierlist") renderTierList();
  if (pageName === "movers") renderMetaMovers();
  if (pageName === "matches") renderMatches();
  if (pageName === "rank") renderRankTarget();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

/* HERO STATISTICS */

let heroStats = [];
let isLoadingStats = false;

function getFirstValue(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return null;
}

function normalizeHeroRecord(record) {
  const name = getFirstValue(record, [
    "hero_name", "name", "hero", "heroName", "title"
  ]);

  if (!name) return null;

  return {
    name: String(name),
    image: getFirstValue(record, [
      "avatar", "hero_avatar", "icon", "cover",
      "image", "image_url"
    ]),
    winRate: getFirstValue(record, [
      "win_rate", "winRate", "winRateStr"
    ]),
    pickRate: getFirstValue(record, [
      "pick_rate", "pickRate", "pickRateStr"
    ]),
    banRate: getFirstValue(record, [
      "ban_rate", "banRate", "banRateStr"
    ])
  };
}

function findStat(name) {
  return heroStats.find(hero =>
    hero.name.toLowerCase() === name.toLowerCase()
  );
}

function getRate(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const number = Number(String(value).replace("%", ""));
  return Number.isFinite(number) ? number.toFixed(2) + "%" : "—";
}

function getHeroPortrait(name) {
  const hero = findStat(name);

  if (!hero?.image) {
    return `<span>${escapeHTML(getInitial(name))}</span>`;
  }

  return `<img src="${escapeHTML(hero.image)}"
    alt="${escapeHTML(name)}"
    loading="lazy"
    onerror="this.style.display='none'">`;
}

async function loadHeroStats() {
  if (isLoadingStats) return;

  isLoadingStats = true;

  const rank = $("heroRankFilter")?.value || "all";
  const sort = $("heroSort")?.value || "win_rate";

  try {
    const url = `${API_BASE}/heroes/rank?days=7&rank=${encodeURIComponent(rank)}&sort_field=${encodeURIComponent(sort)}&size=200`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("API error: " + response.status);
    }

    const result = await response.json();

    const records =
      result?.result?.data?.records ??
      result?.data?.records ??
      result?.data ??
      [];

    if (!Array.isArray(records)) {
      throw new Error("Unexpected API response.");
    }

    heroStats = records.map(normalizeHeroRecord).filter(Boolean);

    renderHeroDatabase();
    renderTierList();
    renderMetaMovers();
    updateRecommendations();

  } catch (error) {
    console.error("RankPulse API:", error);

    if (!heroStats.length) {
      const grid = $("heroGrid");
      if (grid) {
        grid.innerHTML = `<div class="empty-state">
          Hero statistics could not be loaded. Try refreshing.
        </div>`;
      }

      setMessage("tierListContent", "Hero statistics unavailable.");
      setMessage("metaMovers", "Hero statistics unavailable.");
    }
  } finally {
    isLoadingStats = false;
  }
}

/* HERO DATABASE PAGE */

function renderHeroDatabase() {
  const container = $("heroGrid");
  if (!container) return;

  const query = ($("heroSearch")?.value || "").toLowerCase();

  let results = heroStats.length
    ? heroStats
    : HEROES.map(name => ({ name }));

  results = results.filter(hero =>
    hero.name.toLowerCase().includes(query)
  );

  const sort = $("heroSort")?.value || "win_rate";

  const field = sort === "pick_rate"
    ? "pickRate"
    : sort === "ban_rate"
      ? "banRate"
      : "winRate";

  results.sort((a, b) =>
    (parseFloat(b[field]) || 0) - (parseFloat(a[field]) || 0)
  );

  if (!results.length) {
    container.innerHTML = `<div class="empty-state">No heroes found.</div>`;
    return;
  }

  container.innerHTML = results.map(hero => `
    <div class="hero-card">
      <div class="hero-portrait">
        ${getHeroPortrait(hero.name)}
      </div>
      <strong>${escapeHTML(hero.name)}</strong>
      <small>Win: ${getRate(hero.winRate)}</small>
      <small>Pick: ${getRate(hero.pickRate)}</small>
      <small>Ban: ${getRate(hero.banRate)}</small>
    </div>
  `).join("");
}

on("heroSearch", "input", renderHeroDatabase);
on("heroRankFilter", "change", loadHeroStats);
on("heroSort", "change", () => {
  renderHeroDatabase();
  if (heroStats.length) {
    renderTierList();
    renderMetaMovers();
  } else {
    loadHeroStats();
  }
});

/* TIER LIST */

function renderTierList() {
  const container = $("tierListContent");
  if (!container) return;

  if (!heroStats.length) {
    container.textContent = "Loading hero statistics...";
    return;
  }

  const sorted = [...heroStats].sort(
    (a, b) => (parseFloat(b.winRate) || 0) -
              (parseFloat(a.winRate) || 0)
  );

  container.innerHTML = sorted.slice(0, 30).map((hero, index) => `
    <div class="recommendation">
      <strong>#${index + 1} ${escapeHTML(hero.name)}</strong>
      <span>Win rate: ${getRate(hero.winRate)}</span>
      <span>Pick rate: ${getRate(hero.pickRate)}</span>
      <span>Ban rate: ${getRate(hero.banRate)}</span>
    </div>
  `).join("");
}

/* META MOVERS */

function renderMetaMovers() {
  const container = $("metaMovers");
  if (!container) return;

  if (!heroStats.length) {
    container.textContent = "Loading hero data...";
    return;
  }

  const sorted = [...heroStats].sort(
    (a, b) => (parseFloat(b.winRate) || 0) -
              (parseFloat(a.winRate) || 0)
  );

  container.innerHTML = sorted.slice(0, 10).map((hero, index) => `
    <div class="recommendation">
      <strong>${index + 1}. ${escapeHTML(hero.name)}</strong>
      <span>${getRate(hero.winRate)} win rate</span>
    </div>
  `).join("");
}

/* DRAFT COUNTER */

let selectedLane = "Gold";
let selectedTiming = "Last";
let selectedTeam = "ally";
let selectedSlot = 0;

let allyPicks = [null, null, null, null, null];
let enemyPicks = [null, null, null, null, null];
let bans = [];

const LANE_RECOMMENDATIONS = {
  Gold: ["Karrie","Claude","Brody","Beatrix","Bruno","Ixia","Melissa","Natan"],
  Mid: ["Lylia","Luo Yi","Pharsa","Valentina","Xavier","Novaria","Cecilion"],
  Jungle: ["Fredrinn","Joy","Nolan","Julian","Hayabusa","Ling","Barats"],
  EXP: ["Yu Zhong","Arlott","Terizla","Edith","Ruby","X.Borg","Cici"],
  Roam: ["Tigreal","Mathilda","Khufra","Minotaur","Lolita","Diggie","Chou"]
};

const COUNTER_HINTS = {
  Fanny: ["Khufra","Kaja","Franco","Saber"],
  Ling: ["Khufra","Kaja","Franco"],
  Hayabusa: ["Khufra","Franco","Saber"],
  Aldous: ["Diggie","Karrie","Valir"],
  Fredrinn: ["Karrie","Lunox","Valir"],
  Esmeralda: ["Dyrroth","Karrie","Baxia"],
  Estes: ["Luo Yi","Carmilla","Baxia"],
  Diggie: ["Kaja","Saber","Natalia"],
  Wanwan: ["Franco","Kaja","Saber"],
  Claude: ["Kaja","Saber","Franco"],
  Ixia: ["Lolita","Atlas","Chou"],
  Angela: ["Baxia","Luo Yi","Valir"]
};

function renderTeamSlots() {
  renderOneTeam("ally", allyPicks, "Your pick");
  renderOneTeam("enemy", enemyPicks, "Enemy pick");
}

function renderOneTeam(team, picks, label) {
  const container = $(team === "ally" ? "myTeamSlots" : "enemyTeamSlots");
  if (!container) return;

  container.innerHTML = picks.map((hero, index) => `
    <button class="team-slot" data-team="${team}" data-slot="${index}" type="button">
      <span class="slot-avatar">
        ${hero ? getHeroPortrait(hero) : "+"}
      </span>
      <span>
        <strong>${hero ? escapeHTML(hero) : `${label} ${index + 1}`}</strong>
        <small>${hero ? "Tap to remove" : "Select a hero"}</small>
      </span>
    </button>
  `).join("");

  container.querySelectorAll("[data-slot]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.slot);
      const picksArray = team === "ally" ? allyPicks : enemyPicks;

      if (picksArray[index]) {
        picksArray[index] = null;
        renderTeamSlots();
        renderBans();
        updateRecommendations();
        return;
      }

      selectedTeam = team;
      selectedSlot = index;
      openHeroPicker();
    });
  });
}

function openHeroPicker() {
  const existing = $("rankpulsePicker");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "rankpulsePicker";
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,.85);padding:20px;
    display:flex;align-items:center;justify-content:center;
  `;

  modal.innerHTML = `
    <div style="background:#101923;border:1px solid #263747;
      border-radius:14px;padding:18px;width:100%;max-width:650px;
      max-height:85vh;overflow:auto;color:white">
      <h2>Select a hero</h2>
      <input id="pickerSearch" class="input-field"
        placeholder="Search heroes...">
      <div id="pickerGrid" class="hero-grid"></div>
      <button id="closePicker" class="outline-button full-button"
        type="button">CLOSE</button>
    </div>
  `;

  document.body.appendChild(modal);

  const render = (query = "") => {
    const grid = $("pickerGrid");
    if (!grid) return;

    const used = [...allyPicks, ...enemyPicks, ...bans].filter(Boolean);

    const available = HEROES.filter(hero =>
      hero.toLowerCase().includes(query.toLowerCase()) &&
      !used.includes(hero)
    );

    grid.innerHTML = available.map(hero => `
      <button class="hero-card" data-picker-hero="${escapeHTML(hero)}"
        type="button">
        <div class="hero-portrait">${getHeroPortrait(hero)}</div>
        <strong>${escapeHTML(hero)}</strong>
      </button>
    `).join("");

    grid.querySelectorAll("[data-picker-hero]").forEach(button => {
      button.addEventListener("click", () => {
        addHero(button.dataset.pickerHero);
        modal.remove();
      });
    });
  };

  $("pickerSearch").addEventListener("input", event => {
    render(event.target.value);
  });

  $("closePicker").addEventListener("click", () => modal.remove());

  modal.addEventListener("click", event => {
    if (event.target === modal) modal.remove();
  });

  render();
}

function addHero(name) {
  const used = [...allyPicks, ...enemyPicks, ...bans];

  if (used.includes(name)) return;

  if (selectedTeam === "ban") {
    if (bans.length >= 10) return;
    bans.push(name);
  } else {
    const picks = selectedTeam === "ally" ? allyPicks : enemyPicks;
    if (picks[selectedSlot]) return;
    picks[selectedSlot] = name;
  }

  renderTeamSlots();
  renderBans();
  updateRecommendations();
}

function renderBans() {
  const container = $("banSlots");
  if (!container) return;

  container.innerHTML = Array.from({ length: 10 }, (_, index) => {
    const hero = bans[index];

    return `
      <button class="ban-slot" data-ban="${index}" type="button">
        ${hero ? escapeHTML(hero) + " ×" : `BAN ${index + 1} +`}
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-ban]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.ban);

      if (bans[index]) {
        bans.splice(index, 1);
        renderBans();
        updateRecommendations();
      } else if (bans.length < 10) {
        selectedTeam = "ban";
        openHeroPicker();
      }
    });
  });
}

function calculateRecommendations() {
  const used = [...allyPicks, ...enemyPicks, ...bans].filter(Boolean);
  const enemies = enemyPicks.filter(Boolean);
  const laneOnly = $("laneOnly")?.checked || false;

  const candidates = laneOnly
    ? (LANE_RECOMMENDATIONS[selectedLane] || []).filter(h => !used.includes(h))
    : HEROES.filter(h => !used.includes(h));

  return candidates.map(hero => {
    let score = 60;
    const reasons = [];

    if ((LANE_RECOMMENDATIONS[selectedLane] || []).includes(hero)) {
      score += 10;
      reasons.push(`Fits ${selectedLane} lane.`);
    }

    enemies.forEach(enemy => {
      if (COUNTER_HINTS[enemy]?.includes(hero)) {
        score += 13;
        reasons.push(`Can help counter ${enemy}.`);
      }
    });

    if (selectedTiming === "Early") {
      reasons.push("Consider a flexible early pick.");
    }

    if (selectedTiming === "Last") {
      score += 3;
      reasons.push("Use the full enemy draft to refine your last pick.");
    }

    if (!reasons.length) {
      reasons.push("Check team composition and matchup before picking.");
    }

    return {
      hero,
      score: Math.min(score, 99),
      reason: reasons.slice(0, 3).join(" ")
    };
  }).sort((a, b) => b.score - a.score).slice(0, 5);
}

function updateRecommendations() {
  const container = $("recommendations");
  if (!container) return;

  const results = calculateRecommendations();

  if (!results.length) {
    container.textContent = "No recommendations available.";
    return;
  }

  container.innerHTML = results.map(item => {
    const stats = findStat(item.hero);

    return `
      <div class="recommendation">
        <div class="hero-portrait">${getHeroPortrait(item.hero)}</div>
        <div class="recommendation-info">
          <strong>${escapeHTML(item.hero)}</strong>
          <p>${escapeHTML(item.reason)}</p>
          <small>Win rate: ${stats ? getRate(stats.winRate) : "Unavailable"}</small>
        </div>
        <div class="recommendation-score">${item.score}</div>
        <button class="add-pick" data-add="${escapeHTML(item.hero)}"
          type="button">ADD TO MY TEAM</button>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      const slot = allyPicks.findIndex(hero => !hero);

      if (slot === -1) {
        alert("Your team already has five heroes.");
        return;
      }

      selectedTeam = "ally";
      selectedSlot = slot;
      addHero(button.dataset.add);
    });
  });
}

on("draftLane", "change", event => {
  selectedLane = event.target.value;
  updateRecommendations();
});

on("pickOrder", "change", event => {
  selectedTiming = event.target.value;
  updateRecommendations();
});

on("laneOnly", "change", updateRecommendations);

/* MATCH HISTORY — LOCAL STORAGE */

let matches = [];

try {
  matches = JSON.parse(localStorage.getItem("rankpulse_matches") || "[]");
  if (!Array.isArray(matches)) matches = [];
} catch {
  matches = [];
}

function saveMatches() {
  localStorage.setItem("rankpulse_matches", JSON.stringify(matches));
  renderMatches();
}

function renderMatches() {
  const list = $("matchHistoryList");
  const recent = $("recentMatches");

  const html = matches.length
    ? matches.map((match, index) => `
      <div class="recommendation">
        <strong>${escapeHTML(match.hero)}</strong>
        <span>${match.result === "win" ? "Victory" : "Defeat"}</span>
        <span>${match.kills}/${match.deaths}/${match.assists}</span>
        <span>${escapeHTML(match.mode)}</span>
        <button class="text-button" data-delete-match="${index}"
          type="button">DELETE</button>
      </div>
    `).join("")
    : `<div class="empty-state">No matches recorded yet.</div>`;

  if (list) list.innerHTML = html;
  if (recent) recent.innerHTML = html;

  document.querySelectorAll("[data-delete-match]").forEach(button => {
    button.addEventListener("click", () => {
      matches.splice(Number(button.dataset.deleteMatch), 1);
      saveMatches();
      updateOverview();
    });
  });

  updateOverview();
}

on("addMatchButton", "click", () => {
  const hero = $("matchHero")?.value.trim();

  if (!hero) {
    alert("Enter a hero name.");
    return;
  }

  matches.unshift({
    hero,
    result: $("matchResult")?.value || "win",
    kills: Number($("matchKills")?.value || 0),
    deaths: Number($("matchDeaths")?.value || 0),
    assists: Number($("matchAssists")?.value || 0),
    mode: $("matchMode")?.value || "Ranked",
    date: new Date().toISOString()
  });

  saveMatches();

  if ($("matchHero")) $("matchHero").value = "";
});

on("clearMatchesButton", "click", () => {
  if (!confirm("Delete all recorded matches?")) return;
  matches = [];
  saveMatches();
});

function updateOverview() {
  const total = matches.length;
  const wins = matches.filter(m => m.result === "win").length;
  const winRate = total ? (wins / total * 100).toFixed(1) : "--";

  const kills = matches.reduce((sum, m) => sum + m.kills, 0);
  const deaths = matches.reduce((sum, m) => sum + m.deaths, 0);
  const assists = matches.reduce((sum, m) => sum + m.assists, 0);
  const kda = deaths ? ((kills + assists) / deaths).toFixed(2) : (kills + assists).toFixed(2);

  let streak = 0;
  for (const match of matches) {
    if (match.result !== "win") break;
    streak++;
  }

  setMessage("overviewWinRate", winRate + (winRate === "--" ? "" : "%"));
  setMessage("overviewMatches", total);
  setMessage("overviewKDA", kda);
  setMessage("overviewStreak", streak);
}

/* RANK TARGET — LOCAL STORAGE */

function renderRankTarget() {
  const saved = localStorage.getItem("rankpulse_target");
  if (saved && $("targetRank")) $("targetRank").value = saved;
}

on("saveRankTarget", "click", () => {
  const current = $("currentRank")?.value;
  const target = $("targetRank")?.value;
  const stars = Number($("currentStars")?.value || 0);

  if (!target) return;

  localStorage.setItem("rankpulse_target", target);
  localStorage.setItem("rankpulse_current_rank", current || "");
  localStorage.setItem("rankpulse_current_stars", String(stars));

  setMessage(
    "rankTargetResult",
    `Your target is ${target}. Current rank: ${current}, ${stars} stars.`
  );
});

/* AUTHENTICATION */

function setAuthMessage(message) {
  setMessage("authStatus", message);
}

async function updateAuthUI() {
  if (!supabaseClient) {
    setAuthMessage("Supabase could not load. Refresh the website.");
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    const session = data.session;
    const forms = $("authForms");
    const signOut = $("signOutButton");
    const accountName = $("topAccountName");

    if (session) {
      const user = session.user;
      const name =
        user.user_metadata?.username ||
        user.user_metadata?.full_name ||
        user.email ||
        "RankPulse User";

      setAuthMessage("Signed in as " + name);

      if (forms) forms.style.display = "none";
      if (signOut) signOut.style.display = "block";
      if (accountName) accountName.textContent = name;
    } else {
      setAuthMessage("You are not signed in.");

      if (forms) forms.style.display = "block";
      if (signOut) signOut.style.display = "none";
      if (accountName) accountName.textContent = "Guest Account";
    }
  } catch (error) {
    console.error(error);
    setAuthMessage(error.message || "Could not check login.");
  }
}

/* EMAIL SIGN UP */

on("signUpButton", "click", async () => {
  if (!supabaseClient) return setAuthMessage("Supabase is unavailable.");

  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;
  const username = $("authUsername")?.value.trim();

  if (!email || !password || !username) {
    return setAuthMessage("Enter your email, password and username.");
  }

  if (password.length < 6) {
    return setAuthMessage("Password must be at least 6 characters.");
  }

  setAuthMessage("Creating your account...");

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username
        }
      }
    });

    if (error) throw error;

    if (data.session) {
      setAuthMessage("Account created successfully!");
    } else {
      setAuthMessage("Account created! Check your email to confirm it.");
    }

    await updateAuthUI();
  } catch (error) {
    console.error("Sign up:", error);
    setAuthMessage(error.message || "Could not create account.");
  }
});

/* EMAIL SIGN IN */

on("signInButton", "click", async () => {
  if (!supabaseClient) return setAuthMessage("Supabase is unavailable.");

  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;

  if (!email || !password) {
    return setAuthMessage("Enter your email and password.");
  }

  setAuthMessage("Signing in...");

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    setAuthMessage("Welcome back!");
    await updateAuthUI();
  } catch (error) {
    console.error("Sign in:", error);
    setAuthMessage(error.message || "Could not sign in.");
  }
});

/* GOOGLE AND DISCORD OAUTH */

async function signInWithProvider(provider) {
  if (!supabaseClient) {
    return setAuthMessage("Supabase is unavailable.");
  }

  setAuthMessage(`Connecting to ${provider}...`);

  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) throw error;
  } catch (error) {
    console.error(`${provider} login:`, error);
    setAuthMessage(error.message || `${provider} sign-in failed.`);
  }
}

on("googleSignInButton", "click", () => {
  signInWithProvider("google");
});

on("discordSignInButton", "click", () => {
  signInWithProvider("discord");
});

/* SIGN OUT */

on("signOutButton", "click", async () => {
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    await updateAuthUI();
  } catch (error) {
    setAuthMessage(error.message || "Could not sign out.");
  }
});

/* AUTH SESSION RESTORE */

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(() => {
    updateAuthUI();
  });

  updateAuthUI();
} else {
  setAuthMessage("Supabase library unavailable.");
}

/* SUPPORT TICKET PLACEHOLDER */

on("submitTicketButton", "click", async () => {
  if (!supabaseClient) return setMessage("ticketStatus", "Supabase unavailable.");

  const { data } = await supabaseClient.auth.getUser();

  if (!data.user) {
    return setMessage("ticketStatus", "Please sign in first.");
  }

  const subject = $("ticketSubject")?.value.trim();
  const message = $("ticketMessage")?.value.trim();

  if (!subject || !message) {
    return setMessage("ticketStatus", "Enter a subject and message.");
  }

  const { error } = await supabaseClient
    .from("support_tickets")
    .insert({
      user_id: data.user.id,
      subject,
      message
    });

  if (error) {
    console.error(error);
    setMessage("ticketStatus", "Could not submit ticket: " + error.message);
  } else {
    setMessage("ticketStatus", "Your support ticket was submitted!");
    $("ticketSubject").value = "";
    $("ticketMessage").value = "";
  }
});

/* MLBB ACCOUNT CONNECTION */

const mlbbStatus = document.createElement("div");
mlbbStatus.id = "mlbbConnectionStatus";

const mlbbPanel = document.querySelector("#page-settings .panel:last-child");

if (mlbbPanel) {
  mlbbPanel.appendChild(mlbbStatus);
  mlbbStatus.className = "notice";
  mlbbStatus.textContent =
    "MLBB account linking is not enabled yet. Secure server-side token storage must be implemented first.";
}

/* INITIALIZE */

function initializeRankPulse() {
  renderTeamSlots();
  renderBans();
  updateRecommendations();
  renderMatches();
  renderRankTarget();
  loadHeroStats();
}

initializeRankPulse();

console.log("RankPulse initialized.");
