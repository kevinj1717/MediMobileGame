const saveKeys = [
  "realmGold",
  "realmEmbers",
  "realmSigils",
  "castleIndex",
  "siegePower",
  "claimedCastles",
  "sortWon",
  "dragonWon",
  "bestMoves",
  "sortLevel",
  "dragonLevel"
];

const urlParams = new URLSearchParams(location.search);
if (urlParams.get("reset") === "1") {
  saveKeys.forEach((key) => localStorage.removeItem(key));
  urlParams.delete("reset");
  const cleanQuery = urlParams.toString();
  location.replace(`${location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}`);
}

const state = {
  gold: Number(localStorage.getItem("realmGold") || 0),
  embers: Number(localStorage.getItem("realmEmbers") || 0),
  sigils: Number(localStorage.getItem("realmSigils") || 0),
  castleIndex: Number(localStorage.getItem("castleIndex") || 0),
  siegePower: Number(localStorage.getItem("siegePower") || 0),
  claimedCastles: Number(localStorage.getItem("claimedCastles") || 0),
  sortWon: localStorage.getItem("sortWon") === "true",
  dragonWon: localStorage.getItem("dragonWon") === "true",
  bestMoves: localStorage.getItem("bestMoves") || "\u2014",
  sortLevel: Number(localStorage.getItem("sortLevel") || 1),
  dragonLevel: Number(localStorage.getItem("dragonLevel") || 1)
};

const sortLevelPreview = Number(urlParams.get("sortLevel"));
if (Number.isFinite(sortLevelPreview) && sortLevelPreview > 0) state.sortLevel = Math.min(99, Math.floor(sortLevelPreview));

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const castles = [
  {
    name: "Blackthorn Keep",
    region: "The Frost Marches",
    target: 120,
    story: "Break the walls, bind the shrines, and reclaim the first banner of the realm.",
    council: "Blackthorn's walls are old, but the wards beneath them still bite. Send rune-keepers to quiet the magic or call dragonfire to crack the shields.",
    runeMission: "Unbind the gate wards",
    dragonMission: "Shatter the outer shields"
  },
  {
    name: "Greywatch Citadel",
    region: "The Ashen Vale",
    target: 165,
    story: "Ash-veiled towers guard the old trade roads. The siege engines need hotter fire and sharper magic.",
    council: "Greywatch hides its command hall behind oath-runes and emberproof barricades. The army needs both sabotage and fire.",
    runeMission: "Turn the oath-runes",
    dragonMission: "Burn the ash barricades"
  },
  {
    name: "Stormmere Hold",
    region: "The Broken Coast",
    target: 215,
    story: "Sea winds batter the battlements while warded shields hide the keep's command hall.",
    council: "Stormmere's sea wards scatter every assault. Anchor the runes, then let the dragon drive fire through the breach.",
    runeMission: "Anchor the sea wards",
    dragonMission: "Open the harbor breach"
  },
  {
    name: "Nightspire",
    region: "The Crownless North",
    target: 280,
    story: "The last fortress drinks the stars. Every ember and sigil must strike as one.",
    council: "Nightspire is the final wound in the realm. Every house sigil and every ember must be spent with purpose.",
    runeMission: "Bind the star sigils",
    dragonMission: "Break the night shields"
  }
];

function currentCastle() {
  return castles[Math.min(state.castleIndex, castles.length - 1)];
}

function castleDifficultyBonus() {
  return Math.min(6, state.castleIndex * 2);
}

function runeSiegeReward(level = state.sortLevel) {
  return 24 + (state.castleIndex * 6) + Math.floor(level * 1.5);
}

function dragonSiegeReward(level = state.dragonLevel) {
  return 32 + (state.castleIndex * 8) + Math.floor(level * 2);
}

function siegePhase(progress) {
  if (progress >= 67) return "The keep is buckling. One decisive strike could bring the banners down.";
  if (progress >= 34) return "The outer wall is broken. Push through the gatehouse before the defenders rally.";
  return "The army is forming its first breach. Choose how to weaken the castle.";
}

function addSiegeProgress(amount) {
  const castle = currentCastle();
  state.siegePower += amount;
  if (state.siegePower < castle.target) return null;

  const claimedCastle = castle;
  state.claimedCastles = Math.max(state.claimedCastles, state.castleIndex + 1);
  if (state.castleIndex < castles.length - 1) {
    state.castleIndex++;
    state.siegePower = 0;
  } else {
    state.siegePower = castle.target;
  }
  return claimedCastle;
}

function claimedCastleCopy(claimedCastle, source) {
  const nextCastle = currentCastle();
  const sourceLine = source === "runes"
    ? "Paper sigils whirl across the gate, the last ward snaps, and the siege engines roll forward."
    : "A paper dragon arcs overhead, fire streaks across the battlements, and the walls split open.";
  if (claimedCastle === nextCastle) {
    return `${sourceLine} Your banner unfurls above ${claimedCastle.name}. The realm bends its knee.`;
  }
  return `${sourceLine} Your banner unfurls above ${claimedCastle.name}. The road now leads to ${nextCastle.name} in ${nextCastle.region}.`;
}

