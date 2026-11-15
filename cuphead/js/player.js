'use strict';
// 玩家：虎头小子。跑、跳（可变高度）、蹲、冲刺、八向射击、锁定瞄准、格挡、EX、必杀
(function () {
  const TH = window.TH, G = TH.Gfx, GY = TH.GROUND, TAU = TH.TAU;
  const RUN = 430, JUMP_V = 990, JUMP_CUT = 330, GRAV = 2900, MAXFALL = 1400;
  const DASH_SPEED = 900, DASH_T = 0.27, DASH_CD = 0.28;

  TH.WEAPONS = [
    { id: 'straight', name: '直射', color: '#ffd34d', cd: 0.115 },
    { id: 'spread', name: '散射', color: '#ff7a4a', cd: 0.15 },
    { id: 'homing', name: '追踪', color: '#7df0c1', cd: 0.17 }
  ];

  class Player {
    constructor() {
      this.x = 260; this.y = GY; this.vx = 0; this.vy = 0; this.face = 1; this.onGround = true;
      this.hp = 3; this.inv = 0; this.safe = false; this.dead = false; this.deadT = 0;
      this.dashT = 0; this.dashCd = 0; this.dashDir = 1; this.airDash = false;
      this.duck = false; this.lock = false; this.aim = { x: 1, y: 0 };
      this.shootCd = 0; this.weapon = 0; this.alt = false; this.firing = 0;
      this.meter = 0; this.exT = 0; this.superT = 0;
      this.parryT = 0; this.parryReady = true; this.spinT = 0; this.jumpBuf = 0;
      this.animT = 0; this.runPh = 0; this.landT = 0; this.dustT = 0; this.ghosts = [];
      this.stats = { parry: 0, ex: 0, hits: 0 };
    }
    box() { const h = this.duck ? 34 : 70; return { x: this.x, y: this.y - h / 2, w: 28, h }; }
    parryBox() { return { x: this.x, y: this.y - 40, w: 88, h: 130 }; }
    muzzle() {
      const cy = this.y - (this.duck ? 24 : 46);
      return { x: this.x + this.aim.x * 40, y: cy + this.aim.y * 40 };
    }
    addMeter(v) {
      const before = Math.floor(this.meter / 100);
      this.meter = Math.min(500, this.meter + v);
      if (Math.floor(this.meter / 100) > before) TH.Audio.sfx('card');
    }
    hurt() {
      if (this.inv > 0 || this.dead || this.superT > 0 || this.safe) return false;
      this.hp--; this.stats.hits++; this.inv = 2.0; this.dashT = 0; this.exT = 0; this.parryT = 0;
      TH.Audio.sfx('hurt'); G.shake(11, 0.3);
      G.ring(this.x, this.y - 42, '#ff4a4a', 95, .3, 8); G.shards(this.x, this.y - 42, ['#e8372c', '#ffd34d', '#2f6fb7'], 8);
      TH.world.hitstop = 0.14;
      if (this.hp <= 0) { this.dead = true; this.deadT = 0; }
      return true;
    }
    onParry(h) {
      this.vy = -830; this.onGround = false; this.parryT = 0; this.parryReady = true; this.airDash = false; this.jumpBuf = 0;
      this.spinT = 0.3; this.inv = Math.max(this.inv, 0.3); this.stats.parry++;
      this.addMeter(100);
      TH.world.hitstop = 0.12; TH.Audio.sfx('parry');
      G.ring(h.x, h.y, G.PINK, 86, .3, 8); G.flashStar(h.x, h.y, 64, '#ffd0e4'); G.float(this.x, this.y - 96, '格挡！', G.PINK, 26);
    }

    update(dt) {
      const I = TH.Input, w = TH.world, lockIn = !!w.lockInput;
      const dn = a => !lockIn && I.down(a), pr = a => !lockIn && I.pressed(a);
      this.animT += dt;
      for (let i = this.ghosts.length - 1; i >= 0; i--) { this.ghosts[i].a -= dt * 5; if (this.ghosts[i].a <= 0) this.ghosts.splice(i, 1); }
      if (this.dead) { this.deadT += dt; return; }
      this.inv = Math.max(0, this.inv - dt); this.shootCd -= dt; this.dashCd -= dt; this.jumpBuf -= dt;
      this.parryT = Math.max(0, this.parryT - dt); this.spinT = Math.max(0, this.spinT - dt);
      this.superT = Math.max(0, this.superT - dt); this.landT = Math.max(0, this.landT - dt); this.firing = Math.max(0, this.firing - dt);

      const mx = (dn('right') ? 1 : 0) - (dn('left') ? 1 : 0), my = (dn('down') ? 1 : 0) - (dn('up') ? 1 : 0);
      if (pr('swap')) { this.weapon = (this.weapon + 1) % TH.WEAPONS.length; TH.Audio.sfx('move'); }

      if (this.exT > 0) {                       // EX 硬直：悬停
        this.exT -= dt; this.vx = 0; this.vy = 0;
      } else {
        if (pr('dash') && this.dashT <= 0 && this.dashCd <= 0 && (this.onGround || !this.airDash)) {
          this.dashT = DASH_T; this.dashDir = mx || this.face; this.face = this.dashDir; this.duck = false;
          if (!this.onGround) this.airDash = true;
          TH.Audio.sfx('dash'); G.puff(this.x, this.y - 20, 4, '#fff8ea', 12);
        }
        if (this.dashT > 0) {
          this.dashT -= dt; this.vx = this.dashDir * DASH_SPEED; this.vy = 0;
          this.x += this.vx * dt;
          if (this.dashT <= 0) this.dashCd = DASH_CD;
          this.dustT -= dt;
          if (this.dustT <= 0) { this.dustT = 0.03; this.ghosts.push({ x: this.x, y: this.y, face: this.face, a: 1 }); }
        } else {
          this.lock = dn('lock') && this.onGround;
          this.duck = this.onGround && my > 0 && !this.lock;
          if (mx) this.face = mx;
          this.vx = (this.lock || this.duck) ? 0 : mx * RUN;
          if (pr('jump')) {
            if (this.onGround) this.jumpBuf = 0.12;
            else { this.jumpBuf = 0.08; if (this.parryReady && this.parryT <= 0) { this.parryT = 0.24; this.parryReady = false; this.spinT = 0.24; } }
          }
          if (this.jumpBuf > 0 && this.onGround) {
            this.vy = -JUMP_V; this.onGround = false; this.jumpBuf = 0; this.duck = false; this.lock = false;
            TH.Audio.sfx('jump'); G.puff(this.x, this.y - 4, 3, '#fff8ea', 9);
          }
          if (!dn('jump') && this.vy < -JUMP_CUT) this.vy = -JUMP_CUT;
          this.vy = Math.min(MAXFALL, this.vy + GRAV * dt);
          this.x += (this.vx + (w.wind || 0)) * dt; this.y += this.vy * dt;
        }
      }
      if (this.y >= GY) {
        if (!this.onGround) { this.landT = 0.12; TH.Audio.sfx('land'); G.puff(this.x, GY - 4, 3, '#fff8ea', 9); }
        this.y = GY; this.vy = 0; this.onGround = true; this.airDash = false; this.parryReady = true; this.parryT = 0;
      } else this.onGround = false;
      this.x = TH.clamp(this.x, 34, TH.W - 34);
      if (this.onGround && Math.abs(this.vx) > 10 && this.dashT <= 0) {
        this.runPh += dt * 17; this.dustT -= dt;
        if (this.dustT <= 0) { this.dustT = 0.2; G.puff(this.x - this.face * 12, GY - 4, 1, '#fff8ea', 7); }
      }

      // 瞄准方向
      let ax, ay;
      if (this.lock || !this.onGround) { ax = mx; ay = my; if (!ax && !ay) ax = this.face; }
      else if (this.duck) { ax = this.face; ay = 0; }
      else if (my < 0) { ax = mx; ay = -1; }
      else { ax = this.face; ay = 0; }
      if (ax) this.face = ax;
      const n = Math.hypot(ax, ay) || 1;
      this.aim.x = ax / n; this.aim.y = ay / n;

      if (this.exT <= 0 && this.dashT <= 0) {
        if (pr('ex')) {
          if (this.meter >= 500) this.doSuper();
          else if (this.meter >= 100) this.doEx();
          else TH.Audio.sfx('deny');
        } else if (dn('shoot') && this.shootCd <= 0) this.fire();
      }
    }

    fire() {
      const w = TH.WEAPONS[this.weapon], m = this.muzzle(), ax = this.aim.x, ay = this.aim.y;
      this.shootCd = w.cd; this.firing = 0.12;
      if (w.id === 'straight') {
        const o = this.alt ? -5 : 5; this.alt = !this.alt;
        TH.shootP({ x: m.x - ay * o, y: m.y + ax * o, vx: ax * 1500, vy: ay * 1500, r: 9, dmg: 4, kind: 'straight', life: 1.2 });
        TH.Audio.sfx('shoot');
      } else if (w.id === 'spread') {
        const a = Math.atan2(ay, ax);
        for (const k of [-0.22, 0, 0.22]) TH.shootP({ x: m.x, y: m.y, vx: Math.cos(a + k) * 1100, vy: Math.sin(a + k) * 1100, r: 10, dmg: 2.1, kind: 'spread', life: 0.36 });
        TH.Audio.sfx('spread');
      } else {
        TH.shootP({ x: m.x, y: m.y, vx: ax * 800, vy: ay * 800, r: 10, dmg: 2.6, kind: 'homing', life: 2.4, homing: 5.5 });
        TH.Audio.sfx('homing');
      }
    }
    doEx() {
      const w = TH.WEAPONS[this.weapon], m = this.muzzle(), a = Math.atan2(this.aim.y, this.aim.x);
      this.meter -= 100; this.exT = 0.36; this.stats.ex++;
      TH.Audio.sfx('ex'); G.ring(m.x, m.y, w.color, 70, .25, 8); G.shake(5, 0.15);
      if (w.id === 'straight') {
        TH.shootP({ x: m.x, y: m.y, vx: Math.cos(a) * 1100, vy: Math.sin(a) * 1100, r: 26, dmg: 8.5, kind: 'exbolt', life: 1.6, pierce: 3, ex: true });
      } else if (w.id === 'spread') {
        for (let i = 0; i < 8; i++) TH.shootP({ x: m.x, y: m.y, vx: Math.cos(a + i * TAU / 8) * 780, vy: Math.sin(a + i * TAU / 8) * 780, r: 16, dmg: 6.5, kind: 'exstar', life: 0.9, ex: true });
      } else {
        for (let i = -1; i <= 1; i++) TH.shootP({ x: m.x, y: m.y, vx: Math.cos(a + i * 0.7) * 620, vy: Math.sin(a + i * 0.7) * 620, r: 15, dmg: 8, kind: 'exhoming', life: 3.2, homing: 7, ex: true });
      }
    }
    doSuper() {   // 满 5 张符：万花筒——八枚追踪烟花
      this.meter = 0; this.exT = 0.8; this.superT = 1.0; this.stats.ex += 5;
      TH.Audio.sfx('super'); G.shake(8, 0.5); G.ring(this.x, this.y - 36, '#ffd34d', 160, .5, 12);
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI * (0.15 + 0.7 * i / 7);
        TH.shootP({ x: this.x, y: this.y - 44, vx: Math.cos(a) * 560, vy: Math.sin(a) * 560, r: 16, dmg: 16, kind: 'rocket', life: 4, homing: 6.5, delay: 0.25 + i * 0.06, ex: true });
      }
    }

    draw(ctx) {
      if (this.dead) { this.drawDead(ctx); return; }
      for (const g of this.ghosts) { ctx.globalAlpha = g.a * 0.3; this.drawBody(ctx, g.x, g.y, g.face, true); }
      ctx.globalAlpha = 1;
      const hgt = (GY - this.y) / 400;
      G.ellipse(ctx, this.x, GY + 5, 32 * (1 - hgt * 0.5), 7 * (1 - hgt * 0.5), 'rgba(20,8,10,.28)', 0);
      if (this.inv > 0 && this.superT <= 0 && Math.floor(this.inv * 14) % 2 === 0) return;
      if (this.superT > 0) { ctx.globalAlpha = 0.5; G.circle(ctx, this.x, this.y - 46, 64 + Math.sin(this.animT * 30) * 6, '#fff3a0', 0); ctx.globalAlpha = 1; }
      this.drawBody(ctx, this.x, this.y, this.face, false);
    }
    drawBody(ctx, x, y, face, ghost) {
      const t = this.animT, dash = ghost || this.dashT > 0, air = !this.onGround && !dash;
      const run = this.onGround && Math.abs(this.vx) > 10 && !dash;
      let sx = 1, sy = 1, rot = 0;
      if (dash) { sx = 1.22; sy = 0.82; rot = 0.3; }
      else if (this.duck) { sx = 1.16; sy = 0.52; }
      else if (air) { const k = Math.abs(TH.clamp(this.vy / 1400, -1, 1)); sy = 1 + k * 0.14; sx = 1 - k * 0.08; }
      else if (this.landT > 0) { sy = 1 - this.landT * 1.6; sx = 1 + this.landT * 1.2; }
      else if (!run) sy = 1 + Math.sin(t * 5) * 0.02;
      if (this.spinT > 0 && !ghost) rot += (1 - this.spinT / 0.3) * TAU;
      if (this.exT > 0 && !ghost) rot -= 0.22;
      ctx.save(); ctx.translate(x, y); ctx.scale(face * sx * 1.2, sy * 1.2);
      if (rot) { ctx.translate(0, -38); ctx.rotate(rot); ctx.translate(0, 38); }
      // 腿
      const ph = this.runPh;
      let l1x = -7, l1y = 0, l2x = 7, l2y = 0;
      if (run) { l1x = -6 + Math.sin(ph) * 13; l1y = -Math.max(0, Math.cos(ph)) * 8; l2x = 6 - Math.sin(ph) * 13; l2y = -Math.max(0, -Math.cos(ph)) * 8; }
      else if (dash) { l1x = -20; l1y = -8; l2x = -13; l2y = -2; }
      else if (air) { l1x = -11; l1y = -11; l2x = 8; l2y = -6; }
      for (const L of [[-6, l1x, l1y], [6, l2x, l2y]]) {
        G.line(ctx, L[0], -20, L[1], L[2] - 5, G.OUT, 13); G.line(ctx, L[0], -20, L[1], L[2] - 5, '#27407a', 7);
        G.ellipse(ctx, L[1] + 3, L[2] - 4, 8, 5, '#2a1711', 0);
      }
      // 身体
      G.rrect(ctx, -14, -46, 28, 30, 9, '#2f6fb7', 3.5);
      ctx.fillStyle = '#e8372c'; ctx.fillRect(-12.5, -26, 25, 5);
      G.circle(ctx, 5, -38, 2.2, '#ffd34d', 0); G.circle(ctx, 5, -31.5, 2.2, '#ffd34d', 0);
      // 头与虎头帽
      const hx = 2, hy = -62;
      G.circle(ctx, hx - 16, hy - 20, 8, '#e8372c', 3); G.circle(ctx, hx + 16, hy - 20, 8, '#e8372c', 3);
      G.circle(ctx, hx - 16, hy - 20, 3.5, '#ffd34d', 0); G.circle(ctx, hx + 16, hy - 20, 3.5, '#ffd34d', 0);
      G.circle(ctx, hx, hy, 21, '#ffe2c2', 3.5);
      ctx.beginPath(); ctx.arc(hx, hy, 22.5, Math.PI * 1.06, Math.PI * 1.94); ctx.closePath(); G.done(ctx, '#e8372c', 3.5);
      G.rrect(ctx, hx - 23, hy - 8.5, 46, 7, 3, '#f0b93a', 2.5);
      ctx.strokeStyle = G.OUT; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.beginPath();
      ctx.moveTo(hx - 6, hy - 19); ctx.lineTo(hx + 6, hy - 19); ctx.moveTo(hx - 5, hy - 15.5); ctx.lineTo(hx + 5, hy - 15.5);
      ctx.moveTo(hx - 6, hy - 12); ctx.lineTo(hx + 6, hy - 12); ctx.moveTo(hx, hy - 19); ctx.lineTo(hx, hy - 12);
      ctx.moveTo(hx - 17, hy - 13); ctx.lineTo(hx - 12, hy - 11); ctx.moveTo(hx + 17, hy - 13); ctx.lineTo(hx + 12, hy - 11);
      ctx.stroke();
      // 五官
      const hurtFace = this.inv > 1.4;
      if (hurtFace) {
        ctx.beginPath(); ctx.moveTo(-3, hy + 3); ctx.lineTo(3, hy + 9); ctx.moveTo(3, hy + 3); ctx.lineTo(-3, hy + 9);
        ctx.moveTo(7, hy + 3); ctx.lineTo(13, hy + 9); ctx.moveTo(13, hy + 3); ctx.lineTo(7, hy + 9); ctx.stroke();
        G.circle(ctx, 6, hy + 15, 3, G.OUT, 0);
      } else {
        if ((t % 3.2) < 0.1) { ctx.beginPath(); ctx.moveTo(-3, hy + 6); ctx.lineTo(3, hy + 6); ctx.moveTo(7, hy + 6); ctx.lineTo(13, hy + 6); ctx.stroke(); }
        else { G.ellipse(ctx, 0, hy + 6, 2.8, 4.6, G.OUT, 0); G.ellipse(ctx, 10, hy + 6, 2.8, 4.6, G.OUT, 0); }
        ctx.beginPath(); ctx.arc(5.5, hy + 12, 4, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      }
      G.circle(ctx, -6, hy + 13, 4, 'rgba(255,110,110,.5)', 0); G.circle(ctx, 16, hy + 13, 4, 'rgba(255,110,110,.5)', 0);
      // 手臂与烟花棒（指向瞄准方向）
      const dx = this.aim.x * face, dy = this.aim.y, shx = 5, shy = -39;
      const hxp = shx + dx * 15, hyp = shy + dy * 15, tx = shx + dx * 37, ty = shy + dy * 37;
      G.line(ctx, shx, shy, hxp, hyp, G.OUT, 11); G.line(ctx, shx, shy, hxp, hyp, '#2f6fb7', 6);
      G.line(ctx, hxp, hyp, tx, ty, '#7a5a3a', 3.5);
      G.circle(ctx, hxp, hyp, 4.5, '#ffe2c2', 2.5);
      if (!ghost) G.star(ctx, tx, ty, (this.firing > 0 ? 13 : 7) + Math.sin(t * 40) * 2, 3, 4, t * 9, this.firing > 0 ? '#fff3a0' : '#ffd34d', 2);
      ctx.restore();
    }
    drawDead(ctx) {
      const u = Math.min(1, this.deadT / 0.5), t = this.deadT;
      ctx.save(); ctx.translate(this.x, this.y - 12); ctx.scale(1.2, 1.2); ctx.rotate(-this.face * u * 1.45); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, t - 1.2));
      G.rrect(ctx, -14, -36, 28, 30, 9, '#2f6fb7', 3.5);
      G.circle(ctx, 2, -52, 21, '#ffe2c2', 3.5);
      ctx.beginPath(); ctx.arc(2, -52, 22.5, Math.PI * 1.06, Math.PI * 1.94); ctx.closePath(); G.done(ctx, '#e8372c', 3.5);
      G.text(ctx, '××', 5, -45, 15, G.OUT);
      ctx.restore();
      // 升起的一缕灯魂
      const sy = this.y - 60 - t * 85, wob = Math.sin(t * 5) * 14;
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, t * 2) * (1 - t / 3.2));
      G.poly(ctx, [this.x + wob - 14, sy + 10, this.x + wob, sy + 44, this.x + wob + 14, sy + 10], '#dff3ff', 3);
      G.circle(ctx, this.x + wob, sy, 20, '#dff3ff', 3);
      G.text(ctx, '×  ×', this.x + wob, sy - 2, 13, G.OUT);
      ctx.restore();
    }
  }
  TH.Player = Player;
})();
