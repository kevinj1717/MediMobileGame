const state = {
  gold: Number(localStorage.getItem("realmGold") || 0),
  embers: Number(localStorage.getItem("realmEmbers") || 0),
  sortWon: localStorage.getItem("sortWon") === "true",
  dragonWon: localStorage.getItem("dragonWon") === "true",
  bestMoves: localStorage.getItem("bestMoves") || "\u2014",
  sortLevel: Number(localStorage.getItem("sortLevel") || 1),
  dragonLevel: Number(localStorage.getItem("dragonLevel") || 1)
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function saveState() {
  localStorage.setItem("realmGold", state.gold);
  localStorage.setItem("realmEmbers", state.embers);
  localStorage.setItem("sortWon", state.sortWon);
  localStorage.setItem("dragonWon", state.dragonWon);
  localStorage.setItem("bestMoves", state.bestMoves);
  localStorage.setItem("sortLevel", state.sortLevel);
  localStorage.setItem("dragonLevel", state.dragonLevel);
}

function updateRealm() {
  const renown = Math.max(1, Math.floor((state.sortLevel + state.dragonLevel) / 2));
  $("#renown").textContent = renown;
  $("#gold").textContent = state.gold;
  $("#embers").textContent = state.embers;
  $("#best-moves").textContent = state.bestMoves;
  const progress = Math.min(100, ((state.sortLevel - 1) * 8) + ((state.dragonLevel - 1) * 8) + (state.sortWon ? 15 : 0) + (state.dragonWon ? 15 : 0));
  $("#restore-percent").textContent = `${progress}%`;
  $("#restore-bar").style.width = `${progress}%`;
  $("#milestone-1").classList.toggle("complete", progress >= 34);
  $("#milestone-2").classList.toggle("complete", progress >= 67);
  $("#milestone-3").classList.toggle("complete", progress >= 100);
  $("#sort-tier").textContent = `Trial I \u00b7 Level ${state.sortLevel}`;
  $("#dragon-tier").textContent = `Trial II \u00b7 Level ${state.dragonLevel}`;
  $("#sort-preview").textContent = sortLevelSummary(state.sortLevel);
  $("#dragon-preview").textContent = dragonLevelSummary(state.dragonLevel);
}

function showScreen(id) {
  $$(".screen").forEach((screen) => screen.classList.toggle("active", screen.id === id));
  $$(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.go === id));
  window.scrollTo(0, 0);
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-go]");
  if (target) showScreen(target.dataset.go);
});

// Rune sorting
const runeColors = ["red", "blue", "gold", "green", "violet", "white", "crimson"];
const runeSymbols = { red: "\u25c6", blue: "\u2744", gold: "\u2600", green: "\u2667", violet: "\u2726", white: "\u2727", crimson: "\u2739" };
let towers = [];
let selectedTower = null;
let moves = 0;
let runeMoving = false;
let sortConfig = null;

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sortLevelConfig(level) {
  const colors = Math.min(7, 4 + Math.floor((level - 1) / 2));
  const emptyTowers = level >= 6 ? 3 : 2;
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
  return `${config.colors} rune houses \u00b7 ${config.colors + config.emptyTowers} towers`;
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
  moves = 0;
  $("#sort-level").textContent = state.sortLevel;
  $("#sort-instruction").textContent = `${sortLevelSummary(state.sortLevel)}. Gather each house upon a single spire.`;
  $("#moves").textContent = moves;
  $("#sort-message").classList.add("hidden");
  renderTowers();
}