function showCastleFinale(claimedCastle, source = "runes") {
  if (!claimedCastle) return;
  const finale = $("#castle-finale");
  const nextCastle = currentCastle();
  $("#finale-kicker").textContent = source === "runes" ? "Paper Siege · Wards Broken" : "Paper Siege · Walls Broken";
  $("#finale-title").textContent = `${claimedCastle.name} Falls`;
  $("#finale-copy").textContent = claimedCastleCopy(claimedCastle, source);
  finale.classList.remove("hidden");
  finale.classList.remove("ember-finale", "rune-finale", "traveling");
  finale.classList.add(source === "dragon" ? "ember-finale" : "rune-finale");
  setTimeout(() => {
    if (finale.classList.contains("hidden")) return;
    finale.classList.add("traveling");
    $("#finale-kicker").textContent = "Interlude · On the Road";
    if (nextCastle === claimedCastle) {
      $("#finale-title").textContent = "The Realm Is Yours";
      $("#finale-copy").textContent = "The last banner flies. The roads are quiet, the fires are warm, and the realm remembers your name.";
    } else {
      $("#finale-title").textContent = `March to ${nextCastle.name}`;
      $("#finale-copy").textContent = `The army folds its paper tents and follows the road into ${nextCastle.region}. A harder siege waits beyond the hills.`;
    }
  }, 5200);
}

function saveState() {
  localStorage.setItem("realmGold", state.gold);
  localStorage.setItem("realmEmbers", state.embers);
  localStorage.setItem("realmSigils", state.sigils);
  localStorage.setItem("castleIndex", state.castleIndex);
  localStorage.setItem("siegePower", state.siegePower);
  localStorage.setItem("claimedCastles", state.claimedCastles);
  localStorage.setItem("sortWon", state.sortWon);
  localStorage.setItem("dragonWon", state.dragonWon);
  localStorage.setItem("bestMoves", state.bestMoves);
  localStorage.setItem("sortLevel", state.sortLevel);
  localStorage.setItem("dragonLevel", state.dragonLevel);
}

function updateRealm() {
  const castle = currentCastle();
  const renown = Math.max(1, state.claimedCastles + 1);
  const progress = Math.min(100, Math.round((state.siegePower / castle.target) * 100));
  const phase = siegePhase(progress);
  $("#renown").textContent = renown;
  $("#gold").textContent = state.gold;
  $("#embers").textContent = state.embers;
  $("#sigils").textContent = state.sigils;
  $("#best-moves").textContent = state.bestMoves;
  $("#realm-region").textContent = castle.region;
  $("#castle-name").textContent = `Siege ${castle.name}`;
  $("#castle-copy").textContent = castle.story;
  $("#siege-castle").textContent = castle.name;
  $("#council-title").textContent = `${castle.name} War Council`;
  $("#council-copy").textContent = `${phase} ${castle.council}`;
  $("#restore-percent").textContent = `${progress}%`;
  $("#restore-bar").style.width = `${progress}%`;
  $("#siege-status").textContent = `${Math.min(state.siegePower, castle.target)} / ${castle.target} siege power`;
  $("#milestone-1").classList.toggle("complete", progress >= 34);
  $("#milestone-2").classList.toggle("complete", progress >= 67);
  $("#milestone-3").classList.toggle("complete", progress >= 100);
  $("#sort-tier").textContent = `Trial I \u00b7 Level ${state.sortLevel}`;
  $("#dragon-tier").textContent = `Trial II \u00b7 Level ${state.dragonLevel}`;
  $("#sort-mission-title").textContent = castle.runeMission;
  $("#dragon-mission-title").textContent = castle.dragonMission;
  $("#sort-preview").textContent = `${sortLevelSummary(state.sortLevel)} \u00b7 +${runeSiegeReward()} sigils for the siege`;
  $("#dragon-preview").textContent = `${dragonLevelSummary(state.dragonLevel)} \u00b7 +${dragonSiegeReward()} embers for the siege`;
}

function showScreen(id) {
  $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
  $$(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.go === id));
  window.scrollTo(0, 0);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-go]");
  if (target) {
    $("#castle-finale")?.classList.add("hidden");
    showScreen(target.dataset.go);
  }
});

// Rune sorting
const runeColors = ["red", "blue", "gold", "green", "violet", "white", "crimson"];
const runeSymbols = { red: "\u25c6", blue: "\u2744", gold: "\u2600", green: "\u2667", violet: "\u2726", white: "\u2727", crimson: "\u2739" };
let towers = [];
let selectedTower = null;
let moves = 0;
let runeMoving = false;
let sortConfig = null;
let chargedTower = null;
let chargedColor = null;
let megaCelebration = false;

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sortLevelConfig(level) {
  const effectiveLevel = level + castleDifficultyBonus();
  const colors = Math.min(6, 4 + Math.floor((effectiveLevel - 1) / 3));
  const emptyTowers = 2;
  return {
    level,
    colors,
    emptyTowers,
    capacity: 4,
    activeColors: runeColors.slice(0, colors)
  };
}

function sortLevelSummary(level) {
  const config = sortLevelConfig(level);
  return `${config.colors} rune houses \u00b7 ${config.colors + config.emptyTowers} shrines`;
}

