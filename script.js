
/* ==========================================
   RANKPULSE — COMPLETE JAVASCRIPT
========================================== */

/* SUPABASE CONNECTION */

const SUPABASE_URL = "https://nwuyuncvtaliryuoqrap.supabase.co";

const SUPABASE_KEY = "sb_publishable_qTkztL9y-_W4I-x99J0REQ_Y0TDwzzM";

let supabaseClient = null;

if (window.supabase?.createClient) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

/* MLBB API */

const API_BASE =
  "https://rankpulseapi.kaiiiiiiii6767.workers.dev/api";

/* SAFE HTML HELPERS */

function $(id) {
  return document.getElementById(id);
}

function on(id, event, callback) {
  const element = $(id);
  if (element) element.addEventListener(event, callback);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
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

/* APP STATE */

let selectedLane = "Gold";
let selectedTiming = "Last";
let selectedTeam = "ally";
let selectedSlot = 0;

let allyPicks = [null, null, null, null, null];
let enemyPicks = [null, null, null, null, null];
let bans = [];

let heroStats = [];
let isLoadingStats = false;

/* NAVIGATION */

function navigateTo(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const target = $("page-" + pageName);
  if (!target) return;

  target.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageName === "meta" && heroStats.length === 0) {
    loadHeroStats();
  }

  if (pageName === "draft") {
    updateRecommendations();
  }
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

/* HERO STAT HELPERS */

function findStat(heroName) {
  return heroStats.find(hero =>
    hero.name.toLowerCase() === heroName.toLowerCase()
  );
}

function getRate(value) {
  if (value === undefined || value === null || value === "") {
    return "—";
  }

  const number = Number(String(value).replace("%", ""));

  if (!Number.isFinite(number)) return "—";

  return number.toFixed(2) + "%";
}

function getHeroPortrait(heroName) {
  const hero = findStat(heroName);

  if (!hero || !hero.image) {
    return `<span>${escapeHTML(getInitial(heroName))}</span>`;
  }

  return `
    <img
      src="${escapeHTML(hero.image)}"
      alt="${escapeHTML(heroName)}"
      loading="lazy"
      onerror="this.style.display='none'"
    >
  `;
}

/* LANE SELECTION */

document.querySelectorAll("[data-lane]").forEach(button => {
  button.addEventListener("click", () => {
    selectedLane = button.dataset.lane;

    document.querySelectorAll("[data-lane]").forEach(item => {
      item.classList.remove("selected-orange");
    });

    button.classList.add("selected-orange");
    updateRecommendations();
  });
});

/* PICK TIMING */

document.querySelectorAll("[data-timing]").forEach(button => {
  button.addEventListener("click", () => {
    selectedTiming = button.dataset.timing;

    document.querySelectorAll("[data-timing]").forEach(item => {
      item.classList.remove("selected-blue");
    });

    button.classList.add("selected-blue");
    updateRecommendations();
  });
});

/* TEAM SLOTS */

function renderTeamSlots() {
  renderOneTeam("ally", allyPicks, "Your pick");
  renderOneTeam("enemy", enemyPicks, "Enemy pick");
}

function renderOneTeam(team, picks, label) {
  const container = $(
    team === "ally" ? "allySlots" : "enemySlots"
  );

  if (!container) return;

  container.innerHTML = picks.map((hero, index) => {
    const selected =
      selectedTeam === team && selectedSlot === index;

    return `
      <button
        class="team-slot ${selected ? "selected-slot" : ""}"
        data-team="${team}"
        data-slot="${index}"
        type="button"
      >
        <span class="slot-avatar">
          ${hero ? getHeroPortrait(hero) : "+"}
        </span>

        <span>
          <strong>${hero ? escapeHTML(hero) : `${label} ${index + 1}`}</strong>
          <small>${hero ? "Click to replace hero" : "Select a hero"}</small>
        </span>

        ${hero ? `<span style="margin-left:auto">×</span>` : ""}
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-slot]").forEach(button => {
    button.addEventListener("click", () => {
      selectedTeam = team;
      selectedSlot = Number(button.dataset.slot);

      renderTeamSlots();

      if ($("selectionHint")) {
        $("selectionHint").textContent =
          `Selecting for ${team === "ally" ? "your team" : "enemy team"} slot ${selectedSlot + 1}`;
      }

      $("heroSearch")?.focus();
    });
  });
}

/* HERO PICKER */

function renderHeroPicker(search = "") {
  const container = $("heroPicker");
  if (!container) return;

  const query = search.toLowerCase().trim();

  const alreadyUsed = [
    ...allyPicks,
    ...enemyPicks,
    ...bans
  ].filter(Boolean);

  const available = HEROES.filter(name =>
    name.toLowerCase().includes(query) &&
    !alreadyUsed.includes(name)
  );

  if (!available.length) {
    container.innerHTML = `
      <div class="empty-state">No available heroes found.</div>
    `;
    return;
  }

  container.innerHTML = available.map(name => `
    <button class="hero-card" data-hero="${escapeHTML(name)}" type="button">
      <div class="hero-portrait">
        ${getHeroPortrait(name)}
      </div>
      <strong>${escapeHTML(name)}</strong>
      <small>Select hero</small>
    </button>
  `).join("");

  container.querySelectorAll("[data-hero]").forEach(button => {
    button.addEventListener("click", () => {
      addHero(button.dataset.hero);
    });
  });
}

on("heroSearch", "input", event => {
  renderHeroPicker(event.target.value);
});

/* ADD HERO */

function addHero(heroName) {
  if (!HEROES.includes(heroName)) return;

  if (
    allyPicks.includes(heroName) ||
    enemyPicks.includes(heroName) ||
    bans.includes(heroName)
  ) return;

  if (selectedTeam === "ban") {
    if (bans.length >= 10) return;

    bans.push(heroName);
    selectedTeam = "ally";

    const next = allyPicks.findIndex(hero => hero === null);
    selectedSlot = next === -1 ? 0 : next;

    renderBans();
  } else if (selectedTeam === "ally") {
    allyPicks[selectedSlot] = heroName;

    const next = allyPicks.findIndex(hero => hero === null);
    if (next !== -1) selectedSlot = next;
  } else {
    enemyPicks[selectedSlot] = heroName;

    const next = enemyPicks.findIndex(hero => hero === null);
    if (next !== -1) selectedSlot = next;
  }

  renderTeamSlots();
  renderHeroPicker($("heroSearch")?.value || "");
  updateRecommendations();
}

/* BANS */

function renderBans() {
  const container = $("banSlots");
  if (!container) return;

  if ($("banCount")) {
    $("banCount").textContent = `${bans.length} / 10`;
  }

  container.innerHTML = Array.from({ length: 10 }, (_, index) => {
    const hero = bans[index];

    return `
      <button
        class="ban-slot ${hero ? "filled" : ""}"
        data-ban-slot="${index}"
        type="button"
      >
        ${hero
          ? `<strong>${escapeHTML(hero)}</strong><small>Remove ×</small>`
          : `⊘<small>BAN ${index + 1}</small>`
        }
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-ban-slot]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.banSlot);

      if (bans[index]) {
        bans.splice(index, 1);
        renderBans();
        renderHeroPicker($("heroSearch")?.value || "");
        updateRecommendations();
      } else if (bans.length < 10) {
        selectedTeam = "ban";

        if ($("selectionHint")) {
          $("selectionHint").textContent =
            `Selecting ban ${bans.length + 1}`;
        }

        $("heroSearch")?.focus();
      }
    });
  });
}

