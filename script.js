/* =========================================
   RANKPULSE — MAIN JAVASCRIPT
========================================= */

const SUPABASE_URL = "https://nwuyuncvtaliryuoqrap.supabase.co";
const SUPABASE_KEY = "PASTE_YOUR_EXISTING_PUBLISHABLE_KEY_HERE";
const API_BASE = "https://rankpulseapi.kaiiiiiiii6767.workers.dev/api";

const $ = id => document.getElementById(id);

const supabaseClient = window.supabase?.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;
let currentProfile = null;
let matches = JSON.parse(localStorage.getItem("rankpulse_matches") || "[]");
let heroes = [];
let allyPicks = Array(5).fill(null);
let enemyPicks = Array(5).fill(null);
let bans = Array(10).fill(null);

const RANKS = [
  "Warrior", "Elite", "Master", "Grandmaster", "Epic",
  "Legend", "Mythic", "Mythical Honor",
  "Mythical Glory", "Mythical Immortal"
];

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function message(id, text, error = false) {
  const element = $(id);
  if (!element) return;
  element.textContent = text;
  element.style.color = error ? "#ff5364" : "#08c5f5";
}

function saveMatches() {
  localStorage.setItem("rankpulse_matches", JSON.stringify(matches));
  renderMatches();
  updateDashboard();
}

function navigateTo(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));

  $("page-" + page)?.classList.add("active");
  document.querySelector(`[data-page="${page}"]`)?.classList.add("active");

  const button = document.querySelector(`[data-page="${page}"]`);
  $("topbarTitle").textContent = button?.textContent || page;

  if (page === "heroes" || page === "tierlist" || page === "movers") loadHeroes();
  if (page === "support") loadTickets();
  if (page === "friends") loadFriends();
  if (page === "admin") loadAdmin();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => navigateTo(button.dataset.page));
});

/* =========================================
   AUTHENTICATION
========================================= */

async function refreshAuth() {
  if (!supabaseClient) return;

  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) {
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    currentProfile = profile;

    const username =
      profile?.display_name ||
      profile?.username ||
      currentUser.email ||
      "Player";

    $("topAccountName").textContent = username;
    $("sidebarUsername").textContent = username;
    $("sidebarRole").textContent = profile?.role || "user";
    $("sidebarAvatar").textContent = username.charAt(0).toUpperCase();

    $("authStatus").textContent = "Signed in as " + username;
    $("authForms").style.display = "none";
    $("signOutButton").style.display = "inline-block";

    const isStaff = ["support", "admin", "owner"].includes(profile?.role);
    $("adminNavItem").style.display = isStaff ? "block" : "none";

    await checkRestriction();
  } else {
    currentProfile = null;
    $("topAccountName").textContent = "Guest";
    $("sidebarUsername").textContent = "Guest";
    $("sidebarRole").textContent = "Not signed in";
    $("sidebarAvatar").textContent = "?";
    $("authStatus").textContent = "You are not signed in.";
    $("authForms").style.display = "block";
    $("signOutButton").style.display = "none";
    $("adminNavItem").style.display = "none";
  }

  updateDashboard();
}

async function signUp() {
  if (!supabaseClient) return message("authStatus", "Supabase is not configured.", true);

  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  const username = $("authUsername").value.trim();

  if (!email || !password || !username) {
    return message("authStatus", "Enter your username, email and password.", true);
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: username }
    }
  });

  message("authStatus", error ? error.message : "Account created. Check your email if confirmation is enabled.", !!error);
}

async function signIn() {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: $("authEmail").value.trim(),
    password: $("authPassword").value
  });

  if (error) return message("authStatus", error.message, true);

  await refreshAuth();
}

async function oauth(provider) {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: location.origin }
  });

  if (error) message("authStatus", error.message, true);
}

async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  location.reload();
}

$("signUpButton").onclick = signUp;
$("signInButton").onclick = signIn;
$("signOutButton").onclick = signOut;
$("googleSignInButton").onclick = () => oauth("google");
$("discordSignInButton").onclick = () => oauth("discord");