function dragonLevelSummary(level) {
  const config = dragonLevelConfig(level);
  return `${config.targets} shields \u00b7 ${config.obstacles} relics \u00b7 ${config.balls} fireballs`;
}

function newSortGame() {
  if (runeMoving) return;
  sortConfig = sortLevelConfig(state.sortLevel);
  let pile;
  do {
    pile = shuffled(sortConfig.activeColors.flatMap((color) => Array(sortConfig.capacity).fill(color)));
    towers = [];
    for (let i = 0; i < sortConfig.colors; i++) towers.push(pile.slice(i * sortConfig.capacity, (i + 1) * sortConfig.capacity));
    for (let i = 0; i < sortConfig.emptyTowers; i++) towers.push([]);
  } while (towers.slice(0, sortConfig.colors).some((tower) => new Set(tower).size === 1));
  selectedTower = null;
  runeMoving = false;
  megaCelebration = false;
  moves = 0;
  $("#sort-level").textContent = state.sortLevel;
  $("#sort-instruction").textContent = `${sortLevelSummary(state.sortLevel)}. Attune each house to a matching shrine.`;
  $("#moves").textContent = moves;
  $("#sort-message").classList.add("hidden");
  renderTowers();
}

function renderTowers() {
  const board = $("#towers");
  board.innerHTML = "";
  const rowCount = Math.ceil(towers.length / 3);
  board.style.gridTemplateRows = `repeat(${rowCount}, minmax(0, 1fr))`;
  board.classList.remove("last-row-1", "last-row-2", "rows-2", "rows-3", "rows-4");
  board.classList.add(`rows-${rowCount}`);
  board.classList.toggle("mega-complete", megaCelebration);
  const finalRowCount = towers.length % 3;
  if (finalRowCount) board.classList.add(`last-row-${finalRowCount}`);
  towers.forEach((runes, index) => {
    const button = document.createElement("button");
    const complete = runes.length === sortConfig.capacity && new Set(runes).size === 1;
    const completeColor = complete ? runes[0] : "";
    button.className = `tower${selectedTower === index ? " selected" : ""}${complete ? " complete" : ""}${completeColor ? ` ${completeColor}` : ""}${chargedTower === index ? " charged" : ""}${!runes.length ? " empty" : ""}${runes.length === sortConfig.capacity ? " full" : ""}`;
    button.style.setProperty("--tower-index", index);
    button.setAttribute("aria-label", `Shrine ${index + 1}, ${runes.length} runes`);
    button.innerHTML = `${chargedTower === index && chargedColor ? `<span class="symbol-burst ${chargedColor}" aria-hidden="true">${Array.from({ length: 8 }, (_, burstIndex) => `<i style="--burst-index:${burstIndex}">${runeSymbols[chargedColor]}</i>`).join("")}</span>` : ""}<span class="rune-slots" aria-hidden="true">${Array.from({ length: sortConfig.capacity }, () => "<i></i>").join("")}</span><span class="runes">${runes.map((color) =>
      `<i class="rune ${color}" data-symbol="${runeSymbols[color]}"></i>`).join("")}</span>`;
    button.addEventListener("click", () => chooseTower(index));
    board.appendChild(button);
  });
}

async function animateRuneMove(sourceIndex, destinationIndex) {
  const board = $("#towers");
  const towerElements = $$(".tower");
  const sourceRune = towerElements[sourceIndex].querySelector(".rune:last-child");
  const destinationTower = towerElements[destinationIndex];
  if (!sourceRune || !destinationTower) return;

  const start = sourceRune.getBoundingClientRect();
  const destinationRunes = destinationTower.querySelector(".runes");
  const destinationRect = destinationRunes.getBoundingClientRect();
  const destinationCount = towers[destinationIndex].length;
  const endX = destinationRect.left + (destinationRect.width - start.width) / 2;
  const endY = destinationRect.bottom - start.height * (destinationCount + 1) - destinationCount;
  const flyingRune = sourceRune.cloneNode(true);
  flyingRune.classList.add("flying-rune");
  flyingRune.style.left = `${start.left}px`;
  flyingRune.style.top = `${start.top}px`;
  flyingRune.style.width = `${start.width}px`;
  flyingRune.style.height = `${start.height}px`;
  document.body.appendChild(flyingRune);
  sourceRune.style.visibility = "hidden";
  board.classList.add("moving");

  await new Promise((resolve) => {
    requestAnimationFrame(() => {
      flyingRune.style.transform = `translate(${(endX - start.left) * .45}px, -52px) scale(1.08)`;
      setTimeout(() => {
        flyingRune.style.transform = `translate(${endX - start.left}px, ${endY - start.top}px) scale(.98)`;
      }, 180);
    });
    setTimeout(resolve, 520);
  });

  flyingRune.remove();
  destinationTower.classList.add("settle");
  setTimeout(() => destinationTower.classList.remove("settle"), 260);
  board.classList.remove("moving");
}

function showInvalidMove(index) {
  const tower = $$(".tower")[index];
  tower.classList.remove("invalid");
  requestAnimationFrame(() => tower.classList.add("invalid"));
}