on("clearBans", "click", () => {
  bans = [];
  renderBans();
  renderHeroPicker();
  updateRecommendations();
});

/* COUNTER HINTS */

const COUNTER_HINTS = {
  Fanny: ["Khufra", "Kaja", "Franco", "Saber"],
  Ling: ["Khufra", "Kaja", "Franco"],
  Hayabusa: ["Khufra", "Franco", "Saber"],
  Aldous: ["Diggie", "Karrie", "Valir"],
  Fredrinn: ["Karrie", "Lunox", "Valir"],
  Esmeralda: ["Dyrroth", "Karrie", "Baxia"],
  Estes: ["Luo Yi", "Carmilla", "Baxia"],
  Diggie: ["Kaja", "Saber", "Natalia"],
  Wanwan: ["Franco", "Kaja", "Saber"],
  Claude: ["Kaja", "Saber", "Franco"],
  Ixia: ["Lolita", "Atlas", "Chou"],
  Angela: ["Baxia", "Luo Yi", "Valir"]
};

const LANE_RECOMMENDATIONS = {
  Gold: [
    "Karrie", "Claude", "Brody", "Beatrix",
    "Bruno", "Ixia", "Melissa", "Natan"
  ],
  Mid: [
    "Lylia", "Luo Yi", "Pharsa", "Valentina",
    "Xavier", "Novaria", "Cecilion"
  ],
  Jungle: [
    "Fredrinn", "Joy", "Nolan", "Julian",
    "Hayabusa", "Ling", "Barats"
  ],
  EXP: [
    "Yu Zhong", "Arlott", "Terizla", "Edith",
    "Ruby", "X.Borg", "Cici"
  ],
  Roam: [
    "Tigreal", "Mathilda", "Khufra", "Minotaur",
    "Lolita", "Diggie", "Chou"
  ]
};