async function checkRestriction() {
  if (!currentUser) return;

  const { data, error } = await supabaseClient
    .from("account_restrictions")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error || !data) return;

  if (data.status === "suspended" && data.suspended_until &&
      new Date(data.suspended_until) <= new Date()) {
    return;
  }

  alert(
    "Your RankPulse account is restricted.\n\nStatus: " +
    data.status + "\nReason: " + data.reason
  );
}

/* =========================================
   DASHBOARD AND MATCH HISTORY
========================================= */

function updateDashboard() {
  const total = matches.length;
  const wins = matches.filter(m => m.result === "win").length;
  const winRate = total ? (wins / total * 100).toFixed(1) : "0.0";

  const kills = matches.reduce((s, m) => s + Number(m.kills || 0), 0);
  const deaths = matches.reduce((s, m) => s + Number(m.deaths || 0), 0);
  const assists = matches.reduce((s, m) => s + Number(m.assists || 0), 0);

  $("overviewWinRate").textContent = winRate + "%";
  $("overviewMatches").textContent = total;
  $("overviewKDA").textContent =
    deaths ? ((kills + assists) / deaths).toFixed(2) :
    (kills + assists).toFixed(2);

  let streak = 0;
  for (const match of matches) {
    if (match.result !== "win") break;
    streak++;
  }

  $("overviewStreak").textContent = streak;
  $("recentMatches").innerHTML = total
    ? matches.slice(0, 5).map(matchHTML).join("")
    : "Your recent matches will appear here.";
}

function matchHTML(match) {
  return `<div class="recommendation">
    <strong>${escapeHTML(match.hero)}</strong>
    <span style="color:${match.result === "win" ? "#25c878" : "#ff5364"}">
      ${match.result === "win" ? "VICTORY" : "DEFEAT"}
    </span>
    <p>${match.kills}/${match.deaths}/${match.assists} · ${escapeHTML(match.mode)}</p>
    <button class="text-button" onclick="deleteMatch('${match.id}')">Delete</button>
  </div>`;
}

function renderMatches() {
  $("matchHistoryList").innerHTML = matches.length
    ? matches.map(matchHTML).join("")
    : '<div class="empty-state">No matches recorded yet.</div>';
}

function addMatch() {
  const hero = $("matchHero").value.trim();
  if (!hero) return alert("Enter a hero name.");

  matches.unshift({
    id: crypto.randomUUID(),
    hero,
    result: $("matchResult").value,
    kills: Math.max(0, Number($("matchKills").value)),
    deaths: Math.max(0, Number($("matchDeaths").value)),
    assists: Math.max(0, Number($("matchAssists").value)),
    mode: $("matchMode").value,
    date: new Date().toISOString()
  });

  $("matchHero").value = "";
  saveMatches();
}

function deleteMatch(id) {
  matches = matches.filter(m => m.id !== id);
  saveMatches();
}

$("addMatchButton").onclick = addMatch;

$("clearMatchesButton").onclick = () => {
  if (!confirm("Delete all match history on this device?")) return;
  matches = [];
  saveMatches();
};

/* =========================================
   RANK TARGET
========================================= */

$("saveRankTarget").onclick = () => {
  const current = $("currentRank").value;
  const target = $("targetRank").value;
  const stars = Number($("currentStars").value);

  if (RANKS.indexOf(target) < RANKS.indexOf(current)) {
    return message("rankTargetResult", "Your target rank is below your current rank.", true);
  }

  localStorage.setItem("rankpulse_current_rank", current);
  localStorage.setItem("rankpulse_current_stars", stars);
  localStorage.setItem("rankpulse_target", target);

  message("rankTargetResult", `Target saved: ${target}. Current rank: ${current}, ${stars} stars.`);
};

/* =========================================
   WIN RATE CALCULATOR
========================================= */