async function chooseTower(index) {
  if (runeMoving) return;
  if (selectedTower === null) {
    if (!towers[index].length) return;
    selectedTower = index;
    renderTowers();
    return;
  }
  if (selectedTower === index) {
    selectedTower = null;
    renderTowers();
    return;
  }
  const source = towers[selectedTower];
  const destination = towers[index];
  const color = source[source.length - 1];
  if (destination.length < sortConfig.capacity && (!destination.length || destination[destination.length - 1] === color)) {
    runeMoving = true;
    await animateRuneMove(selectedTower, index);
    destination.push(source.pop());
    const destinationComplete = destination.length === sortConfig.capacity && new Set(destination).size === 1;
    if (destinationComplete) {
      chargedTower = index;
      chargedColor = color;
    }
    moves++;
    $("#moves").textContent = moves;
    runeMoving = false;
  } else {
    showInvalidMove(index);
  }
  selectedTower = null;
  renderTowers();
  if (chargedTower !== null) {
    const justCharged = chargedTower;
    setTimeout(() => {
      const tower = $$(".tower")[justCharged];
      if (tower) tower.classList.remove("charged");
      if (chargedTower === justCharged) {
        chargedTower = null;
        chargedColor = null;
      }
    }, 950);
  }
  if (towers.every((tower) => !tower.length || (tower.length === sortConfig.capacity && new Set(tower).size === 1))) winSort();
}

function winSort() {
  megaCelebration = true;
  renderTowers();
  const megaSymbols = sortConfig.activeColors.flatMap((color, colorIndex) =>
    Array.from({ length: 2 }, (_, orbitIndex) => `<span class="${color}" style="--mega-index:${(colorIndex * 2) + orbitIndex}; --mega-orbit:${orbitIndex}">${runeSymbols[color]}</span>`)
  ).join("");
  $("#towers").insertAdjacentHTML("beforeend", `<div class="mega-burst" aria-hidden="true"><i class="mega-ring one"></i><i class="mega-ring two"></i><i class="mega-rays"></i>${megaSymbols}<em>✦</em><em>✧</em><em>✦</em><em>✧</em><em>✦</em><em>✧</em></div>`);
  const reward = runeSiegeReward();
  const claimed = addSiegeProgress(reward);
  state.sigils += reward;
  state.gold += 75 + state.sortLevel * 20;
  state.sortWon = true;
  if (state.bestMoves === "\u2014" || moves < Number(state.bestMoves)) state.bestMoves = moves;
  state.sortLevel++;
  $("#sort-result-copy").textContent = claimed
    ? `${claimed.name} is claimed. The host raises your banner and the war council marks the next march.`
    : `+${reward} siege sigils pulse through the war camp. ${currentCastle().name} is ${Math.min(100, Math.round((state.siegePower / currentCastle().target) * 100))}% broken.`;
  saveState();
  updateRealm();
  if (claimed) setTimeout(() => showCastleFinale(claimed, "runes"), 4700);
  setTimeout(() => $("#sort-message").classList.remove("hidden"), 4200);
}

$("#restart-sort").addEventListener("click", newSortGame);
$("#play-sort-again").addEventListener("click", newSortGame);

// Dragonfire physics
const canvas = $("#dragon-canvas");
const ctx = canvas.getContext("2d");
let pegs, ball, ballsLeft, score, aiming, aimX, aimY, gameOver, animationId, ballFrames, particles;
let charging = false;
let chargeStart = 0;
let chargePower = 0;
let chargeAnimationId = null;
let activePointerId = null;
let screenShake = 0;
let dragonSceneTick = 0;
const launcher = { x: 195, y: 38 };

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function dragonLevelConfig(level) {
  const effectiveLevel = level + castleDifficultyBonus();
  return {
    level,
    targets: Math.min(12, 6 + Math.floor(effectiveLevel * .8)),
    obstacles: Math.min(14, 8 + Math.floor(effectiveLevel * 1.05)),
    balls: Math.min(13, 9 + Math.floor((effectiveLevel - 1) / 3)),
    targetHp: Math.min(3, 1 + Math.floor(effectiveLevel / 5))
  };
}

function generateDragonLayout(level) {
  const config = dragonLevelConfig(level);
  const slots = [];
  const rows = [
    { y: 118, count: 4, minX: 62, maxX: 328 },
    { y: 188, count: 3, minX: 100, maxX: 290 },
    { y: 260, count: 4, minX: 54, maxX: 336 },
    { y: 332, count: 3, minX: 105, maxX: 285 },
    { y: 405, count: 4, minX: 60, maxX: 330 },
    { y: 472, count: 3, minX: 105, maxX: 285 }
  ];
  rows.forEach((row) => {
    for (let i = 0; i < row.count; i++) {
      const t = row.count === 1 ? .5 : i / (row.count - 1);
      slots.push({
        x: row.minX + (row.maxX - row.minX) * t + randomRange(-15, 15),
        y: row.y + randomRange(-16, 16)
      });
    }
  });
  const chosen = shuffled(slots).slice(0, config.targets + config.obstacles);
  return chosen.map((slot, index) => [slot.x, slot.y, index < config.targets ? 1 : 0]);
}