/* RECOMMENDATION ENGINE */

function calculateRecommendations() {
  const enemies = enemyPicks.filter(Boolean);
  const teammates = allyPicks.filter(Boolean);

  const used = [
    ...allyPicks,
    ...enemyPicks,
    ...bans
  ].filter(Boolean);

  const laneOnly = $("laneOnly")?.checked || false;

  const candidates = laneOnly
    ? LANE_RECOMMENDATIONS[selectedLane].filter(hero => !used.includes(hero))
    : HEROES.filter(hero => !used.includes(hero));

  const results = candidates.map(hero => {
    let score = 60;
    const reasons = [];

    if (LANE_RECOMMENDATIONS[selectedLane].includes(hero)) {
      score += 10;
      reasons.push(`Fits the ${selectedLane} lane.`);
    } else {
      reasons.push(`Consider whether ${hero} fits the ${selectedLane} lane.`);
    }

    enemies.forEach(enemy => {
      if (COUNTER_HINTS[enemy]?.includes(hero)) {
        score += 13;
        reasons.push(`Can help answer the enemy ${enemy}.`);
      }
    });

    if (selectedLane === "Gold" &&
        ["Karrie", "Ixia", "Claude"].includes(hero)) {
      reasons.push("Provides sustained team-fight damage.");
    }

    if (selectedLane === "Mid" &&
        ["Luo Yi", "Pharsa", "Lylia"].includes(hero)) {
      reasons.push("Adds magic damage and team-fight pressure.");
    }

    if (selectedLane === "Jungle" &&
        ["Fredrinn", "Barats"].includes(hero)) {
      reasons.push("Can provide frontline presence.");
    }

    if (selectedLane === "EXP" &&
        ["Terizla", "Yu Zhong", "Edith"].includes(hero)) {
      reasons.push("Can contribute frontline presence and engage.");
    }

    if (selectedLane === "Roam" &&
        ["Tigreal", "Minotaur", "Khufra"].includes(hero)) {
      reasons.push("Offers team-fight initiation and crowd control.");
    }

    if (teammates.length) {
      reasons.push("Check how this pick complements your teammates.");
    }

    if (selectedTiming === "Early") {
      score -= 2;
      reasons.push("Early pick: prioritize flexible choices.");
    }

    if (selectedTiming === "Last") {
      score += 3;
      reasons.push("Last pick: use the full enemy draft to refine your choice.");
    }

    return {
      hero,
      score: Math.min(score, 99),
      reason: reasons.slice(0, 3).join(" ")
    };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}

function updateRecommendations() {
  const container = $("recommendations");
  if (!container) return;

  const results = calculateRecommendations();

  if (!results.length) {
    container.innerHTML = `
      <div class="empty-state">No recommendations available.</div>
    `;
    return;
  }

  container.innerHTML = results.map(item => `
    <div class="recommendation">
      <div class="hero-portrait">
        ${getHeroPortrait(item.hero)}
      </div>

      <div class="recommendation-info">
        <strong>${escapeHTML(item.hero)}</strong>
        <p>${escapeHTML(item.reason)}</p>
        <p>Win rate: ${
          findStat(item.hero)
            ? getRate(findStat(item.hero).winRate)
            : "Not available"
        }</p>
      </div>

      <div class="recommendation-score">${item.score}</div>

      <button class="add-pick" data-add-pick="${escapeHTML(item.hero)}" type="button">
        ADD TO TEAM
      </button>
    </div>
  `).join("");

  container.querySelectorAll("[data-add-pick]").forEach(button => {
    button.addEventListener("click", () => {
      selectedTeam = "ally";

      const emptySlot = allyPicks.findIndex(hero => hero === null);

      if (emptySlot === -1) {
        alert("Your team already has five heroes.");
        return;
      }

      selectedSlot = emptySlot;
      addHero(button.dataset.addPick);
    });
  });
}

on("laneOnly", "change", updateRecommendations);

/* HERO DATABASE */

function renderDatabase(search = "") {
  const container = $("databaseHeroes");
  if (!container) return;

  const results = HEROES.filter(hero =>
    hero.toLowerCase().includes(search.toLowerCase())
  );

  if (!results.length) {
    container.innerHTML = `<div class="empty-state">No heroes found.</div>`;
    return;
  }

  container.innerHTML = results.map(hero => {
    const stats = findStat(hero);

    return `
      <button class="hero-card" data-open-hero="${escapeHTML(hero)}" type="button">
        <div class="hero-portrait">
          ${getHeroPortrait(hero)}
        </div>
        <strong>${escapeHTML(hero)}</strong>
        <small>Win rate: ${stats ? getRate(stats.winRate) : "—"}</small>
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-open-hero]").forEach(button => {
    button.addEventListener("click", () => {
      alert(
        `${button.dataset.openHero}\n\nDetailed hero profiles are planned for a future RankPulse update.`
      );
    });
  });
}

on("databaseSearch", "input", event => {
  renderDatabase(event.target.value);
});

/* API NORMALIZATION */

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
      "avatar", "hero_avatar", "icon", "cover", "image", "image_url"
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

/* LOAD HERO STATS */

async function loadHeroStats() {
  if (isLoadingStats) return;

  isLoadingStats = true;

  const status = $("metaStatus");
  const table = $("metaTable");

  if (status) status.textContent = "Loading hero ranking data...";

  const rank = $("rankFilter")?.value || "all";
  const sort = $("sortFilter")?.value || "win_rate";

  const url =
    `${API_BASE}/heroes/rank` +
    `?days=7&rank=${encodeURIComponent(rank)}` +
    `&sort_field=${encodeURIComponent(sort)}&size=200`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const result = await response.json();

    const records =
      result?.result?.data?.records ??
      result?.data?.records ??
      result?.data ??
      [];

    if (!Array.isArray(records)) {
      throw new Error("Unexpected API response format");
    }

    heroStats = records
      .map(normalizeHeroRecord)
      .filter(Boolean);

    if (!heroStats.length) {
      throw new Error("No recognizable hero records returned");
    }

    if (status) {
      status.textContent =
        `Loaded ${heroStats.length} hero records from the ranking API.`;
    }

    renderMetaTable();
    renderDatabase($("databaseSearch")?.value || "");
    renderHeroPicker($("heroSearch")?.value || "");
    renderTeamSlots();
    updateRecommendations();

  } catch (error) {
    console.error("RankPulse API error:", error);

    if (status) {
      status.textContent =
        "Could not load hero statistics. Please try again.";
    }

    if (table) {
      table.innerHTML = `
        <tr>
          <td colspan="4" class="muted">
            Hero statistics are currently unavailable.
          </td>
        </tr>
      `;
    }
  } finally {
    isLoadingStats = false;
  }
}

/* META TABLE */

function renderMetaTable() {
  const container = $("metaTable");
  if (!container) return;

  const sort = $("sortFilter")?.value || "win_rate";

  const field = sort === "pick_rate"
    ? "pickRate"
    : sort === "ban_rate"
      ? "banRate"
      : "winRate";

  const sorted = [...heroStats].sort((a, b) => {
    const aValue = parseFloat(a[field]) || 0;
    const bValue = parseFloat(b[field]) || 0;
    return bValue - aValue;
  });

  container.innerHTML = sorted.map(hero => `
    <tr>
      <td>
        <div class="table-hero">
          ${hero.image
            ? `<img src="${escapeHTML(hero.image)}" alt="" onerror="this.style.display='none'">`
            : ""
          }
          ${escapeHTML(hero.name)}
        </div>
      </td>
      <td>${getRate(hero.winRate)}</td>
      <td>${getRate(hero.pickRate)}</td>
      <td>${getRate(hero.banRate)}</td>
    </tr>
  `).join("");
}

on("refreshStats", "click", loadHeroStats);
on("rankFilter", "change", loadHeroStats);

on("sortFilter", "change", () => {
  if (heroStats.length) {
    renderMetaTable();
  } else {
    loadHeroStats();
  }
});

/* RANK TARGET */

const rankSelect = $("targetRank");
const rankMessage = $("rankMessage");

if (rankSelect) {
  const savedRank = localStorage.getItem("rankpulse_target");

  if (savedRank) rankSelect.value = savedRank;
}

on("saveRank", "click", () => {
  const value = rankSelect?.value;

  if (!value) {
    if (rankMessage) {
      rankMessage.textContent = "Please choose a target rank first.";
    }
    return;
  }

  localStorage.setItem("rankpulse_target", value);

  if (rankMessage) {
    rankMessage.textContent = `Your target rank is set to ${value}.`;
  }
});

/* ==========================================
   RANKPULSE AUTHENTICATION
========================================== */

function setAuthMessage(message) {
  const status = $("authStatus");
  if (status) status.textContent = message;
}

async function updateAuthUI() {
  if (!supabaseClient) {
    setAuthMessage("Supabase could not load. Please refresh the website.");
    return;
  }

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    const session = data.session;
    const forms = $("authForms");
    const signOut = $("signOutButton");
    const accountName = $("topAccountName");

    if (session) {
      const email = session.user.email || "RankPulse User";

      setAuthMessage("Signed in as " + email);

      if (forms) forms.style.display = "none";
      if (signOut) signOut.style.display = "block";
      if (accountName) accountName.textContent = email;
    } else {
      setAuthMessage("You are not signed in.");

      if (forms) forms.style.display = "block";
      if (signOut) signOut.style.display = "none";
      if (accountName) accountName.textContent = "Guest Account";
    }
  } catch (error) {
    console.error("Auth session error:", error);
    setAuthMessage(error.message || "Could not check your login.");
  }
}

/* CREATE ACCOUNT */

on("signUpButton", "click", async () => {
  if (!supabaseClient) {
    setAuthMessage("Supabase failed to load. Please refresh.");
    return;
  }

  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;
  const username = $("authUsername")?.value.trim();

  if (!email || !password || !username) {
    setAuthMessage("Please fill in your username, email, and password.");
    return;
  }

  if (password.length < 6) {
    setAuthMessage("Password must be at least 6 characters.");
    return;
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
      setAuthMessage(
        "Account created! Check your email for the confirmation link."
      );
    }

    await updateAuthUI();

  } catch (error) {
    console.error("Sign-up error:", error);
    setAuthMessage(error.message || "Could not create your account.");
  }
});

/* SIGN IN */

on("signInButton", "click", async () => {
  if (!supabaseClient) {
    setAuthMessage("Supabase failed to load. Please refresh.");
    return;
  }

  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;

  if (!email || !password) {
    setAuthMessage("Enter your email and password.");
    return;
  }

  setAuthMessage("Signing in...");

  try {
    const { error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;

    setAuthMessage("Welcome back!");
    await updateAuthUI();

  } catch (error) {
    console.error("Sign-in error:", error);
    setAuthMessage(error.message || "Could not sign in.");
  }
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

/* RESTORE LOGIN */

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(() => {
    updateAuthUI();
  });

  updateAuthUI();
} else {
  setAuthMessage("Supabase library is unavailable. Please refresh.");
}

/* INITIALIZE WEBSITE */

function initializeRankPulse() {
  renderTeamSlots();
  renderBans();
  renderHeroPicker();
  renderDatabase();
  updateRecommendations();

  loadHeroStats();
}

initializeRankPulse();

console.log("RankPulse JavaScript loaded successfully.");
