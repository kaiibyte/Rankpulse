
/* SUPABASE CONNECTION */

const SUPABASE_URL = "https://nwuyuncvtaliryuoqrap.supabase.co";

const SUPABASE_KEY = "sb_publishable_qTkztL9y-_W4I-x99J0REQ_Y0TDwzzM";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* RANKPULSE MLBB API */

const API_BASE =
  "https://rankpulseapi.kaiiiiiiii6767.workers.dev/api";

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

  const target = document.getElementById("page-" + pageName);

  if (!target) return;

  target.classList.add("active");

  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

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

/* HELPERS */

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
      onerror="this.style.display='none';this.parentElement.textContent='${escapeHTML(getInitial(heroName))}'"
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

/* TEAM SLOT RENDERING */

function renderTeamSlots() {
  renderOneTeam("ally", allyPicks, "Your pick");
  renderOneTeam("enemy", enemyPicks, "Enemy pick");
}

function renderOneTeam(team, picks, label) {
  const container = document.getElementById(
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
      >
        <span class="slot-avatar">
          ${hero ? getHeroPortrait(hero) : "+"}
        </span>

        <span>
          <strong>${hero ? escapeHTML(hero) : `${label} ${index + 1}`}</strong>
          <small>${hero ? "Click to replace hero" : "Select a hero"}</small>
        </span>

        ${hero ? `<span style="margin-left:auto;color:#8fa2b5">×</span>` : ""}
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-slot]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.slot);

      selectedTeam = team;
      selectedSlot = index;

      renderTeamSlots();

      document.getElementById("selectionHint").textContent =
        `Selecting for ${team === "ally" ? "your team" : "enemy team"} slot ${index + 1}`;

      document.getElementById("heroSearch").focus();
    });
  });
}

/* HERO PICKER */

function renderHeroPicker(search = "") {
  const container = document.getElementById("heroPicker");

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

  if (available.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No available heroes found.
      </div>
    `;
    return;
  }

  container.innerHTML = available.map(name => `
    <button class="hero-card" data-hero="${escapeHTML(name)}">
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

document.getElementById("heroSearch").addEventListener("input", event => {
  renderHeroPicker(event.target.value);
});

/* ADD HERO */

function addHero(heroName) {
  if (!HEROES.includes(heroName)) return;

  if (
    allyPicks.includes(heroName) ||
    enemyPicks.includes(heroName) ||
    bans.includes(heroName)
  ) {
    return;
  }

  if (selectedTeam === "ally") {
    allyPicks[selectedSlot] = heroName;
  } else {
    enemyPicks[selectedSlot] = heroName;
  }

  const nextEmpty = selectedTeam === "ally"
    ? allyPicks.findIndex(hero => hero === null)
    : enemyPicks.findIndex(hero => hero === null);

  if (nextEmpty !== -1) {
    selectedSlot = nextEmpty;
  }

  renderTeamSlots();
  renderHeroPicker(document.getElementById("heroSearch").value);
  updateRecommendations();
}

/* BAN SLOTS */

function renderBans() {
  const container = document.getElementById("banSlots");

  document.getElementById("banCount").textContent =
    `${bans.length} / 10`;

  const slots = Array.from({ length: 10 }, (_, index) => {
    const hero = bans[index];

    return `
      <button
        class="ban-slot ${hero ? "filled" : ""}"
        data-ban-slot="${index}"
      >
        ${hero
          ? `<strong>${escapeHTML(hero)}</strong><small>Remove ×</small>`
          : `⊘<small>BAN ${index + 1}</small>`
        }
      </button>
    `;
  });

  container.innerHTML = slots.join("");

  container.querySelectorAll("[data-ban-slot]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.banSlot);

      if (bans[index]) {
        bans.splice(index, 1);
        renderBans();
        renderHeroPicker(
          document.getElementById("heroSearch").value
        );
        updateRecommendations();
      } else if (bans.length < 10) {
        selectedTeam = "ban";
        selectedSlot = index;

        document.getElementById("selectionHint").textContent =
          `Selecting ban ${index + 1}`;

        document.getElementById("heroSearch").focus();
      }
    });
  });
}

/* BAN SELECTION */

const originalAddHero = addHero;

