(function () {
  const BOARD_W = 390;
  const BOARD_H = 570;
  const launcher = { x: 195, y: 64 };
  const baseAimAngle = Math.PI / 2;
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
    return {
      ...base,
      targets: Math.max(5, base.targets - 1),
      obstacles: Math.max(6, base.obstacles - 1),
      balls: base.balls + 1
    };
  }

  function generateLayout(config) {
    const slots = [];
    const rows = [
      { y: 124, count: 4, minX: 64, maxX: 326 },
      { y: 200, count: 3, minX: 103, maxX: 287 },
      { y: 278, count: 4, minX: 58, maxX: 332 },
      { y: 358, count: 3, minX: 108, maxX: 282 },
      { y: 438, count: 4, minX: 65, maxX: 325 }
    ];
    rows.forEach((row) => {
      for (let i = 0; i < row.count; i++) {
        const t = row.count === 1 ? .5 : i / (row.count - 1);
        slots.push({
          x: row.minX + (row.maxX - row.minX) * t + Phaser.Math.Between(-14, 14),
          y: row.y + Phaser.Math.Between(-14, 14)
        });
      }
    });
    Phaser.Utils.Array.Shuffle(slots);
    return slots.slice(0, config.targets + config.obstacles).map((slot, index) => ({
      ...slot,
      target: index < config.targets
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
      this.load.image("boardBg", "assets/phaser/dragonfire-background-board.jpg");
      this.load.image("shieldIntact", "assets/phaser/shield-intact.png");
      this.load.image("shieldCracked", "assets/phaser/shield-cracked.png");
      this.load.image("shieldShattered", "assets/phaser/shield-shattered.png");
      this.load.image("relic", "assets/phaser/ember-relic.png");
      this.load.image("fireball", "assets/phaser/fireball.png");
      this.load.image("launcher", "assets/phaser/dragon-launcher.png");
      this.load.image("flameBurst", "assets/phaser/flame-burst.png");
      this.load.image("frostBurst", "assets/phaser/frost-burst.png");
    }

    create() {
      sceneRef = this;
      this.bgGroup = this.add.container(0, 0).setDepth(-20);
      this.bg = this.add.image(BOARD_W / 2, BOARD_H / 2, "boardBg").setDisplaySize(BOARD_W * 1.055, BOARD_H * 1.055);
      this.bgGroup.add(this.bg);
      this.createAtmosphere();
      this.aimGraphics = this.add.graphics();
      this.fxLayer = this.add.container(0, 0);
      this.launcherShadow = this.add.ellipse(launcher.x, launcher.y + 27, 74, 19, 0x020306, .55).setDepth(18);
      this.launcher = this.add.image(launcher.x, launcher.y, "launcher").setScale(.25).setDepth(20).setOrigin(.5, .58);
      this.launcherGlow = this.add.image(launcher.x, launcher.y + 4, "flameBurst").setScale(.28).setAlpha(.18).setDepth(19);
      this.launcher.setPipeline("Light2D");
      this.lights.enable().setAmbientColor(0x90a6c6);
      this.lights.addLight(launcher.x, launcher.y, 155, 0xff9a32, 2.2);
      this.lights.addLight(45, 500, 140, 0xff7d25, 1.35);
      this.lights.addLight(345, 500, 140, 0xff7d25, 1.35);
      this.input.on("pointerdown", this.startCharge, this);
      this.input.on("pointermove", this.moveAim, this);
      this.input.on("pointerup", this.releaseCharge, this);
      this.resetLevel();
    }

    createAtmosphere() {
      this.depthShade = this.add.graphics().setDepth(-12);
      this.depthShade.fillGradientStyle(0x08131f, 0x08131f, 0x020408, 0x020408, .18, .08, .46, .72);
      this.depthShade.fillRect(0, 0, BOARD_W, BOARD_H);

      this.moonGlow = this.add.circle(113, 64, 52, 0xaedcff, .08).setDepth(-10);
      this.moonGlow2 = this.add.circle(113, 64, 28, 0xffffff, .08).setDepth(-9);

      this.fog = [];
      for (let i = 0; i < 9; i++) {
        const fog = this.add.ellipse(
          Phaser.Math.Between(-50, BOARD_W + 50),
          Phaser.Math.Between(120, 425),
          Phaser.Math.Between(120, 230),
          Phaser.Math.Between(16, 36),
          0xbad8f4,
          Phaser.Math.FloatBetween(.025, .075)
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
        x: { min: 24, max: BOARD_W - 24 },
        y: { min: BOARD_H - 82, max: BOARD_H - 22 },
        lifespan: { min: 1200, max: 2600 },
        speedY: { min: -34, max: -12 },
        speedX: { min: -12, max: 12 },
        scale: { start: .025, end: 0 },
        alpha: { start: .38, end: 0 },
        frequency: 75,
        blendMode: "ADD"
      }).setDepth(15);

      this.leftTorch = this.add.image(45, 498, "flameBurst").setScale(.22).setAlpha(.35).setDepth(13);
      this.rightTorch = this.add.image(345, 498, "flameBurst").setScale(.22).setAlpha(.35).setDepth(13);
      this.tweens.add({
        targets: [this.leftTorch, this.rightTorch],
        alpha: { from: .22, to: .52 },
        scale: { from: .18, to: .28 },
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: "Sine.inOut"
      });

      this.foreground = this.add.graphics().setDepth(1300);
      this.foreground.fillGradientStyle(0x000000, 0x000000, 0x050608, 0x050608, .38, .38, .04, .24);
      this.foreground.fillRect(0, 0, BOARD_W, BOARD_H);
      this.foreground.lineStyle(2, 0xf3d081, .2).strokeRoundedRect(7, 7, BOARD_W - 14, BOARD_H - 14, 18);
    }

    resetLevel() {
      this.pegs.forEach((peg) => {
        peg.sprite.destroy();
        peg.shadow?.destroy();
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
      const layout = generateLayout(config);
      layout.forEach((slot) => {
        const key = slot.target ? "shieldIntact" : "relic";
        const sprite = this.add.image(slot.x, slot.y, key)
          .setDepth(slot.y)
          .setScale(slot.target ? .185 : .125);
        const shadow = this.add.ellipse(slot.x + 4, slot.y + 12, slot.target ? 34 : 25, slot.target ? 13 : 10, 0x000000, .42)
          .setDepth(slot.y - 2);
        sprite.setPipeline("Light2D");
        shadow.setPipeline("Light2D");
        this.tweens.add({
          targets: [sprite, shadow],
          y: sprite.y + Phaser.Math.Between(-5, 5),
          duration: Phaser.Math.Between(1500, 2300),
          yoyo: true,
          repeat: -1,
          ease: "Sine.inOut"
        });
        this.pegs.push({
          x: slot.x,
          y: slot.y,
          r: slot.target ? 25 : 17,
          target: slot.target,
          hp: slot.target ? config.targetHp : 1,
          hit: false,
          cooldown: 0,
          sprite,
          shadow
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
      $("#dragon-instruction").textContent = `${api.dragonLevelSummary(api.state.dragonLevel)}. Hold to charge, drag to aim, release to burn.`;
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
      this.aim.y = Phaser.Math.Clamp(pointer.y, 100, BOARD_H - 40);
      this.drawAim();
      this.updateLauncherAim();
    }

    updateLauncherAim(immediate = false) {
      const dx = this.aim.x - launcher.x;
      const dy = Math.max(48, this.aim.y - launcher.y);
      const angle = Math.atan2(dy, dx) - baseAimAngle;
      const clamped = Phaser.Math.Clamp(angle, -.72, .72);
      const leanX = Phaser.Math.Clamp(dx / 90, -1, 1) * 7;
      const leanY = this.charging ? -3 : 0;
      this.sceneDrift.x = -leanX * .22;
      this.sceneDrift.y = -Math.min(dy / 220, 1) * 4;
      if (immediate) {
        this.launcher.setRotation(clamped).setPosition(launcher.x + leanX, launcher.y + leanY);
        this.launcherGlow.setRotation(clamped).setPosition(launcher.x + leanX, launcher.y + 4 + leanY);
        return;
      }
      this.tweens.killTweensOf([this.launcher, this.launcherGlow]);
      this.tweens.add({
        targets: this.launcher,
        rotation: clamped,
        x: launcher.x + leanX,
        y: launcher.y + leanY,
        duration: 90,
        ease: "Sine.Out"
      });
      this.tweens.add({
        targets: this.launcherGlow,
        rotation: clamped,
        x: launcher.x + leanX,
        y: launcher.y + 4 + leanY,
        duration: 90,
        ease: "Sine.Out"
      });
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
      let vx = dx / len * (2.35 + power * 2.35);
      let vy = dy / len * (2.35 + power * 2.35);
      let x = launcher.x;
      let y = launcher.y;
      this.aimGraphics.lineStyle(this.charging ? 3 : 2, this.charging ? 0xffd97a : 0x9ee8ff, this.charging ? .95 : .62);
      this.aimGraphics.beginPath();
      this.aimGraphics.moveTo(x, y);
      for (let i = 0; i < 72; i++) {
        vy += .045;
        x += vx;
        y += vy;
        if (x < 8 || x > BOARD_W - 8 || y > BOARD_H - 15) break;
        if (i % 2 === 0) this.aimGraphics.lineTo(x, y);
      }
      this.aimGraphics.strokePath();
    }

    launchBall() {
      const power = Math.max(.18, this.chargePower);
      const dx = this.aim.x - launcher.x;
      const dy = Math.max(48, this.aim.y - launcher.y);
      const len = Math.hypot(dx, dy) || 1;
      const speed = 2.35 + power * 2.35;
      this.ball = this.add.image(launcher.x, launcher.y, "fireball").setScale(.12).setDepth(999);
      this.ball.setPipeline("Light2D");
      this.ball.vx = dx / len * speed;
      this.ball.vy = dy / len * speed;
      this.ball.r = 12;
      this.ball.frames = 0;
      this.ballsLeft--;
      this.aiming = false;
      this.charging = false;
      this.chargePower = 0;
      setPower(0, false);
      this.updateStats();
      this.drawAim();
      this.cameras.main.shake(80, .004);
      this.tweens.add({ targets: this.launcher, scale: .25, x: launcher.x - (dx / len) * 9, y: launcher.y - (dy / len) * 6, duration: 75, yoyo: true, ease: "Quad.Out" });
      this.tweens.add({ targets: this.launcherGlow, alpha: .62, scale: .46, duration: 90, yoyo: true, ease: "Quad.Out" });
    }

    update(_, delta) {
      const t = this.time.now;
      this.bgGroup.x = Phaser.Math.Linear(this.bgGroup.x, this.sceneDrift.x + Math.sin(t * .00022) * 2.2, .025);
      this.bgGroup.y = Phaser.Math.Linear(this.bgGroup.y, this.sceneDrift.y + Math.cos(t * .00019) * 1.5, .025);
      this.moonGlow.alpha = .07 + Math.sin(t * .0012) * .025;
      this.moonGlow2.alpha = .06 + Math.sin(t * .0017) * .025;
      this.launcherGlow.rotation += .012;
      this.launcherGlow.alpha = Phaser.Math.Clamp((this.charging ? .28 + this.chargePower * .36 : .16) + Math.sin(t * .012) * .06, .08, .7);
      this.launcherShadow.x = Phaser.Math.Linear(this.launcherShadow.x, this.launcher.x, .12);
      this.launcherShadow.scaleX = 1 + Math.abs(this.launcher.rotation) * .28;
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
      ball.vy += .045;
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

      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * .96; }
      if (ball.x > BOARD_W - ball.r) { ball.x = BOARD_W - ball.r; ball.vx = -Math.abs(ball.vx) * .96; }

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
          ball.vx = (ball.vx - 2 * dot * nx) * .98;
          ball.vy = (ball.vy - 2 * dot * ny) * .98;
          this.hitPeg(peg);
        }
      }

      if (ball.y > BOARD_H + 35 || ball.frames > 1800) {
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
        scale: peg.target ? .34 : .22,
        alpha: 0,
        duration: 520,
        ease: "Cubic.Out",
        onComplete: () => burst.destroy()
      });
      this.cameras.main.shake(destroyed ? 150 : 80, destroyed ? .009 : .004);
      this.spawnSparks(peg.x, peg.y, peg.target ? 0x9ee8ff : 0xff9a2c);

      if (peg.target && !destroyed) {
        peg.sprite.setTexture("shieldCracked");
        this.tweens.add({ targets: peg.shadow, scaleX: peg.shadow.scaleX * 1.2, alpha: .58, yoyo: true, duration: 110, ease: "Back.Out" });
        this.tweens.add({ targets: peg.sprite, scale: .205, yoyo: true, duration: 110, ease: "Back.Out" });
      } else if (destroyed) {
        peg.hit = true;
        peg.sprite.setTexture(peg.target ? "shieldShattered" : "relic");
        this.tweens.add({ targets: peg.shadow, alpha: 0, scaleX: peg.shadow.scaleX * 1.5, duration: 360, ease: "Sine.Out" });
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
        this.tweens.add({ targets: peg.sprite, scale: .145, yoyo: true, duration: 110, ease: "Back.Out" });
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

  window.addEventListener("load", startPhaserDragon);
  $("#restart-dragon")?.addEventListener("click", () => setTimeout(restartPhaserDragon, 0));
  $("#play-dragon-again")?.addEventListener("click", () => setTimeout(restartPhaserDragon, 0));
})();