$("calculateWinRateButton").onclick = () => {
  const matchesPlayed = Number($("calcMatches").value);
  const rate = Number($("calcWinRate").value);
  const target = Number($("calcTargetWinRate").value);

  if (!Number.isInteger(matchesPlayed) || matchesPlayed <= 0 ||
      rate < 0 || rate > 100 || target <= 0 || target > 100) {
    return message("winRateResult", "Enter valid matches and percentages.", true);
  }

  const wins = Math.round(matchesPlayed * rate / 100);
  const actualRate = wins / matchesPlayed * 100;

  if (actualRate >= target) {
    return message("winRateResult", `You already have approximately ${actualRate.toFixed(2)}%.`);
  }

  if (target === 100) {
    return message("winRateResult", "You cannot reach 100% with a finite number of additional matches.", true);
  }

  const needed = Math.ceil((target * matchesPlayed - 100 * wins) / (100 - target));

  message("winRateResult",
    `Estimated current wins: ${wins}<br>
     Current calculated WR: ${actualRate.toFixed(2)}%<br>
     Wins needed in a row: ${needed}<br>
     Total matches afterward: ${matchesPlayed + needed}`
  );
};

/* =========================================
   RANK PROGRESS CALCULATOR
========================================= */

function rankPoints(rank, stars) {
  const index = RANKS.indexOf(rank);
  const offsets = [0, 3, 9, 21, 33, 45, 55, 80, 105, 155];
  return offsets[index] + stars;
}

$("calculateRankButton").onclick = () => {
  const currentRank = $("calcCurrentRank").value;
  const targetRank = $("calcTargetRank").value;
  const currentStars = Number($("calcCurrentStars").value);
  const targetStars = Number($("calcTargetStars").value);

  if (RANKS.indexOf(targetRank) < RANKS.indexOf(currentRank)) {
    return message("rankCalculatorResult", "Target rank must be above current rank.", true);
  }

  const difference = rankPoints(targetRank, targetStars) -
    rankPoints(currentRank, currentStars);

  message("rankCalculatorResult",
    difference >= 0
      ? `Estimated progress: ${difference} stars. Rank thresholds are approximate; check the current season rules.`
      : "Your target is below your current progress."
  );
};

/* =========================================
   HERO API
========================================= */

async function loadHeroes() {
  if (heroes.length) return renderHeroPages();

  $("heroGrid").innerHTML = "Loading heroes...";

  try {
    const rank = $("heroRankFilter").value || "all";
    const sort = $("heroSort").value || "win_rate";

    const response = await fetch(
      `${API_BASE}/heroes/rank?days=7&rank=${encodeURIComponent(rank)}&sort_field=${encodeURIComponent(sort)}&size=200`
    );

    if (!response.ok) throw new Error("Hero API returned " + response.status);

    const data = await response.json();
    heroes = data.data || data.heroes || data || [];

    if (!Array.isArray(heroes)) heroes = [];

    renderHeroPages();
  } catch (error) {
    $("heroGrid").textContent = "Could not load hero data: " + error.message;
  }
}

function heroName(hero) {
  return hero.name || hero.hero_name || hero.hero || "Unknown Hero";
}

function heroStat(hero, key) {
  return hero[key] ?? hero[key.replace("_", "")] ?? "—";
}

function renderHeroPages() {
  const search = ($("heroSearch").value || "").toLowerCase();
  const filtered = heroes.filter(h => heroName(h).toLowerCase().includes(search));

  $("heroGrid").innerHTML = filtered.map(h => `
    <div class="hero-card">
      <div style="padding:15px">
        <h3>${escapeHTML(heroName(h))}</h3>
        <p>Win Rate: ${escapeHTML(heroStat(h, "win_rate"))}</p>
        <p>Pick Rate: ${escapeHTML(heroStat(h, "pick_rate"))}</p>
        <p>Ban Rate: ${escapeHTML(heroStat(h, "ban_rate"))}</p>
      </div>
    </div>
  `).join("") || "No heroes found.";

  $("tierListContent").innerHTML = [...filtered]
    .sort((a, b) => Number(b.win_rate || 0) - Number(a.win_rate || 0))
    .map((h, i) => `<div class="recommendation">
      <strong>${i + 1}. ${escapeHTML(heroName(h))}</strong>
      <span> · WR ${escapeHTML(heroStat(h, "win_rate"))}</span>
    </div>`).join("");

  $("metaMovers").innerHTML =
    '<div class="empty-state">Historical comparisons require previous API snapshots.</div>';
}