addHero = function(heroName) {
  if (selectedTeam === "ban") {
    if (
      bans.length >= 10 ||
      bans.includes(heroName) ||
      allyPicks.includes(heroName) ||
      enemyPicks.includes(heroName)
    ) {
      return;
    }

    bans.push(heroName);

    selectedTeam = "ally";
    selectedSlot = allyPicks.findIndex(hero => hero === null);

    if (selectedSlot === -1) selectedSlot = 0;

    renderBans();
    renderHeroPicker(
      document.getElementById("heroSearch").value
    );
    updateRecommendations();

    return;
  }

  originalAddHero(heroName);
};

/* CLEAR BANS */

document.getElementById("clearBans").addEventListener("click", () => {
  bans = [];

  renderBans();
  renderHeroPicker();
  updateRecommendations();
});

/* DRAFT RECOMMENDATION ENGINE */

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

function calculateRecommendations() {
  const enemies = enemyPicks.filter(Boolean);
  const teammates = allyPicks.filter(Boolean);

  const used = [
    ...allyPicks,
    ...enemyPicks,
    ...bans
  ].filter(Boolean);

  const candidates = LANE_RECOMMENDATIONS[selectedLane]
    .filter(hero => !used.includes(hero));

  const results = candidates.map(hero => {
    let score = 65;
    const reasons = [];

    // Lane-specific suggestions are a starting point,
    // not a claim of official competitive pick strength.
    reasons.push(`Fits the ${selectedLane} lane role.`);

    // Counter hints.
    enemies.forEach(enemy => {
      if (COUNTER_HINTS[enemy]?.includes(hero)) {
        score += 13;
        reasons.push(`Can help answer the enemy ${enemy}.`);
      }
    });

    // Basic role and composition guidance.
    if (selectedLane === "Gold") {
      if (["Karrie", "Ixia", "Claude"].includes(hero)) {
        reasons.push("Provides sustained team-fight damage.");
      }
    }

    if (selectedLane === "Mid") {
      if (["Luo Yi", "Pharsa", "Lylia"].includes(hero)) {
        reasons.push("Adds magic damage and team-fight pressure.");
      }
    }

    if (selectedLane === "Jungle") {
      if (["Fredrinn", "Barats"].includes(hero)) {
        reasons.push("Can provide frontline presence.");
      }
    }

    if (selectedLane === "EXP") {
      if (["Terizla", "Yu Zhong", "Edith"].includes(hero)) {
        reasons.push("Can contribute frontline presence and engage.");
      }
    }

    if (selectedLane === "Roam") {
      if (["Tigreal", "Minotaur", "Khufra"].includes(hero)) {
        reasons.push("Offers team-fight initiation and crowd control.");
      }
    }

    if (teammates.length > 0) {
      reasons.push("Consider how this pick complements your current teammates.");
    }

    if (selectedTiming === "Early") {
      score -= 2;
      reasons.push("Early pick: consider a flexible, harder-to-counter choice.");
    }

    if (selectedTiming === "Last") {
      score += 3;
      reasons.push("Last pick: use the completed enemy draft to refine your matchup.");
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
  const container = document.getElementById("recommendations");

  if (!container) return;

  const results = calculateRecommendations();

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state small-empty">
        No recommendations available for this draft.
      </div>
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

      <button
        class="add-pick"
        data-add-pick="${escapeHTML(item.hero)}"
      >
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

/* LANE MATCHUP OPTION */

document.getElementById("laneOnly").addEventListener("change", () => {
  updateRecommendations();
});

/* HERO DATABASE */

function renderDatabase(search = "") {
  const container = document.getElementById("databaseHeroes");

  const results = HEROES.filter(hero =>
    hero.toLowerCase().includes(search.toLowerCase())
  );

  if (results.length === 0) {
    container.innerHTML = `
      <div class="empty-state">No heroes found.</div>
    `;
    return;
  }

  container.innerHTML = results.map(hero => {
    const stats = findStat(hero);

    return `
      <button class="hero-card" data-open-hero="${escapeHTML(hero)}">
        <div class="hero-portrait">
          ${getHeroPortrait(hero)}
        </div>
        <strong>${escapeHTML(hero)}</strong>
        <small>
          Win rate: ${stats ? getRate(stats.winRate) : "—"}
        </small>
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-open-hero]").forEach(button => {
    button.addEventListener("click", () => {
      const hero = button.dataset.openHero;
      alert(
        `${hero}\n\nDetailed hero profiles and matchup information are planned for a future RankPulse update.`
      );
    });
  });
}

document.getElementById("databaseSearch").addEventListener("input", event => {
  renderDatabase(event.target.value);
});

/* API DATA NORMALIZATION */

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
    "hero_name",
    "name",
    "hero",
    "heroName",
    "title"
  ]);

  if (!name) return null;

  const image = getFirstValue(record, [
    "avatar",
    "hero_avatar",
    "icon",
    "cover",
    "image",
    "image_url"
  ]);

  return {
    name: String(name),
    image: image ? String(image) : null,

    winRate: getFirstValue(record, [
      "win_rate",
      "winRate",
      "winRateStr"
    ]),

    pickRate: getFirstValue(record, [
      "pick_rate",
      "pickRate",
      "pickRateStr"
    ]),

    banRate: getFirstValue(record, [
      "ban_rate",
      "banRate",
      "banRateStr"
    ])
  };
}

/* FETCH REAL HERO RANKING DATA */

async function loadHeroStats() {
  if (isLoadingStats) return;

  isLoadingStats = true;

  const status = document.getElementById("metaStatus");
  const table = document.getElementById("metaTable");

  status.textContent = "Loading hero ranking data...";

  const rank = document.getElementById("rankFilter").value;
  const sort = document.getElementById("sortFilter").value;

  const url =
    `${API_BASE}/heroes/rank` +
    `?days=7` +
    `&rank=${encodeURIComponent(rank)}` +
    `&sort_field=${encodeURIComponent(sort)}` +
    `&size=200`;

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

    if (heroStats.length === 0) {
      throw new Error("No recognizable hero records were returned");
    }

    status.textContent =
      `Loaded ${heroStats.length} hero records from the ranking API.`;

    renderMetaTable();
    renderDatabase(
      document.getElementById("databaseSearch").value
    );
    renderHeroPicker(
      document.getElementById("heroSearch").value
    );
    renderTeamSlots();
    updateRecommendations();

  } catch (error) {
    console.error("RankPulse API error:", error);

    status.textContent =
      "Could not load hero statistics. Check the API response or try again.";

    table.innerHTML = `
      <tr>
        <td colspan="4" class="muted">
          Hero statistics are currently unavailable.
          No fake statistics are being displayed.
        </td>
      </tr>
    `;
  } finally {
    isLoadingStats = false;
  }
}

/* META TABLE */

function renderMetaTable() {
  const container = document.getElementById("metaTable");

  const sort = document.getElementById("sortFilter").value;

  const sorted = [...heroStats].sort((a, b) => {
    const aValue = Number(a[sort === "win_rate"
      ? "winRate"
      : sort === "pick_rate"
        ? "pickRate"
        : "banRate"
    ]) || 0;

    const bValue = Number(b[sort === "win_rate"
      ? "winRate"
      : sort === "pick_rate"
        ? "pickRate"
        : "banRate"
    ]) || 0;

    return bValue - aValue;
  });

  container.innerHTML = sorted.map(hero => `
    <tr>
      <td>
        <div class="table-hero">
          <img
            src="${escapeHTML(hero.image || "")}"
            alt=""
            onerror="this.style.display='none'"
          >
          ${escapeHTML(hero.name)}
        </div>
      </td>
      <td>${getRate(hero.winRate)}</td>
      <td>${getRate(hero.pickRate)}</td>
      <td>${getRate(hero.banRate)}</td>
    </tr>
  `).join("");
}

/* META FILTERS */

document.getElementById("refreshStats").addEventListener(
  "click",
  loadHeroStats
);

document.getElementById("rankFilter").addEventListener(
  "change",
  loadHeroStats
);

document.getElementById("sortFilter").addEventListener(
  "change",
  () => {
    if (heroStats.length > 0) {
      renderMetaTable();
    } else {
      loadHeroStats();
    }
  }
);

/* RANK TARGET — LOCAL DEMO */

const rankSelect = document.getElementById("targetRank");
const rankMessage = document.getElementById("rankMessage");

const savedRank = localStorage.getItem("rankpulse_target");

if (savedRank) {
  rankSelect.value = savedRank;
}

document.getElementById("saveRank").addEventListener("click", () => {
  const value = rankSelect.value;

  if (!value) {
    rankMessage.textContent = "Please choose a target rank first.";
    return;
  }

  localStorage.setItem("rankpulse_target", value);

  rankMessage.textContent = `Your target rank is set to ${value}.`;
});

/* INITIALIZE WEBSITE */

function initializeRankPulse() {
  renderTeamSlots();
  renderBans();
  renderHeroPicker();
  renderDatabase();
  updateRecommendations();

  // Load public hero ranking data.
  loadHeroStats();
}

initializeRankPulse();