function newDragonGame() {
  cancelAnimationFrame(animationId);
  cancelAnimationFrame(chargeAnimationId);
  const config = dragonLevelConfig(state.dragonLevel);
  const layout = generateDragonLayout(state.dragonLevel);
  pegs = layout.map(([x, y, target]) => ({
    x, y, r: target ? 21 : 12, target: Boolean(target),
    hp: target ? config.targetHp : 1, hit: false, glow: 0, cooldown: 0,
    rotation: Math.random() * Math.PI
  }));
  particles = [];
  ball = null;
  ballFrames = 0;
  screenShake = 0;
  dragonSceneTick = 0;
  ballsLeft = config.balls;
  score = 0;
  aiming = true;
  charging = false;
  chargeStart = 0;
  chargePower = 0;
  activePointerId = null;
  aimX = 195;
  aimY = 245;
  gameOver = false;
  $("#dragon-level").textContent = state.dragonLevel;
  $("#dragon-instruction").textContent = `${dragonLevelSummary(state.dragonLevel)}. Hold to charge, drag to aim, release to burn.`;
  $("#dragon-message").classList.add("hidden");
  updatePowerMeter();
  updateDragonStats();
  drawDragon();
}

function updateDragonStats() {
  $("#balls-left").textContent = ballsLeft;
  $("#targets-left").textContent = pegs.filter((p) => p.target && !p.hit).length;
  $("#dragon-score").textContent = score;
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const pointer = event.touches ? event.touches[0] : event;
  return {
    x: (pointer.clientX - rect.left) * canvas.width / rect.width,
    y: (pointer.clientY - rect.top) * canvas.height / rect.height
  };
}

function setAim(event) {
  if (!aiming || gameOver) return;
  event.preventDefault();
  const point = pointerPosition(event);
  aimX = Math.max(12, Math.min(378, point.x));
  aimY = Math.max(82, point.y);
  drawDragon();
}

function currentChargePower() {
  if (!charging) return chargePower;
  return Math.min(1, (performance.now() - chargeStart) / 1150);
}

function updatePowerMeter() {
  const fill = $("#power-fill");
  const label = $("#power-label");
  if (!fill || !label) return;
  const percent = Math.round(chargePower * 100);
  fill.style.width = `${percent}%`;
  label.textContent = charging ? `Dragonfire ${percent}%` : "Hold to charge";
}

function animateCharge() {
  if (!charging) return;
  dragonSceneTick++;
  chargePower = currentChargePower();
  updatePowerMeter();
  drawDragon();
  chargeAnimationId = requestAnimationFrame(animateCharge);
}

function startCharge(event) {
  if (!aiming || gameOver || ball) return;
  event.preventDefault();
  activePointerId = event.pointerId;
  canvas.setPointerCapture?.(event.pointerId);
  setAim(event);
  charging = true;
  chargeStart = performance.now();
  chargePower = .12;
  animateCharge();
}

function moveCharge(event) {
  if (!aiming || gameOver) return;
  if (activePointerId !== null && event.pointerId !== activePointerId) return;
  setAim(event);
}

function releaseCharge(event) {
  if (!aiming || gameOver || !charging) return;
  if (activePointerId !== null && event.pointerId !== activePointerId) return;
  event.preventDefault();
  setAim(event);
  launchCharged();
  activePointerId = null;
}

function cancelCharge() {
  charging = false;
  chargePower = 0;
  activePointerId = null;
  cancelAnimationFrame(chargeAnimationId);
  updatePowerMeter();
  drawDragon();
}

function launchCharged() {
  cancelAnimationFrame(chargeAnimationId);
  chargePower = Math.max(.18, currentChargePower());
  charging = false;
  const dx = aimX - launcher.x;
  const dy = Math.max(48, aimY - launcher.y);
  const length = Math.hypot(dx, dy);
  const speed = 2.05 + chargePower * 2.15;
  ball = { x: launcher.x, y: launcher.y, vx: dx / length * speed, vy: dy / length * speed, r: 9, trail: [], power: chargePower };
  ballFrames = 0;
  ballsLeft--;
  aiming = false;
  chargePower = 0;
  updatePowerMeter();
  updateDragonStats();
  animateDragon();
}

canvas.addEventListener("pointerdown", startCharge);
canvas.addEventListener("pointermove", moveCharge);
canvas.addEventListener("pointerup", releaseCharge);
canvas.addEventListener("pointercancel", cancelCharge);
canvas.addEventListener("pointerleave", (event) => {
  if (charging && event.pointerType === "mouse") releaseCharge(event);
});

function animateDragon() {
  if (!ball) return;
  updateBall();
  updateParticles();
  dragonSceneTick++;
  screenShake *= .84;
  drawDragon();
  if (ball) animationId = requestAnimationFrame(animateDragon);
}