$("heroSearch").addEventListener("input", renderHeroPages);
$("heroRankFilter").addEventListener("change", () => { heroes = []; loadHeroes(); });
$("heroSort").addEventListener("change", () => { heroes = []; loadHeroes(); });

/* =========================================
   DRAFT COUNTER
========================================= */

function renderDraft() {
  $("myTeamSlots").innerHTML = allyPicks.map((h, i) => `
    <button class="team-slot" onclick="chooseDraftHero('ally',${i})">
      ${h ? escapeHTML(h) : "＋ Choose ally " + (i + 1)}
    </button>`).join("");

  $("enemyTeamSlots").innerHTML = enemyPicks.map((h, i) => `
    <button class="team-slot" onclick="chooseDraftHero('enemy',${i})">
      ${h ? escapeHTML(h) : "＋ Choose enemy " + (i + 1)}
    </button>`).join("");

  $("banSlots").innerHTML = bans.map((h, i) => `
    <button class="ban-slot" onclick="chooseBan(${i})">
      ${h ? escapeHTML(h) : "Ban " + (i + 1)}
    </button>`).join("");

  const selected = [...allyPicks, ...enemyPicks, ...bans].filter(Boolean);
  const available = heroes
    .map(heroName)
    .filter(name => !selected.includes(name));

  $("recommendations").innerHTML = available.slice(0, 12).map(name =>
    `<button class="recommendation" onclick="addRecommendedHero('${escapeHTML(name).replace(/'/g, "\\'")}')">${escapeHTML(name)}</button>`
  ).join("") || "Load heroes to see suggestions.";
}

function chooseDraftHero(team, index) {
  const choices = heroes.map(heroName).filter(Boolean);
  const name = prompt("Type a hero name:\n" + choices.slice(0, 30).join(", "));
  if (!name) return;

  if (!choices.some(h => h.toLowerCase() === name.toLowerCase())) {
    return alert("Hero not found in loaded hero data.");
  }

  if (team === "ally") allyPicks[index] = name;
  else enemyPicks[index] = name;

  renderDraft();
}

function chooseBan(index) {
  const name = prompt("Enter hero to ban:");
  if (!name) return;
  bans[index] = name;
  renderDraft();
}

function addRecommendedHero(name) {
  const index = allyPicks.findIndex(h => !h);
  if (index < 0) return alert("Your team slots are full.");
  allyPicks[index] = name;
  renderDraft();
}

$("draftLane").onchange = renderDraft;
$("pickOrder").onchange = renderDraft;
$("laneOnly").onchange = renderDraft;

/* =========================================
   SUPPORT TICKETS
========================================= */

