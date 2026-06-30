(function () {
  const BOARD_W = 390;
  const BOARD_H = 570;
  const launcher = { x: 195, y: 94 };
  const baseAimAngle = Math.PI / 2;
  const playfield = {
    left: 34,
    right: 356,
    top: 28,
    bottom: 548,
    clearY: 190,
    spawnBottom: 486
  };
  const api = window.shatteredRealm;
  const $ = (selector) => document.querySelector(selector);

  if (!window.Phaser || !api) return;

  let game;
  let sceneRef;

  function setPower(percent, charging) {
    const fill = $("#power-fill");
    const label = $("#power-label");
    if (fill) fill.style.width = `${Math.round(percent * 100)}%`;
    if (label) label.textContent = charging ? `Dragonfire ${Math.round(percent * 100)}%` : "Hold to charge";
  }

  function levelConfig() {
    const base = api.dragonLevelConfig(api.state.dragonLevel);
    const design = levelDesign(api.state.dragonLevel);
    return {
      ...base,
      targets: design.slots.filter((slot) => slot.target).length,
      obstacles: design.slots.filter((slot) => !slot.target).length,
      balls: base.balls + 2
    };
  }

  function wall(x, y) {
    return { x, y, target: false };
  }

  function prize(x, y) {
    return { x, y, target: true };
  }

  function token(kind, x, y) {
    return kind === "prize" ? prize(x, y) : wall(x, y);
  }

  function line(kind, x1, y1, x2, y2, count) {
    return Array.from({ length: count }, (_, index) => {
      const t = count === 1 ? .5 : index / (count - 1);
      return token(kind, Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t));
    });
  }

  function arc(kind, cx, cy, rx, ry, start, end, count) {
    return Array.from({ length: count }, (_, index) => {
      const t = count === 1 ? .5 : index / (count - 1);
      const angle = start + (end - start) * t;
      return token(kind, Math.round(cx + Math.cos(angle) * rx), Math.round(cy + Math.sin(angle) * ry));
    });
  }

  function points(kind, coords) {
    return coords.map(([x, y]) => token(kind, x, y));
  }

  function uniqueSlots(slots) {
    const seen = new Set();
    return slots.filter((slot) => {
      const key = `${Math.round(slot.x / 4) * 4}:${Math.round(slot.y / 4) * 4}:${slot.target ? 1 : 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function levelDesign(level) {
    const designs = [
      {
        name: "Castle Gate",
        slots: uniqueSlots([
          ...line("wall", 82, 214, 82, 470, 8), ...line("wall", 308, 214, 308, 470, 8),
          ...line("wall", 82, 214, 308, 214, 9), ...line("wall", 112, 282, 278, 282, 6),
          ...line("wall", 112, 470, 278, 470, 6), ...line("wall", 126, 330, 126, 430, 4),
          ...line("wall", 264, 330, 264, 430, 4),
          ...points("prize", [[156, 326], [234, 326], [156, 386], [234, 386], [195, 428], [195, 244], [122, 244], [268, 244]])
        ])
      },
      {
        name: "Dragon Head",
        slots: uniqueSlots([
          ...arc("wall", 195, 320, 118, 100, Math.PI * 1.05, Math.PI * 1.95, 15),
          ...line("wall", 102, 314, 150, 444, 6), ...line("wall", 288, 314, 240, 444, 6),
          ...line("wall", 150, 444, 195, 482, 4), ...line("wall", 240, 444, 195, 482, 4),
          ...points("wall", [[88, 248], [124, 222], [266, 222], [302, 248], [140, 366], [250, 366]]),
          ...points("prize", [[154, 292], [236, 292], [195, 346], [166, 402], [224, 402], [178, 452], [212, 452], [195, 234]])
        ])
      },
      {
        name: "Shield Wall",
        slots: uniqueSlots([
          ...arc("wall", 195, 334, 112, 126, Math.PI * 1.08, Math.PI * 1.92, 14),
          ...line("wall", 86, 304, 122, 410, 5), ...line("wall", 304, 304, 268, 410, 5),
          ...line("wall", 122, 410, 195, 482, 6), ...line("wall", 268, 410, 195, 482, 6),
          ...line("wall", 130, 332, 260, 332, 6),
          ...points("prize", [[154, 292], [236, 292], [195, 340], [154, 390], [236, 390], [172, 438], [218, 438], [195, 258]])
        ])
      },
      {
        name: "Broken Sword",
        slots: uniqueSlots([
          ...line("wall", 195, 202, 195, 466, 11), ...line("wall", 166, 238, 224, 238, 4),
          ...line("wall", 170, 312, 220, 312, 4), ...line("wall", 150, 430, 240, 430, 5),
          ...line("wall", 112, 474, 278, 474, 7), ...line("wall", 144, 456, 112, 486, 3),
          ...line("wall", 246, 456, 278, 486, 3), ...points("wall", [[176, 264], [214, 286], [176, 360], [214, 382]]),
          ...points("prize", [[156, 250], [234, 250], [156, 344], [234, 344], [195, 390], [150, 466], [240, 466], [195, 226]])
        ])
      },
      {
        name: "Crown Keep",
        slots: uniqueSlots([
          ...points("wall", [[80, 314], [116, 246], [150, 314], [195, 236], [240, 314], [274, 246], [310, 314]]),
          ...line("wall", 86, 350, 304, 350, 9), ...line("wall", 98, 398, 292, 398, 8),
          ...line("wall", 112, 446, 278, 446, 7), ...line("wall", 98, 350, 98, 446, 4), ...line("wall", 292, 350, 292, 446, 4),
          ...points("prize", [[116, 318], [195, 304], [274, 318], [146, 390], [244, 390], [162, 446], [228, 446], [195, 356]])
        ])
      },
      {
        name: "Twin Towers",
        slots: uniqueSlots([
          ...line("wall", 82, 218, 82, 474, 9), ...line("wall", 126, 218, 126, 474, 9),
          ...line("wall", 264, 218, 264, 474, 9), ...line("wall", 308, 218, 308, 474, 9),
          ...line("wall", 82, 218, 126, 218, 3), ...line("wall", 264, 218, 308, 218, 3),
          ...line("wall", 126, 474, 264, 474, 6), ...points("prize", [[154, 260], [236, 260], [154, 348], [236, 348], [104, 410], [286, 410], [172, 474], [218, 474]])
        ])
      },
      {
        name: "Fang Trap",
        slots: uniqueSlots([
          ...line("wall", 72, 220, 188, 462, 10), ...line("wall", 318, 220, 202, 462, 10),
          ...line("wall", 108, 238, 172, 408, 7), ...line("wall", 282, 238, 218, 408, 7),
          ...line("wall", 90, 478, 300, 478, 8), ...points("wall", [[126, 286], [264, 286], [146, 350], [244, 350]]),
          ...points("prize", [[156, 264], [234, 264], [144, 382], [246, 382], [176, 438], [214, 438], [118, 466], [272, 466]])
        ])
      },
      {
        name: "Royal Standard",
        slots: uniqueSlots([
          ...line("wall", 108, 208, 108, 486, 11), ...line("wall", 144, 222, 294, 270, 7),
          ...line("wall", 144, 270, 276, 318, 6), ...line("wall", 144, 318, 252, 366, 5),
          ...line("wall", 144, 366, 224, 414, 4), ...line("wall", 132, 486, 300, 486, 7),
          ...points("wall", [[144, 222], [144, 270], [144, 318], [144, 366], [144, 414]]),
          ...points("prize", [[198, 260], [246, 278], [202, 326], [164, 392], [222, 424], [284, 456], [156, 458], [108, 244]])
        ])
      },
      {
        name: "Moon Gate",
        slots: uniqueSlots([
          ...arc("wall", 195, 338, 112, 132, Math.PI * .55, Math.PI * 1.45, 17),
          ...arc("wall", 195, 338, 72, 92, Math.PI * .58, Math.PI * 1.42, 13),
          ...line("wall", 108, 436, 282, 436, 7), ...line("wall", 130, 474, 260, 474, 5),
          ...points("wall", [[100, 300], [290, 300], [100, 374], [290, 374]]),
          ...points("prize", [[156, 298], [234, 298], [154, 386], [236, 386], [195, 338], [174, 436], [216, 436], [195, 226]])
        ])
      },
      {
        name: "Dragon Throne",
        slots: uniqueSlots([
          ...line("wall", 96, 242, 146, 456, 8), ...line("wall", 294, 242, 244, 456, 8),
          ...line("wall", 146, 456, 244, 456, 5), ...line("wall", 132, 386, 258, 386, 6),
          ...line("wall", 154, 314, 236, 314, 4), ...points("wall", [[112, 220], [278, 220], [154, 226], [236, 226], [195, 204], [195, 260], [195, 430]]),
          ...points("prize", [[154, 274], [236, 274], [166, 362], [224, 362], [195, 402], [146, 442], [244, 442], [195, 314]])
        ])
      }
    ];
    return designs[(level - 1) % designs.length];
  }

  function generateLayout() {
    const design = levelDesign(api.state.dragonLevel);
    return design.slots.map((slot) => ({
      ...slot,
      x: Phaser.Math.Clamp(slot.x, playfield.left + 18, playfield.right - 18),
      y: Phaser.Math.Clamp(slot.y, playfield.clearY, playfield.spawnBottom)
    }));
  }

  class DragonfireScene extends Phaser.Scene {
    constructor() {
      super("DragonfireScene");
      this.pegs = [];
      this.ball = null;
      this.trails = [];
      this.score = 0;
      this.ballsLeft = 0;
      this.aiming = true;
      this.gameOver = false;
      this.charging = false;
      this.chargeStart = 0;
      this.chargePower = 0;
      this.aim = { x: 195, y: 285 };
      this.sceneDrift = { x: 0, y: 0 };
    }

    preload() {
      this.load.image("boardBg", "assets/phaser/dragonfire-board-v2.jpg");
      this.load.image("shieldIntact", "assets/phaser/shield-intact-v2.png");
      this.load.image("shieldCracked", "assets/phaser/shield-cracked-v2.png");
      this.load.image("shieldShattered", "assets/phaser/shield-shattered-v2.png");
      this.load.image("relic", "assets/phaser/ember-relic-v2.png");
      this.load.image("fireball", "assets/phaser/fireball-v2.png");
      this.load.image("launcher", "assets/phaser/dragon-launcher-aim-v2.png");
      this.load.image("flameBurst", "assets/phaser/flame-burst.png");
      this.load.image("frostBurst", "assets/phaser/frost-burst.png");
    }

    create() {
      sceneRef = this;
      this.bgGroup = this.add.container(0, 0).setDepth(-20);
      this.bg = this.add.image(BOARD_W / 2, BOARD_H / 2, "boardBg").setDisplaySize(BOARD_W, BOARD_H);
      this.bgGroup.add(this.bg);
      this.createAtmosphere();
      this.aimGraphics = this.add.graphics();
      this.fxLayer = this.add.container(0, 0);
      this.launcher = this.add.image(launcher.x, launcher.y, "launcher").setScale(.25).setDepth(20).setOrigin(.5, .91);
      this.launcherGlow = this.add.circle(launcher.x, launcher.y, 20, 0xff8a26, .16).setDepth(19);
      this.launcher.setPipeline("Light2D");
      this.lights.enable().setAmbientColor(0x90a6c6);
      this.lights.addLight(launcher.x, launcher.y, 155, 0xff9a32, 2.2);
      this.lights.addLight(46, 506, 120, 0xff7d25, .7);
      this.lights.addLight(344, 506, 120, 0xff7d25, .7);
      this.input.on("pointerdown", this.startCharge, this);
      this.input.on("pointermove", this.moveAim, this);
      this.input.on("pointerup", this.releaseCharge, this);
      this.resetLevel();
    }

    createAtmosphere() {
      this.fog = [];
      for (let i = 0; i < 5; i++) {
        const fog = this.add.ellipse(
          Phaser.Math.Between(-50, BOARD_W + 50),
          Phaser.Math.Between(145, 430),
          Phaser.Math.Between(100, 190),
          Phaser.Math.Between(12, 26),
          0xbad8f4,
          Phaser.Math.FloatBetween(.015, .04)
        ).setDepth(Phaser.Math.Between(-8, 4));
        this.fog.push(fog);
        this.tweens.add({
          targets: fog,
          x: fog.x + Phaser.Math.Between(-55, 55),
          alpha: fog.alpha * Phaser.Math.FloatBetween(.55, 1.35),
          duration: Phaser.Math.Between(4200, 7600),
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut"
        });
      }

      this.embers = this.add.particles(0, 0, "flameBurst", {
        x: { min: 28, max: BOARD_W - 28 },
        y: { min: BOARD_H - 76, max: BOARD_H - 30 },
        lifespan: { min: 1500, max: 3200 },
        speedY: { min: -24, max: -7 },
        speedX: { min: -7, max: 7 },
        scale: { start: .008, end: 0 },
        alpha: { start: .16, end: 0 },
        frequency: 210,
        blendMode: "ADD"
      }).setDepth(15);

      this.foreground = this.add.graphics().setDepth(1300);
      this.foreground.lineStyle(2, 0xf6d68a, .22).strokeRoundedRect(18, 18, BOARD_W - 36, BOARD_H - 36, 22);
      this.foreground.lineStyle(1, 0x7fd6ff, .1).strokeRoundedRect(31, 102, BOARD_W - 62, BOARD_H - 174, 18);
    }

    resetLevel() {
      this.pegs.forEach((peg) => {
        peg.sprite.destroy();
      });
      this.trails.forEach((trail) => trail.destroy());
      this.pegs = [];
      this.trails = [];
      if (this.ball) this.ball.destroy();
      this.ball = null;
      this.score = 0;
      this.aiming = true;
      this.gameOver = false;
      this.charging = false;
      this.chargePower = 0;
      this.aim = { x: 195, y: 285 };
      this.updateLauncherAim(true);
      setPower(0, false);

      const config = levelConfig();
      this.ballsLeft = config.balls;
      const layout = generateLayout();
      layout.forEach((slot) => {
        const key = slot.target ? "shieldIntact" : "relic";
        const sprite = this.add.image(slot.x, slot.y, key)
          .setDepth(slot.y)
          .setScale(slot.target ? .096 : .063);
        sprite.setPipeline("Light2D");
        this.tweens.add({
          targets: sprite,
          y: sprite.y + Phaser.Math.Between(-5, 5),
          duration: Phaser.Math.Between(1500, 2300),
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut"
        });
        this.pegs.push({
          x: slot.x,
          y: slot.y,
          r: slot.target ? 13 : 9,
          target: slot.target,
          hp: slot.target ? config.targetHp : 1,
          hit: false,
          cooldown: 0,
          sprite
        });
      });
      this.updateStats();
      this.drawAim();
      this.updateLauncherAim();
    }

    updateStats() {
      $("#balls-left").textContent = this.ballsLeft;
      $("#targets-left").textContent = this.pegs.filter((peg) => peg.target && !peg.hit).length;
      $("#dragon-score").textContent = this.score;
      $("#dragon-level").textContent = api.state.dragonLevel;
      const selector = $("#dragon-level-select");
      if (selector && selector.value !== String(api.state.dragonLevel)) selector.value = String(((api.state.dragonLevel - 1) % 10) + 1);
      const design = levelDesign(api.state.dragonLevel);
      const config = levelConfig();
      $("#dragon-instruction").textContent = `${design.name}: ${config.targets} shields hidden behind ${config.obstacles} relic walls. Hold to charge, drag to aim, release to burn.`;
    }

    startCharge(pointer) {
      if (!this.aiming || this.gameOver || this.ball) return;
      this.charging = true;
      this.chargeStart = this.time.now;
      this.chargePower = .1;
      this.moveAim(pointer);
      this.tweens.killTweensOf(this.launcher);
      this.tweens.add({ targets: this.launcher, scale: .29, duration: 130, ease: "Back.Out" });
    }

    moveAim(pointer) {
      if (!this.aiming || this.gameOver) return;
      this.aim.x = Phaser.Math.Clamp(pointer.x, 18, BOARD_W - 18);
      this.aim.y = Phaser.Math.Clamp(pointer.y, launcher.y + 46, playfield.bottom - 22);
      this.drawAim();
      this.updateLauncherAim();
    }

    updateLauncherAim(immediate = false) {
      const dx = this.aim.x - launcher.x;
      const dy = Math.max(48, this.aim.y - launcher.y);
      const angle = Math.atan2(dy, dx) - baseAimAngle;
      const clamped = Phaser.Math.Clamp(angle, -.72, .72);
      const leanX = Phaser.Math.Clamp(dx / 110, -1, 1) * 4;
      const leanY = this.charging ? -3 : 0;
      this.sceneDrift.x = -leanX * .22;
      this.sceneDrift.y = -Math.min(dy / 220, 1) * 4;
      this.tweens.killTweensOf([this.launcher, this.launcherGlow]);
      this.launcher.setRotation(clamped).setPosition(launcher.x + leanX, launcher.y + leanY);
      this.launcherGlow.setPosition(launcher.x + leanX, launcher.y + leanY);
    }

    releaseCharge(pointer) {
      if (!this.charging || !this.aiming || this.gameOver) return;
      this.moveAim(pointer);
      this.launchBall();
    }

    drawAim() {
      this.aimGraphics.clear();
      if (!this.aiming || this.gameOver) return;
      const power = this.charging ? Math.max(.2, this.chargePower) : .48;
      const dx = this.aim.x - launcher.x;
      const dy = Math.max(48, this.aim.y - launcher.y);
      const len = Math.hypot(dx, dy) || 1;
      let vx = dx / len * (2.55 + power * 2.55);
      let vy = dy / len * (2.55 + power * 2.55);
      let x = launcher.x;
      let y = launcher.y;
      this.aimGraphics.lineStyle(this.charging ? 3 : 2, this.charging ? 0xffd97a : 0x9ee8ff, this.charging ? .95 : .62);
      this.aimGraphics.beginPath();
      this.aimGraphics.moveTo(x, y);
      for (let i = 0; i < 72; i++) {
        vy += .047;
        x += vx;
        y += vy;
        if (x < playfield.left || x > playfield.right || y < playfield.top || y > playfield.bottom) break;
        if (i % 2 === 0) this.aimGraphics.lineTo(x, y);
      }
      this.aimGraphics.strokePath();
    }

    launchBall() {
      const power = Math.max(.18, this.chargePower);
      const dx = this.aim.x - launcher.x;
      const dy = Math.max(48, this.aim.y - launcher.y);
      const len = Math.hypot(dx, dy) || 1;
      const speed = 2.55 + power * 2.55;
      this.ball = this.add.image(launcher.x, launcher.y, "fireball").setScale(.086).setDepth(999);
      this.ball.setPipeline("Light2D");
      this.ball.vx = dx / len * speed;
      this.ball.vy = dy / len * speed;
      this.ball.r = 8;
      this.ball.frames = 0;
      this.ballsLeft--;
      this.aiming = false;
      this.charging = false;
      this.chargePower = 0;
      setPower(0, false);
      this.updateStats();
      this.drawAim();
      this.cameras.main.shake(80, .004);
      this.tweens.add({ targets: this.launcher, scale: .235, x: launcher.x - (dx / len) * 5, y: launcher.y - (dy / len) * 5, duration: 55, yoyo: true, ease: "Quad.Out" });
      this.tweens.add({ targets: this.launcherGlow, alpha: .48, scale: 1.75, duration: 90, yoyo: true, ease: "Quad.Out" });
    }

    update(_, delta) {
      const t = this.time.now;
      this.bgGroup.x = Phaser.Math.Linear(this.bgGroup.x, this.sceneDrift.x + Math.sin(t * .00022) * 2.2, .025);
      this.bgGroup.y = Phaser.Math.Linear(this.bgGroup.y, this.sceneDrift.y + Math.cos(t * .00019) * 1.5, .025);
      this.launcherGlow.alpha = Phaser.Math.Clamp((this.charging ? .28 + this.chargePower * .36 : .16) + Math.sin(t * .012) * .06, .08, .7);
      if (this.charging) {
        this.chargePower = Math.min(1, (this.time.now - this.chargeStart) / 1050);
        setPower(this.chargePower, true);
        this.drawAim();
        this.updateLauncherAim();
      }
      this.pegs.forEach((peg) => { if (peg.cooldown > 0) peg.cooldown--; });
      if (!this.ball) return;
      this.updateBall();
    }

    updateBall() {
      const ball = this.ball;
      ball.frames++;
      ball.vy += .047;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.rotation = Math.atan2(ball.vy, ball.vx);

      const trail = this.add.image(ball.x, ball.y, "flameBurst").setScale(.055 + Math.random() * .025).setAlpha(.55).setDepth(998);
      this.trails.push(trail);
      this.tweens.add({
        targets: trail,
        alpha: 0,
        scale: trail.scaleX * 1.9,
        duration: 360,
        onComplete: () => {
          Phaser.Utils.Array.Remove(this.trails, trail);
          trail.destroy();
        }
      });

      if (ball.x < playfield.left + ball.r) {
        ball.x = playfield.left + ball.r;
        ball.vx = Math.abs(ball.vx) * .9;
      }
      if (ball.x > playfield.right - ball.r) {
        ball.x = playfield.right - ball.r;
        ball.vx = -Math.abs(ball.vx) * .9;
      }
      if (ball.y < playfield.top + ball.r) {
        ball.y = playfield.top + ball.r;
        ball.vy = Math.abs(ball.vy) * .72;
        ball.vx *= .94;
      }

      for (const peg of this.pegs) {
        if (peg.hit || peg.cooldown > 0) continue;
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
          ball.vx = (ball.vx - 2 * dot * nx) * .92;
          ball.vy = (ball.vy - 2 * dot * ny) * .92;
          this.hitPeg(peg);
        }
      }

      if (ball.y > playfield.bottom + 28 || ball.frames > 1800) {
        ball.destroy();
        this.ball = null;
        const remaining = this.pegs.some((peg) => peg.target && !peg.hit);
        if (!remaining) this.finish(true);
        else if (this.ballsLeft <= 0) this.finish(false);
        else {
          this.aiming = true;
          this.drawAim();
        }
      }
    }

    hitPeg(peg) {
      peg.cooldown = 12;
      peg.hp--;
      const destroyed = peg.hp <= 0;
      this.score += peg.target ? (destroyed ? 500 : 175) : 100;
      const burstKey = peg.target ? "frostBurst" : "flameBurst";
      const burst = this.add.image(peg.x, peg.y, burstKey).setScale(.08).setAlpha(.95).setDepth(1200);
      this.tweens.add({
        targets: burst,
        scale: peg.target ? .18 : .12,
        alpha: 0,
        duration: 520,
        ease: "Cubic.Out",
        onComplete: () => burst.destroy()
      });
      this.cameras.main.shake(destroyed ? 150 : 80, destroyed ? .009 : .004);
      this.spawnSparks(peg.x, peg.y, peg.target ? 0x9ee8ff : 0xff9a2c);

      if (peg.target && !destroyed) {
        peg.sprite.setTexture("shieldCracked");
        this.tweens.add({ targets: peg.sprite, scale: .108, yoyo: true, duration: 110, ease: "Back.Out" });
      } else if (destroyed) {
        peg.hit = true;
        peg.sprite.setTexture(peg.target ? "shieldShattered" : "relic");
        this.tweens.add({
          targets: peg.sprite,
          scale: peg.sprite.scaleX * 1.35,
          alpha: 0,
          angle: Phaser.Math.Between(-55, 55),
          duration: 360,
          ease: "Back.In",
          onComplete: () => peg.sprite.setVisible(false)
        });
      } else {
        this.tweens.add({ targets: peg.sprite, scale: .072, yoyo: true, duration: 110, ease: "Back.Out" });
      }
      this.updateStats();
    }

    spawnSparks(x, y, color) {
      for (let i = 0; i < 9; i++) {
        const spark = this.add.circle(x, y, Phaser.Math.FloatBetween(1.2, 2.8), color, .9).setDepth(1205);
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const distance = Phaser.Math.Between(14, 42);
        this.tweens.add({
          targets: spark,
          x: x + Math.cos(angle) * distance,
          y: y + Math.sin(angle) * distance,
          alpha: 0,
          scale: .2,
          duration: Phaser.Math.Between(260, 520),
          ease: "Cubic.Out",
          onComplete: () => spark.destroy()
        });
      }
    }

    finish(won) {
      this.gameOver = true;
      $("#dragon-result").textContent = won ? "Winter is broken" : "The shields endure";
      $("#dragon-result-copy").textContent = won ? "The braziers of Blackthorn burn again." : "The dragon circles. Call it back for another assault.";
      if (won) {
        api.state.embers += 50 + api.state.dragonLevel * 25;
        api.state.gold += 25 + api.state.dragonLevel * 10;
        api.state.dragonWon = true;
        api.state.dragonLevel++;
        api.saveState();
        api.updateRealm();
      }
      this.time.delayedCall(350, () => $("#dragon-message").classList.remove("hidden"));
    }
  }

  function startPhaserDragon() {
    const parent = $("#phaser-dragon-game");
    if (!parent || game) return;
    parent.closest(".canvas-wrap")?.classList.add("phaser-ready");
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: BOARD_W,
      height: BOARD_H,
      transparent: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      render: {
        antialias: true,
        roundPixels: false
      },
      scene: DragonfireScene
    });
  }

  function restartPhaserDragon() {
    if (sceneRef) {
      $("#dragon-message").classList.add("hidden");
      sceneRef.resetLevel();
    }
  }

  function previewDragonLevel(event) {
    const level = Number(event.target.value || 1);
    api.state.dragonLevel = level;
    api.saveState();
    api.updateRealm();
    restartPhaserDragon();
  }

  window.addEventListener("load", startPhaserDragon);
  $("#restart-dragon")?.addEventListener("click", () => setTimeout(restartPhaserDragon, 0));
  $("#play-dragon-again")?.addEventListener("click", () => setTimeout(restartPhaserDragon, 0));
  $("#dragon-level-select")?.addEventListener("change", previewDragonLevel);
})();