function updateBall() {
  ballFrames++;
  ball.vy += 0.047;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 18) ball.trail.shift();

  if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * .96; }
  if (ball.x > canvas.width - ball.r) { ball.x = canvas.width - ball.r; ball.vx = -Math.abs(ball.vx) * .96; }

  for (const peg of pegs) {
    if (peg.cooldown > 0) peg.cooldown--;
    if (peg.hit) continue;
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = ball.r + peg.r;
    if (distance < minDistance && peg.cooldown <= 0) {
      const nx = dx / (distance || 1);
      const ny = dy / (distance || 1);
      ball.x = peg.x + nx * minDistance;
      ball.y = peg.y + ny * minDistance;
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx = (ball.vx - 2 * dot * nx) * .98;
      ball.vy = (ball.vy - 2 * dot * ny) * .98;
      peg.hp--;
      peg.hit = peg.hp <= 0;
      peg.glow = 1;
      peg.cooldown = 12;
      screenShake = Math.max(screenShake, peg.hit ? 8 : 3.5);
      spawnImpact(peg.x, peg.y, peg.target, peg.hit);
      score += peg.target ? (peg.hit ? 500 : 175) : 100;
      updateDragonStats();
    }
  }

  if (ball.y > canvas.height + 20 || ballFrames > 1800) {
    ball = null;
    const remaining = pegs.some((peg) => peg.target && !peg.hit);
    if (!remaining) finishDragon(true);
    else if (ballsLeft <= 0) finishDragon(false);
    else aiming = true;
    drawDragon();
  }
}

function spawnImpact(x, y, icy, destroyed) {
  const count = destroyed ? 36 : 16;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (destroyed ? 2.2 : 1.2) + Math.random() * (destroyed ? 5.2 : 2.4);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - .6,
      life: 1,
      decay: .025 + Math.random() * .025,
      size: 2 + Math.random() * (destroyed ? 6 : 3.5),
      spin: randomRange(-.2, .2),
      rotation: Math.random() * Math.PI,
      type: icy ? (destroyed ? "ice-shard" : "frost-spark") : "ember",
      color: icy ? (Math.random() > .45 ? "#9ee8ff" : "#e8fbff") : (Math.random() > .5 ? "#ffb13b" : "#6d7785")
    });
  }
  if (destroyed) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x, y,
        vx: randomRange(-1.2, 1.2),
        vy: randomRange(-1.6, .4),
        life: 1,
        decay: .018 + Math.random() * .012,
        size: 18 + Math.random() * 18,
        spin: 0,
        rotation: 0,
        type: icy ? "frost-ring" : "smoke-ring",
        color: icy ? "#a6edff" : "#ff9a32"
      });
    }
  }
}

function updateParticles() {
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += particle.type === "frost-ring" ? .015 : .07;
    particle.vx *= .985;
    particle.rotation += particle.spin || 0;
    particle.life -= particle.decay;
  });
  particles = particles.filter((particle) => particle.life > 0);
}

function finishDragon(won) {
  gameOver = true;
  $("#dragon-result").textContent = won ? "Winter is broken" : "The shields endure";
  $("#dragon-result-copy").textContent = won ? "The siege engines glow with fresh dragonfire." : "The dragon circles. Call it back for another assault.";
  if (won) {
    const reward = dragonSiegeReward();
    const claimed = addSiegeProgress(reward);
    state.embers += reward;
    state.gold += 25 + state.dragonLevel * 10;
    state.dragonWon = true;
    state.dragonLevel++;
    $("#dragon-result-copy").textContent = claimed
      ? `${claimed.name} falls under dragonfire. The host raises your banner and the war council marks the next march.`
      : `+${reward} embers fuel the siege. ${currentCastle().name} is ${Math.min(100, Math.round((state.siegePower / currentCastle().target) * 100))}% broken.`;
    saveState();
    updateRealm();
    if (claimed) setTimeout(() => showCastleFinale(claimed, "dragon"), 900);
  }
  setTimeout(() => $("#dragon-message").classList.remove("hidden"), 350);
}

function roundedRectPath(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
}