async function loadTickets() {
  if (!currentUser) {
    $("ticketList").textContent = "Sign in to view your tickets.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("support_tickets")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) return message("ticketStatus", error.message, true);

  $("ticketList").innerHTML = (data || []).map(ticket => `
    <div class="recommendation">
      <strong>${escapeHTML(ticket.subject)}</strong>
      <p>${escapeHTML(ticket.message)}</p>
      <small>Status: ${escapeHTML(ticket.status)}</small>
      <button class="text-button" onclick="loadReplies('${ticket.id}')">View Replies</button>
      <div id="replies-${ticket.id}"></div>
      <input class="input-field" id="reply-${ticket.id}" placeholder="Write a reply">
      <button class="outline-button" onclick="sendReply('${ticket.id}')">Send Reply</button>
    </div>
  `).join("") || "No support tickets yet.";
}

$("submitTicketButton").onclick = async () => {
  if (!currentUser) return message("ticketStatus", "Sign in first.", true);

  const subject = $("ticketSubject").value.trim();
  const body = $("ticketMessage").value.trim();

  if (!subject || !body) return message("ticketStatus", "Fill in both fields.", true);

  const { error } = await supabaseClient.from("support_tickets").insert({
    user_id: currentUser.id,
    subject,
    message: body,
    status: "open"
  });

  if (error) return message("ticketStatus", error.message, true);

  $("ticketSubject").value = "";
  $("ticketMessage").value = "";
  message("ticketStatus", "Ticket submitted.");
  loadTickets();
};

async function loadReplies(ticketId) {
  const { data, error } = await supabaseClient
    .from("support_replies")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at");

  if (error) return alert(error.message);

  $("replies-" + ticketId).innerHTML = (data || []).map(r =>
    `<p>${escapeHTML(r.message)}</p>`
  ).join("") || "No replies yet.";
}

async function sendReply(ticketId) {
  const input = $("reply-" + ticketId);
  const text = input.value.trim();
  if (!text || !currentUser) return;

  const { error } = await supabaseClient.from("support_replies").insert({
    ticket_id: ticketId,
    user_id: currentUser.id,
    message: text
  });

  if (error) return alert(error.message);

  input.value = "";
  loadReplies(ticketId);
}

/* =========================================
   FRIEND SEARCH
========================================= */

async function loadFriends() {
  if (!currentUser) {
    $("friendResults").textContent = "Sign in to use friends.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("friend_requests")
    .select("*")
    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

  if (error) return message("friendResults", error.message, true);

  $("friendRequests").innerHTML = (data || []).map(r =>
    `<div class="recommendation">
      ${escapeHTML(r.status || "Friend request")}
    </div>`
  ).join("");
}

$("friendSearchButton").onclick = async () => {
  if (!currentUser) return message("friendResults", "Sign in first.", true);

  const term = $("friendSearch").value.trim();
  if (!term) return;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,username,display_name")
    .ilike("username", `%${term}%`)
    .limit(20);

  if (error) return message("friendResults", error.message, true);

  $("friendResults").innerHTML = (data || [])
    .filter(p => p.id !== currentUser.id)
    .map(p => `
      <div class="recommendation">
        <strong>${escapeHTML(p.display_name || p.username)}</strong>
        <button class="outline-button" onclick="sendFriendRequest('${p.id}')">Add Friend</button>
      </div>`).join("") || "No users found.";
};

async function sendFriendRequest(receiverId) {
  const { error } = await supabaseClient.from("friend_requests").insert({
    sender_id: currentUser.id,
    receiver_id: receiverId,
    status: "pending"
  });

  alert(error ? error.message : "Friend request sent.");
}

/* =========================================
   ADMIN DASHBOARD
========================================= */

async function loadAdmin() {
  if (!currentUser || !currentProfile ||
      !["owner", "admin", "support"].includes(currentProfile.role)) {
    return message("adminAccessMessage", "You do not have permission to access this dashboard.", true);
  }

  message("adminAccessMessage", "Signed in as " + currentProfile.role);

  const { count: users } = await supabaseClient
    .from("profiles").select("*", { count: "exact", head: true });

  const { count: tickets } = await supabaseClient
    .from("support_tickets").select("*", { count: "exact", head: true })
    .eq("status", "open");

  const { count: restricted } = await supabaseClient
    .from("account_restrictions").select("*", { count: "exact", head: true });

  $("adminTotalUsers").textContent = users ?? "—";
  $("adminOpenTickets").textContent = tickets ?? "—";
  $("adminRestrictedUsers").textContent = restricted ?? "—";

  await loadAdminTickets();
  await loadRestrictionHistory();
}

$("adminUserSearchButton").onclick = async () => {
  if (!["owner", "admin"].includes(currentProfile?.role)) {
    return message("adminUserResults", "Only admins and owners can search users.", true);
  }

  const term = $("adminUserSearch").value.trim();

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,username,display_name,role")
    .ilike("username", `%${term}%`)
    .limit(30);

  if (error) return message("adminUserResults", error.message, true);

  $("adminUserResults").innerHTML = (data || []).map(user => `
    <div class="recommendation">
      <strong>${escapeHTML(user.display_name || user.username)}</strong>
      <p>${escapeHTML(user.role)} · ${escapeHTML(user.id)}</p>
    </div>`).join("") || "No users found.";
};

async function loadAdminTickets() {
  const { data, error } = await supabaseClient
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return message("adminTicketList", error.message, true);

  $("adminTicketList").innerHTML = (data || []).map(t => `
    <div class="recommendation">
      <strong>${escapeHTML(t.subject)}</strong>
      <p>${escapeHTML(t.message)}</p>
      <p>Status: ${escapeHTML(t.status)}</p>
      <button class="outline-button" onclick="changeTicketStatus('${t.id}','open')">Open</button>
      <button class="outline-button" onclick="changeTicketStatus('${t.id}','closed')">Close</button>
      <input class="input-field" id="staff-reply-${t.id}" placeholder="Reply to ticket">
      <button class="primary-button" onclick="staffReply('${t.id}')">Reply</button>
    </div>
  `).join("") || "No tickets.";
}

async function changeTicketStatus(id, status) {
  if (!["owner", "admin", "support"].includes(currentProfile?.role)) return;

  const { error } = await supabaseClient
    .from("support_tickets").update({ status }).eq("id", id);

  if (error) return alert(error.message);
  loadAdminTickets();
}

async function staffReply(ticketId) {
  if (!["owner", "admin", "support"].includes(currentProfile?.role)) return;

  const input = $("staff-reply-" + ticketId);
  const text = input.value.trim();
  if (!text) return;

  const { error } = await supabaseClient.from("support_replies").insert({
    ticket_id: ticketId,
    user_id: currentUser.id,
    message: text
  });

  if (error) return alert(error.message);

  input.value = "";
  alert("Reply sent.");
}

$("applyRestrictionButton").onclick = async () => {
  if (!["owner", "admin"].includes(currentProfile?.role)) {
    return message("restrictionStatus", "Only admins and owners can restrict accounts.", true);
  }

  const userId = $("restrictionUserId").value.trim();
  const action = $("restrictionAction").value;
  const reason = $("restrictionReason").value.trim();

  if (!userId) return message("restrictionStatus", "Enter the user ID.", true);
  if (userId === currentUser.id) return message("restrictionStatus", "You cannot restrict your own account.", true);
  if (!reason) return message("restrictionStatus", "Enter a reason.", true);

  if (!confirm("Confirm this account action?")) return;

  if (action === "unbanned") {
    const { error } = await supabaseClient
      .from("account_restrictions").delete().eq("user_id", userId);

    if (error) return message("restrictionStatus", error.message, true);

    await supabaseClient.from("account_restriction_history").insert({
      user_id: userId,
      action: "unbanned",
      reason,
      performed_by: currentUser.id
    });
  } else {
    const duration = Number($("restrictionDuration").value);
    const until = action === "suspended" && duration > 0
      ? new Date(Date.now() + duration * 3600000).toISOString()
      : null;

    const { error } = await supabaseClient
      .from("account_restrictions")
      .upsert({
        user_id: userId,
        status: action,
        reason,
        suspended_until: until,
        restricted_by: currentUser.id,
        restricted_at: new Date().toISOString()
      });

    if (error) return message("restrictionStatus", error.message, true);

    await supabaseClient.from("account_restriction_history").insert({
      user_id: userId,
      action,
      reason,
      performed_by: currentUser.id
    });
  }

  message("restrictionStatus", "Action saved to the database.");
  loadAdmin();
};

async function loadRestrictionHistory() {
  if (!["owner", "admin"].includes(currentProfile?.role)) return;

  const { data, error } = await supabaseClient
    .from("account_restriction_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return message("restrictionHistory", error.message, true);

  $("restrictionHistory").innerHTML = (data || []).map(r =>
    `<div class="recommendation">
      ${escapeHTML(r.action)} — ${escapeHTML(r.reason)}
      <p>${escapeHTML(r.user_id)}</p>
    </div>`
  ).join("") || "No restriction history.";
}

/* =========================================
   INITIALIZATION
========================================= */

async function initialize() {
  if (!supabaseClient || SUPABASE_KEY.includes("PASTE_")) {
    message("authStatus", "Add your existing Supabase publishable key in script.js.", true);
  } else {
    await refreshAuth();

    supabaseClient.auth.onAuthStateChange(() => {
      setTimeout(refreshAuth, 0);
    });
  }

  renderMatches();
  updateDashboard();
  renderDraft();
}

initialize();