function renderTowers() {
  const board = $("#towers");
  board.innerHTML = "";
  board.style.gridTemplateRows = `repeat(${Math.ceil(towers.length / 3)}, minmax(0, 1fr))`;
  towers.forEach((runes, index) => {
    const button = document.createElement("button");
    button.className = `tower${selectedTower === index ? " selected" : ""}`;
    button.setAttribute("aria-label", `Tower ${index + 1}, ${runes.length} runes`);
    button.innerHTML = `<span class="runes">${runes.map((color) =>
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
      flyingRune.style.transform = `translate(${endX - start.left}px, -38px)`;
      setTimeout(() => {
        flyingRune.style.transform = `translate(${endX - start.left}px, ${endY - start.top}px)`;
      }, 180);
    });
    setTimeout(resolve, 520);
  });

  flyingRune.remove();
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
    moves++;
    $("#moves").textContent = moves;
    runeMoving = false;
  } else {
    showInvalidMove(index);
  }
  selectedTower = null;
  renderTowers();
  if (towers.every((tower) => !tower.length || (tower.length === sortConfig.capacity && new Set(tower).size === 1))) winSort();
}

function winSort() {
  state.gold += 75 + state.sortLevel * 25;
  state.sortWon = true;
  if (state.bestMoves === "\u2014" || moves < Number(state.bestMoves)) state.bestMoves = moves;
  state.sortLevel++;
  saveState();
  updateRealm();
  setTimeout(() => $("#sort-message").classList.remove("hidden"), 300);
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
const launcher = { x: 195, y: 38 };

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function dragonLevelConfig(level) {
  return {
    level,
    targets: Math.min(12, 6 + Math.floor(level * .8)),
    obstacles: Math.min(14, 8 + Math.floor(level * 1.05)),
    balls: Math.min(13, 9 + Math.floor((level - 1) / 3)),
    targetHp: Math.min(3, 1 + Math.floor(level / 5))
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
  const count = destroyed ? 24 : 11;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (destroyed ? 1.8 : 1) + Math.random() * (destroyed ? 4 : 2);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - .6,
      life: 1,
      decay: .025 + Math.random() * .025,
      size: 2 + Math.random() * (destroyed ? 5 : 3),
      color: icy ? (Math.random() > .45 ? "#9ee8ff" : "#e8fbff") : (Math.random() > .5 ? "#ffb13b" : "#6d7785")
    });
  }
}

function updateParticles() {
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += .07;
    particle.vx *= .985;
    particle.life -= particle.decay;
  });
  particles = particles.filter((particle) => particle.life > 0);
}

function finishDragon(won) {
  gameOver = true;
  $("#dragon-result").textContent = won ? "Winter is broken" : "The shields endure";
  $("#dragon-result-copy").textContent = won ? "The braziers of Blackthorn burn again." : "The dragon circles. Call it back for another assault.";
  if (won) {
    state.embers += 50 + state.dragonLevel * 25;
    state.gold += 25 + state.dragonLevel * 10;
    state.dragonWon = true;
    state.dragonLevel++;
    saveState();
    updateRealm();
  }
  setTimeout(() => $("#dragon-message").classList.remove("hidden"), 350);
}

function drawDragon() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#263d5a");
  gradient.addColorStop(.45, "#111e2d");
  gradient.addColorStop(1, "#070a10");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const skyGlow = ctx.createRadialGradient(195, 72, 10, 195, 72, 210);
  skyGlow.addColorStop(0, "#ffbf4a24");
  skyGlow.addColorStop(.38, "#6bb8ff12");
  skyGlow.addColorStop(1, "transparent");
  ctx.fillStyle = skyGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff12";
  for (let i = 0; i < 46; i++) {
    const starX = (i * 83) % 390;
    const starY = (i * 137) % 510;
    ctx.globalAlpha = .25 + ((i % 5) * .08);
    ctx.fillRect(starX, starY, i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#0c1118";
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

  ctx.fillStyle = "#070b10";
  ctx.fillRect(0, 530, 390, 40);
  for (let x = 0; x < 390; x += 48) {
    ctx.fillRect(x, 510, 35, 25);
    ctx.fillRect(x + 4, 502, 8, 12);
    ctx.fillRect(x + 23, 502, 8, 12);
  }

  if (aiming && !gameOver) {
    const previewPower = charging ? Math.max(.18, chargePower) : .45;
    const dx = aimX - launcher.x, dy = aimY - launcher.y;
    const length = Math.hypot(dx, dy);
    const speed = 2.05 + previewPower * 2.15;
    let px = launcher.x, py = launcher.y;
    let vx = dx / length * speed, vy = dy / length * speed;
    ctx.setLineDash([4, 9]);
    ctx.strokeStyle = charging ? "#ffd476dd" : "#e8c57488";
    ctx.lineWidth = charging ? 3 : 2;
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

    ctx.globalAlpha = .22 + previewPower * .32;
    ctx.strokeStyle = "#ff9a32";
    ctx.lineWidth = 8 + previewPower * 10;
    ctx.beginPath();
    ctx.moveTo(launcher.x, launcher.y);
    ctx.lineTo(launcher.x + dx / length * (36 + previewPower * 34), launcher.y + dy / length * (36 + previewPower * 34));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  pegs.forEach((peg) => {
    if (peg.hit) return;
    ctx.save();
    ctx.translate(peg.x, peg.y);
    ctx.rotate(peg.rotation);
    if (peg.target) {
      ctx.shadowBlur = 22;
      ctx.shadowColor = "#65d7ff";
      const ice = ctx.createRadialGradient(-5, -7, 2, 0, 0, peg.r);
      ice.addColorStop(0, "#efffff");
      ice.addColorStop(.32, "#79dfff");
      ice.addColorStop(.72, "#2767a0");
      ice.addColorStop(1, "#102d5a");
      ctx.fillStyle = ice;
      ctx.strokeStyle = "#dffaff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let point = 0; point < 8; point++) {
        const angle = point / 8 * Math.PI * 2 - Math.PI / 2;
        const radius = point % 2 ? peg.r * .72 : peg.r;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (peg.hp === 1) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-3, -15); ctx.lineTo(1, -5); ctx.lineTo(-5, 2); ctx.lineTo(4, 13);
        ctx.moveTo(1, -5); ctx.lineTo(10, -1);
        ctx.stroke();
      }
      ctx.fillStyle = "#efffff";
      ctx.font = "bold 15px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u2744", 0, 1);
    } else {
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#ff9d32";
      const ember = ctx.createRadialGradient(-3, -4, 1, 0, 0, peg.r);
      ember.addColorStop(0, "#fff0a1");
      ember.addColorStop(.3, "#e99a31");
      ember.addColorStop(.72, "#70401e");
      ember.addColorStop(1, "#211716");
      ctx.fillStyle = ember;
      ctx.strokeStyle = "#f5bd68";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, peg.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#3a251d";
      ctx.beginPath();
      ctx.moveTo(-7, -5); ctx.lineTo(7, 5);
      ctx.moveTo(7, -5); ctx.lineTo(-7, 5);
      ctx.stroke();
    }
    ctx.restore();
  });
  ctx.shadowBlur = 0;

  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.shadowBlur = 8;
    ctx.shadowColor = particle.color;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  if (ball) {
    ball.trail.forEach((point, index) => {
      const strength = index / ball.trail.length;
      ctx.fillStyle = `rgba(255, ${70 + index * 8}, 20, ${strength * .55})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + strength * 6, 0, Math.PI * 2);
      ctx.fill();
    });
    const flameAngle = Math.atan2(ball.vy, ball.vx);
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(flameAngle);
    ctx.shadowBlur = 28;
    ctx.shadowColor = "#ff4b16";
    ctx.fillStyle = "#ff541c";
    ctx.beginPath();
    ctx.moveTo(-ball.r * 3.2, 0);
    ctx.quadraticCurveTo(-ball.r * 1.4, -ball.r * 1.15, ball.r * .8, 0);
    ctx.quadraticCurveTo(-ball.r * 1.4, ball.r * 1.15, -ball.r * 3.2, 0);
    ctx.fill();
    ctx.fillStyle = "#ffb52d";
    ctx.beginPath();
    ctx.moveTo(-ball.r * 2, 0);
    ctx.quadraticCurveTo(-ball.r * .8, -ball.r * .75, ball.r * .9, 0);
    ctx.quadraticCurveTo(-ball.r * .8, ball.r * .75, -ball.r * 2, 0);
    ctx.fill();
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#fff3a0";
    ctx.fillStyle = "#fff5ba";
    ctx.beginPath();
    ctx.arc(0, 0, ball.r * .72, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  } else if (aiming && !gameOver) {
    const pulse = charging ? .75 + chargePower * .9 : .85;
    ctx.save();
    ctx.translate(launcher.x, launcher.y);
    ctx.shadowBlur = charging ? 24 + chargePower * 30 : 18;
    ctx.shadowColor = "#ff7b27";
    const orb = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12 + chargePower * 11);
    orb.addColorStop(0, "#fff8c6");
    orb.addColorStop(.35, "#ffd063");
    orb.addColorStop(.72, "#ff6b1f");
    orb.addColorStop(1, "#7d1807");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(0, 0, 8 * pulse + chargePower * 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff1a877";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 15 + chargePower * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
  }
}

$("#restart-dragon").addEventListener("click", newDragonGame);
$("#play-dragon-again").addEventListener("click", newDragonGame);
window.addEventListener("resize", () => { if ($("#dragon-screen").classList.contains("active")) drawDragon(); });

updateRealm();
newSortGame();
newDragonGame();