function drawStarPolygon(radius, innerRadius, points) {
  ctx.beginPath();
  for (let point = 0; point < points * 2; point++) {
    const angle = point / (points * 2) * Math.PI * 2 - Math.PI / 2;
    const r = point % 2 ? innerRadius : radius;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawDragonBackdrop() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#304968");
  gradient.addColorStop(.42, "#142233");
  gradient.addColorStop(.78, "#0a1019");
  gradient.addColorStop(1, "#05070b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const skyGlow = ctx.createRadialGradient(194, 74, 8, 194, 74, 245);
  skyGlow.addColorStop(0, "#ffd67832");
  skyGlow.addColorStop(.32, "#8fdcff18");
  skyGlow.addColorStop(1, "transparent");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 60; i++) {
    const starX = (i * 83 + 17) % 390;
    const starY = (i * 137 + 21) % 505;
    const twinkle = .35 + Math.sin(dragonSceneTick * .035 + i) * .18;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = i % 9 === 0 ? "#fff5c8" : "#d9f6ff";
    ctx.beginPath();
    ctx.arc(starX, starY, i % 8 === 0 ? 1.8 : 1.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const moon = ctx.createRadialGradient(315, 72, 7, 315, 72, 44);
  moon.addColorStop(0, "#fff3bc");
  moon.addColorStop(.45, "#d4c68b");
  moon.addColorStop(1, "#726e5a00");
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(315, 72, 44, 0, Math.PI * 2);
  ctx.fill();

  const mist = ctx.createLinearGradient(0, 360, 0, 520);
  mist.addColorStop(0, "transparent");
  mist.addColorStop(.55, "#85d9ff10");
  mist.addColorStop(1, "#05070b00");
  ctx.fillStyle = mist;
  ctx.fillRect(0, 340, 390, 190);

  ctx.fillStyle = "#0d1420";
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.lineTo(44, 445);
  ctx.lineTo(84, 464);
  ctx.lineTo(135, 430);
  ctx.lineTo(185, 462);
  ctx.lineTo(242, 420);
  ctx.lineTo(302, 462);
  ctx.lineTo(346, 438);
  ctx.lineTo(390, 472);
  ctx.lineTo(390, 570);
  ctx.lineTo(0, 570);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#09101a";
  ctx.beginPath();
  ctx.moveTo(0, 492);
  ctx.lineTo(62, 464);
  ctx.lineTo(126, 490);
  ctx.lineTo(205, 452);
  ctx.lineTo(280, 492);
  ctx.lineTo(390, 458);
  ctx.lineTo(390, 570);
  ctx.lineTo(0, 570);
  ctx.closePath();
  ctx.fill();

  const ground = ctx.createLinearGradient(0, 508, 0, 570);
  ground.addColorStop(0, "#101927");
  ground.addColorStop(.62, "#070b10");
  ground.addColorStop(1, "#040609");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 508, 390, 62);
  for (let x = 0; x < 390; x += 48) {
    ctx.fillStyle = "#111927";
    roundedRectPath(ctx, x, 507, 36, 30, 3);
    ctx.fill();
    ctx.fillStyle = "#05080d";
    ctx.fillRect(x + 5, 498, 8, 15);
    ctx.fillRect(x + 23, 498, 8, 15);
    ctx.fillStyle = "#d9ae5520";
    ctx.fillRect(x + 3, 507, 2, 30);
  }
}

function drawAimPreview() {
  if (aiming && !gameOver) {
    const previewPower = charging ? Math.max(.18, chargePower) : .45;
    const dx = aimX - launcher.x, dy = aimY - launcher.y;
    const length = Math.hypot(dx, dy);
    const speed = 2.05 + previewPower * 2.15;
    let px = launcher.x, py = launcher.y;
    let vx = dx / length * speed, vy = dy / length * speed;
    ctx.setLineDash([3, 8]);
    ctx.strokeStyle = charging ? "#ffe49bdd" : "#bfeeff99";
    ctx.lineWidth = charging ? 3.4 : 2.2;
    ctx.shadowBlur = charging ? 16 : 8;
    ctx.shadowColor = charging ? "#ffb13b" : "#78dcff";
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let step = 0; step < 92; step++) {
      vy += .047;
      px += vx;
      py += vy;
      if (px < 8 || px > 382 || py > 555) break;
      if (step % 2 === 0) ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = .22 + previewPower * .32;
    ctx.strokeStyle = "#ff9a32";
    ctx.lineWidth = 8 + previewPower * 10;
    ctx.beginPath();
    ctx.moveTo(launcher.x, launcher.y);
    ctx.lineTo(launcher.x + dx / length * (36 + previewPower * 34), launcher.y + dy / length * (36 + previewPower * 34));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawCrystalShield(peg) {
  const damage = peg.hp <= 1 ? 1 : 0;
  ctx.save();
  ctx.translate(peg.x, peg.y);
  ctx.rotate(peg.rotation + Math.sin(dragonSceneTick * .018 + peg.x) * .025);
  ctx.scale(1, .96);

  ctx.globalAlpha = .32;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(3, peg.r + 7, peg.r * 1.15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.shadowBlur = 24 + (peg.glow || 0) * 24;
  ctx.shadowColor = "#74e5ff";
  drawStarPolygon(peg.r * 1.24, peg.r * .74, 8);
  const ice = ctx.createRadialGradient(-8, -10, 2, 2, 3, peg.r * 1.42);
  ice.addColorStop(0, "#ffffff");
  ice.addColorStop(.24, "#a8f1ff");
  ice.addColorStop(.58, damage ? "#53abd1" : "#347fc0");
  ice.addColorStop(1, damage ? "#174168" : "#102b61");
  ctx.fillStyle = ice;
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = "#e7fbff";
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = .42;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-peg.r * .35, -peg.r * .85);
  ctx.lineTo(peg.r * .18, -peg.r * .18);
  ctx.lineTo(-peg.r * .8, peg.r * .04);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = damage ? "#ffffff" : "#d9fbff90";
  ctx.lineWidth = damage ? 2 : 1.1;
  ctx.beginPath();
  ctx.moveTo(-4, -peg.r * .86);
  ctx.lineTo(2, -peg.r * .25);
  ctx.lineTo(-7, peg.r * .1);
  ctx.lineTo(5, peg.r * .72);
  ctx.moveTo(2, -peg.r * .25);
  ctx.lineTo(peg.r * .56, -1);
  ctx.stroke();

  ctx.fillStyle = "#efffff";
  ctx.font = "bold 16px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 11;
  ctx.shadowColor = "#ffffff";
  ctx.fillText("\u2744", 0, 1);
  ctx.restore();
}

function drawRelicPeg(peg) {
  ctx.save();
  ctx.translate(peg.x, peg.y);
  ctx.rotate(peg.rotation + dragonSceneTick * .005);

  ctx.globalAlpha = .3;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(2, peg.r + 6, peg.r * 1.25, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.shadowBlur = 13;
  ctx.shadowColor = "#ff9d32";
  const ring = ctx.createRadialGradient(-4, -5, 1, 0, 0, peg.r * 1.2);
  ring.addColorStop(0, "#ffe2a6");
  ring.addColorStop(.35, "#b9782d");
  ring.addColorStop(.72, "#4c2b1e");
  ring.addColorStop(1, "#15100f");
  ctx.fillStyle = ring;
  ctx.strokeStyle = "#f5bd68";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, peg.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#261612";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-7, -5); ctx.lineTo(7, 5);
  ctx.moveTo(7, -5); ctx.lineTo(-7, 5);
  ctx.stroke();
  ctx.restore();
}

function drawParticle(particle) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, particle.life);
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.rotation || 0);
  ctx.shadowBlur = particle.type === "frost-ring" ? 20 : 10;
  ctx.shadowColor = particle.color;
  if (particle.type === "frost-ring" || particle.type === "smoke-ring") {
    ctx.globalAlpha = particle.life * .35;
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * (1.15 - particle.life), 0, Math.PI * 2);
    ctx.stroke();
  } else if (particle.type === "ice-shard") {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.moveTo(0, -particle.size);
    ctx.lineTo(particle.size * .45, particle.size * .3);
    ctx.lineTo(0, particle.size * .8);
    ctx.lineTo(-particle.size * .45, particle.size * .3);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(0, 0, particle.size * particle.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFireball() {
  if (!ball) return;
  ball.trail.forEach((point, index) => {
    const strength = index / ball.trail.length;
    const flame = ctx.createRadialGradient(point.x, point.y, 1, point.x, point.y, 4 + strength * 10);
    flame.addColorStop(0, `rgba(255, 241, 164, ${strength * .65})`);
    flame.addColorStop(.45, `rgba(255, 119, 25, ${strength * .42})`);
    flame.addColorStop(1, "rgba(255, 46, 10, 0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4 + strength * 10, 0, Math.PI * 2);
    ctx.fill();
  });

  const flameAngle = Math.atan2(ball.vy, ball.vx);
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(flameAngle);
  ctx.shadowBlur = 34;
  ctx.shadowColor = "#ff4b16";
  const outer = ctx.createLinearGradient(-ball.r * 4, 0, ball.r, 0);
  outer.addColorStop(0, "#ff2a0800");
  outer.addColorStop(.28, "#ff4416");
  outer.addColorStop(.72, "#ffaf25");
  outer.addColorStop(1, "#fff4ba");
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.moveTo(-ball.r * 4.2, 0);
  ctx.quadraticCurveTo(-ball.r * 1.8, -ball.r * 1.35, ball.r * .95, 0);
  ctx.quadraticCurveTo(-ball.r * 1.8, ball.r * 1.35, -ball.r * 4.2, 0);
  ctx.fill();

  ctx.fillStyle = "#fff6c7";
  ctx.beginPath();
  ctx.arc(0, 0, ball.r * .78, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ff7b24";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawLauncher() {
  if (!aiming || gameOver || ball) return;
  const pulse = charging ? .82 + chargePower * .9 : .86 + Math.sin(dragonSceneTick * .05) * .04;
  ctx.save();
  ctx.translate(launcher.x, launcher.y);

  ctx.globalAlpha = .4;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 18, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#8e6730";
  ctx.lineWidth = 5;
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#d9ae55";
  ctx.beginPath();
  ctx.arc(0, 0, 24, Math.PI * .18, Math.PI * .82);
  ctx.stroke();

  ctx.shadowBlur = charging ? 30 + chargePower * 36 : 18;
  ctx.shadowColor = "#ff7b27";
  const orb = ctx.createRadialGradient(-3, -4, 1, 0, 0, 14 + chargePower * 13);
  orb.addColorStop(0, "#fffdf0");
  orb.addColorStop(.26, "#fff0a8");
  orb.addColorStop(.58, "#ff8b2c");
  orb.addColorStop(1, "#7d1807");
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(0, 0, 9 * pulse + chargePower * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff1a877";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 17 + chargePower * 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  ctx.shadowBlur = 0;
}

function drawDragon() {
  const shakeX = screenShake ? randomRange(-screenShake, screenShake) : 0;
  const shakeY = screenShake ? randomRange(-screenShake, screenShake) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawDragonBackdrop();
  drawAimPreview();

  pegs
    .filter((peg) => !peg.hit)
    .sort((a, b) => a.y - b.y)
    .forEach((peg) => {
      if (peg.target) drawCrystalShield(peg);
      else drawRelicPeg(peg);
      peg.glow *= .86;
    });

  particles.forEach(drawParticle);
  drawFireball();
  drawLauncher();
  ctx.restore();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

$("#restart-dragon").addEventListener("click", newDragonGame);
$("#play-dragon-again").addEventListener("click", newDragonGame);
window.addEventListener("resize", () => { if ($("#dragon-screen").classList.contains("active")) drawDragon(); });

window.shatteredRealm = {
  state,
  saveState,
  updateRealm,
  dragonLevelConfig,
  dragonLevelSummary,
  runeSiegeReward,
  dragonSiegeReward,
  addSiegeProgress,
  currentCastle,
  showCastleFinale,
  randomRange,
  shuffled
};

updateRealm();
newSortGame();
newDragonGame();
