const state = {
  gold: Number(localStorage.getItem("realmGold") || 0),
  embers: Number(localStorage.getItem("realmEmbers") || 0),
  sortWon: localStorage.getItem("sortWon") === "true",
  dragonWon: localStorage.getItem("dragonWon") === "true",
  bestMoves: localStorage.getItem("bestMoves") || "—"
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function saveState() {
  localStorage.setItem("realmGold", state.gold);
  localStorage.setItem("realmEmbers", state.embers);
  localStorage.setItem("sortWon", state.sortWon);
  localStorage.setItem("dragonWon", state.dragonWon);
  localStorage.setItem("bestMoves", state.bestMoves);
}

function updateRealm() {
  $("#gold").textContent = state.gold;
  $("#embers").textContent = state.embers;
  $("#best-moves").textContent = state.bestMoves;
  const progress = (state.sortWon ? 34 : 0) + (state.dragonWon ? 33 : 0);
  $("#restore-percent").textContent = `${progress}%`;
  $("#restore-bar").style.width = `${progress}%`;
  $("#milestone-1").classList.toggle("complete", progress >= 34);
  $("#milestone-2").classList.toggle("complete", progress >= 67);
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
const runeColors = ["red", "blue", "gold", "green"];
const runeSymbols = { red: "◆", blue: "❄", gold: "☀", green: "♧" };
let towers = [];
let selectedTower = null;
let moves = 0;
let runeMoving = false;

function shuffled(values) {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function newSortGame() {
  if (runeMoving) return;
  let pile;
  do {
    pile = shuffled(runeColors.flatMap((color) => Array(4).fill(color)));
    towers = [pile.slice(0, 4), pile.slice(4, 8), pile.slice(8, 12), pile.slice(12, 16), [], []];
  } while (towers.slice(0, 4).some((tower) => new Set(tower).size === 1));
  selectedTower = null;
  runeMoving = false;
  moves = 0;
  $("#moves").textContent = moves;
  $("#sort-message").classList.add("hidden");
  renderTowers();
}

function renderTowers() {
  const board = $("#towers");
  board.innerHTML = "";
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
  if (destination.length < 4 && (!destination.length || destination[destination.length - 1] === color)) {
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
  if (towers.every((tower) => !tower.length || (tower.length === 4 && new Set(tower).size === 1))) winSort();
}

function winSort() {
  if (!state.sortWon) state.gold += 100;
  state.sortWon = true;
  if (state.bestMoves === "—" || moves < Number(state.bestMoves)) state.bestMoves = moves;
  saveState();
  updateRealm();
  setTimeout(() => $("#sort-message").classList.remove("hidden"), 300);
}

$("#restart-sort").addEventListener("click", newSortGame);
$("#play-sort-again").addEventListener("click", newSortGame);

// Dragonfire physics
const canvas = $("#dragon-canvas");
const ctx = canvas.getContext("2d");
let pegs, ball, ballsLeft, score, aiming, aimX, aimY, gameOver, animationId, ballFrames;

function newDragonGame() {
  cancelAnimationFrame(animationId);
  const layout = [
    [65, 135, 0], [145, 125, 1], [235, 125, 0], [325, 135, 1],
    [105, 210, 1], [195, 205, 0], [285, 210, 1],
    [55, 290, 0], [145, 285, 1], [235, 285, 0], [335, 290, 1],
    [105, 370, 0], [195, 365, 1], [285, 370, 0],
    [65, 445, 1], [155, 440, 0], [245, 440, 1], [325, 445, 0]
  ];
  pegs = layout.map(([x, y, target]) => ({ x, y, r: target ? 15 : 11, target: Boolean(target), hit: false, glow: 0 }));
  ball = null;
  ballFrames = 0;
  ballsLeft = 7;
  score = 0;
  aiming = true;
  aimX = 195;
  aimY = 220;
  gameOver = false;
  $("#dragon-message").classList.add("hidden");
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
  aimY = Math.max(65, point.y);
  drawDragon();
}

function launch(event) {
  if (!aiming || gameOver) return;
  setAim(event);
  const dx = aimX - 195;
  const dy = Math.max(35, aimY - 35);
  const length = Math.hypot(dx, dy);
  ball = { x: 195, y: 35, vx: dx / length * 3.2, vy: dy / length * 3.2, r: 8, trail: [] };
  ballFrames = 0;
  ballsLeft--;
  aiming = false;
  updateDragonStats();
  animateDragon();
}

canvas.addEventListener("mousemove", setAim);
canvas.addEventListener("click", launch);
canvas.addEventListener("touchmove", setAim, { passive: false });
canvas.addEventListener("touchend", (event) => {
  const touch = event.changedTouches[0];
  launch({ preventDefault() {}, clientX: touch.clientX, clientY: touch.clientY });
});

function animateDragon() {
  if (!ball) return;
  updateBall();
  drawDragon();
  if (ball) animationId = requestAnimationFrame(animateDragon);
}

function updateBall() {
  ballFrames++;
  ball.vy += 0.055;
  ball.x += ball.vx;
  ball.y += ball.vy;
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 14) ball.trail.shift();

  if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * .9; }
  if (ball.x > canvas.width - ball.r) { ball.x = canvas.width - ball.r; ball.vx = -Math.abs(ball.vx) * .9; }

  for (const peg of pegs) {
    if (peg.hit) continue;
    const dx = ball.x - peg.x;
    const dy = ball.y - peg.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = ball.r + peg.r;
    if (distance < minDistance) {
      const nx = dx / (distance || 1);
      const ny = dy / (distance || 1);
      ball.x = peg.x + nx * minDistance;
      ball.y = peg.y + ny * minDistance;
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx = (ball.vx - 2 * dot * nx) * .94;
      ball.vy = (ball.vy - 2 * dot * ny) * .94;
      peg.hit = true;
      peg.glow = 1;
      score += peg.target ? 500 : 100;
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

function finishDragon(won) {
  gameOver = true;
  $("#dragon-result").textContent = won ? "Winter is broken" : "The shields endure";
  $("#dragon-result-copy").textContent = won ? "The braziers of Blackthorn burn again." : "The dragon circles. Call it back for another assault.";
  if (won) {
    if (!state.dragonWon) { state.embers += 75; state.gold += 50; }
    state.dragonWon = true;
    saveState();
    updateRealm();
  }
  setTimeout(() => $("#dragon-message").classList.remove("hidden"), 350);
}

function drawDragon() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1e3046");
  gradient.addColorStop(.65, "#101a26");
  gradient.addColorStop(1, "#090e14");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff0b";
  for (let i = 0; i < 35; i++) ctx.fillRect((i * 83) % 390, (i * 137) % 530, 2, 2);

  ctx.fillStyle = "#070b10";
  ctx.fillRect(0, 530, 390, 40);
  for (let x = 0; x < 390; x += 48) {
    ctx.fillRect(x, 510, 35, 25);
    ctx.fillRect(x + 4, 502, 8, 12);
    ctx.fillRect(x + 23, 502, 8, 12);
  }

  if (aiming && !gameOver) {
    const dx = aimX - 195, dy = aimY - 35;
    const length = Math.hypot(dx, dy);
    ctx.setLineDash([5, 8]);
    ctx.strokeStyle = "#e8c57488";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(195, 35);
    ctx.lineTo(195 + dx / length * 95, 35 + dy / length * 95);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  pegs.forEach((peg) => {
    if (peg.hit) return;
    ctx.shadowBlur = peg.target ? 18 : 8;
    ctx.shadowColor = peg.target ? "#6ec5ff" : "#f0b34e";
    ctx.fillStyle = peg.target ? "#417ca6" : "#9f6c28";
    ctx.strokeStyle = peg.target ? "#b9e7ff" : "#f3c773";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (peg.target) {
      ctx.fillStyle = "#d9f1ff";
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("❄", peg.x, peg.y + 1);
    }
  });
  ctx.shadowBlur = 0;

  if (ball) {
    ball.trail.forEach((point, index) => {
      ctx.fillStyle = `rgba(244, 109, 38, ${index / ball.trail.length * .45})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2 + index / 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#ff7b27";
    ctx.fillStyle = "#ffe09a";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (aiming && !gameOver) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ff7b27";
    ctx.fillStyle = "#ffd27b";
    ctx.beginPath();
    ctx.arc(195, 35, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

$("#restart-dragon").addEventListener("click", newDragonGame);
$("#play-dragon-again").addEventListener("click", newDragonGame);
window.addEventListener("resize", () => { if ($("#dragon-screen").classList.contains("active")) drawDragon(); });

updateRealm();
newSortGame();
newDragonGame();
