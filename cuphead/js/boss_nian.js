'use strict';
// Boss 3：年兽·夕 —— 咆哮声波 / 冰刺 / 火球 → 暴怒飞扑 + 冰锥 → 巨首吸气、吐焰、角雷
(function () {
  const TH = window.TH, G = TH.Gfx, GY = TH.GROUND, TAU = TH.TAU, W = TH.W;
  const TEAL = '#2d8c8a', BELLY = '#f3e2b3';

  class Nian extends TH.Boss {
    constructor() {
      super({ name: '年兽·夕', hp: 1300, phases: [0.66, 0.33] });
      this.x = 1480; this.y = GY; this.side = 1; this.fv = -1; this.jumpY = 0; this.crouch = 0;
      this.mouth = 0; this.mouthT = 0; this.paw = 0; this.rage = 0; this.shakeT = 0;
      this.mode = 'body'; this.gx = 1620; this.gy = 430; this.hornGlow = 0; this.inhaling = false;
    }
    get f() { return -this.side; }
    headPos() { return { x: this.x + this.fv * 105, y: this.y + this.jumpY - 185 + this.crouch * 28 + Math.sin(this.t * 2.4) * 4 }; }
    hurtShapes() {
      if (this.mode === 'giant') return [{ x: this.gx, y: this.gy, r: 160 }];
      const h = this.headPos();
      return [{ x: h.x, y: h.y, r: 90 }, { x: this.x - this.fv * 45, y: this.y + this.jumpY - 105, w: 230, h: 160 }];
    }
    contactShapes() {
      const s = this.hurtShapes();
      if (this.mode === 'giant') s.push({ x: this.gx + 40, y: GY - 60, w: 300, h: 120 });
      else s.push({ x: this.x + this.fv * 70, y: this.y + this.jumpY - 40, w: 110, h: 80 });
      return s;
    }
    update(dt) {
      this.step(dt);
      this.mouth += (this.mouthT - this.mouth) * Math.min(1, dt * 12);
      this.shakeT = Math.max(0, this.shakeT - dt);
      if (this.mode === 'giant' && !this.dead) {
        TH.world.wind = this.inhaling ? 210 : 0;
        const p = TH.world.player, lim = this.gx - 215;
        if (this.noContact && p.x > lim) p.x = Math.max(lim, p.x - 700 * dt);   // 巨首登场时把玩家推开
      }
    }

    *settle() {   // 把姿态归位到最近的一侧
      this.mouthT = 0; this.paw = 0; this.inhaling = false; this.hornGlow = 0;
      const sx = this.x, sj = this.jumpY, sf = this.fv, sc = this.crouch;
      this.side = this.x > W / 2 ? 1 : -1;
      const tx = this.side > 0 ? 1040 : 240;
      for (let t = 0; t < 1; t += TH.STEP / 0.45) {
        this.x = TH.lerp(sx, tx, t); this.jumpY = TH.lerp(sj, 0, t); this.fv = TH.lerp(sf, -this.side, t); this.crouch = TH.lerp(sc, 0, t); yield 0;
      }
      this.x = tx; this.jumpY = 0; this.fv = -this.side; this.crouch = 0;
    }
    *intro() {
      for (let t = 0; t < 1; t += TH.STEP / 1.2) {
        this.x = TH.lerp(1480, 1040, TH.easeOut(t)); this.jumpY = -Math.abs(Math.sin(t * Math.PI * 2)) * 60 * (1 - t);
        if (Math.abs(this.jumpY) < 3 && t > 0.2 && t < 0.9) G.shake(5, 0.12);
        yield 0;
      }
      this.x = 1040; this.jumpY = 0; this.mouthT = 1; this.shakeT = 0.6; TH.Audio.sfx('roar'); G.shake(8, 0.6);
      yield 0.6; this.mouthT = 0; yield 0.3;
    }
    *transition(n) {
      this.noContact = true;
      yield* this.settle();
      this.mouthT = 1; this.shakeT = 1; TH.Audio.sfx('roar'); G.shake(9, 0.9);
      yield 0.6;
      if (n === 2) {
        this.rage = 1; const h = this.headPos();
        G.boom(h.x, h.y, 1.5); G.shards(h.x, h.y, ['#e8372c', '#f0b93a', '#fff3c4'], 24, 520); TH.Audio.sfx('gong');
        yield 0.7; this.mouthT = 0;
      } else {
        this.mouthT = 0;
        const x0 = this.x, f0 = this.fv;
        TH.Audio.sfx('whoosh');
        for (let t = 0; t < 1; t += TH.STEP / 0.9) {
          this.x = TH.lerp(x0, 1640, t); this.jumpY = -Math.sin(t * Math.PI) * 420; this.fv = TH.lerp(f0, 1, Math.min(1, t * 3)); yield 0;
        }
        this.mode = 'giant'; this.gx = 1640; TH.Audio.sfx('gong');
        yield 0.4;
        for (let t = 0; t < 1; t += TH.STEP / 1.0) { this.gx = TH.lerp(1640, 1150, TH.easeOut(t)); yield 0; }
        this.gx = 1150; G.shake(12, 0.6); TH.Audio.sfx('roar'); this.mouthT = 1; this.shakeT = 0.7;
        yield 0.7; this.mouthT = 0;
      }
      this.noContact = false;
    }

    *phase1() { for (const p of TH.shuffle(['roar', 'claw', 'fireball'])) { yield* this[p](); yield this.w(0.75); } }
    *phase2() { for (const p of TH.shuffle(['leap', 'roar', 'claw', 'fireball'])) { yield* this[p](); yield this.w(0.5); } }
    *phase3() { for (const p of TH.shuffle(['inhale', 'breath', 'bolts'])) { yield* this[p](); yield this.w(0.65); } }

    *roar() {
      this.mouthT = 1; this.shakeT = 0.5; TH.Audio.sfx('roar'); G.shake(5, 0.5); yield this.w(0.55);
      const n = 4 + TH.diff, f = this.f, pinkAt = TH.randi(0, n - 1);
      let last = null;
      for (let i = 0; i < n; i++) {
        let low = Math.random() < 0.5;
        if (low === last && Math.random() < 0.65) low = !low;
        last = low;
        const h = this.headPos(), o = { x: h.x + f * 60, vx: f * 500 * this.rate, w: 38, kind: 'sound', low, life: 5 };
        if (low) { o.y = GY - 25; o.h = 50; } else { o.y = GY - 111; o.h = 138; o.pink = i === pinkAt; }
        TH.spawnHaz(o); TH.Audio.sfx('drum');
        yield this.w(0.72);
      }
      this.mouthT = 0;
    }
    *claw() {
      TH.Audio.sfx('tele');
      for (let t = 0; t < 1; t += TH.STEP / this.w(0.5)) { this.paw = TH.easeOut(t); yield 0; }
      for (let t = 0; t < 1; t += TH.STEP / 0.1) { this.paw = 1 - t; yield 0; }
      this.paw = 0; TH.Audio.sfx('boom'); G.shake(8, 0.25);
      for (let i = 0; i < 3 + TH.diff; i++) {
        const x = TH.clamp(TH.world.player.x + TH.rand(-20, 20), 50, W - 50);
        G.warn(x, this.w(0.6), 70); TH.Audio.sfx('warn');
        yield this.w(0.6);
        TH.spawnHaz({ x, y: GY - 75, w: 50, h: 150, kind: 'spike', life: 0.55 });
        TH.Audio.sfx('crack'); G.shards(x, GY - 20, ['#dff3ff', '#9db7ff'], 5, 260);
        yield this.w(0.12);
      }
    }
    *fireball() {
      this.mouthT = 1; TH.Audio.sfx('tele'); yield this.w(0.45);
      for (let i = 0; i < 3 + (TH.diff > 1 ? 1 : 0); i++) {
        const h = this.headPos(), sx = h.x + this.f * 50, sy = h.y + 30, T = 1.05 / this.rate, g = 1400 * this.rate * this.rate;
        const tx = TH.clamp(TH.world.player.x + TH.rand(-70, 70), 40, W - 40);
        G.warn(tx, T, 84);
        TH.spawnHaz({ x: sx, y: sy, vx: (tx - sx) / T, vy: (GY - 20 - sy - g * T * T / 2) / T, g, r: 20, kind: 'orb', color: '#ff6a2a', pink: i === 1, life: 4, dieOnGround: true,
          onDie: z => { if (z.parried) return; TH.spawnHaz({ x: z.x, y: GY - 22, w: 84, h: 44, kind: 'flame', life: 1.5 }); TH.Audio.sfx('pop'); } });
        TH.Audio.sfx('spit'); yield this.w(0.5);
      }
      this.mouthT = 0;
    }
    *leap() {
      const sx = this.x, tx = this.side > 0 ? 240 : 1040, f0 = this.fv;
      TH.Audio.sfx('tele'); G.warn(tx + this.side * 20, this.w(0.55) + this.w(0.9), 360);
      for (let t = 0; t < 1; t += TH.STEP / this.w(0.55)) { this.crouch = TH.easeOut(t); yield 0; }
      TH.Audio.sfx('whoosh');
      const dur = this.w(0.9);
      for (let t = 0; t < 1; t += TH.STEP / dur) {
        this.crouch = Math.max(0, 1 - t * 4); this.x = TH.lerp(sx, tx, t); this.jumpY = -Math.sin(t * Math.PI) * 390;
        this.fv = TH.lerp(f0, -f0, TH.easeInOut(TH.clamp((t - 0.55) / 0.4, 0, 1)));
        yield 0;
      }
      this.x = tx; this.jumpY = 0; this.side = -this.side; this.fv = -this.side; this.crouch = 0.7;
      TH.Audio.sfx('boom'); G.shake(14, 0.4); G.puff(tx, GY - 10, 9, '#f2f7ff', 26);
      TH.shock(tx - 90, -1, 520 * this.rate); TH.shock(tx + 90, 1, 520 * this.rate);
      const cols = TH.shuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 4 + TH.diff).map(s => (this.side > 0 ? 90 : 370) + s * 105 + TH.rand(-20, 20));
      for (const x of cols) G.warn(x, 0.75, 60, true);
      for (let t = 0; t < 1; t += TH.STEP / 0.3) { this.crouch = 0.7 * (1 - t); yield 0; }
      this.crouch = 0;
      yield 0.45;
      for (const x of cols) {
        TH.spawnHaz({ x, y: -30 - TH.rand(0, 120), vy: 300, g: 1500, r: 16, kind: 'icicle', dieOnGround: true,
          onDie: z => { G.shards(z.x, GY - 10, ['#dff3ff', '#9db7ff'], 5, 240); TH.Audio.sfx('crack'); } });
      }
      yield this.w(0.5);
    }
    *inhale() {
      this.mouthT = 1; TH.Audio.sfx('tele'); yield this.w(0.5);
      this.inhaling = true; TH.Audio.sfx('whoosh');
      const n = 7 + TH.diff * 2;
      for (let i = 0; i < n; i++) {
        TH.spawnHaz({ x: -40, y: Math.random() < 0.5 ? GY - 26 : GY - 76, vx: 520 * this.rate, r: 26, kind: 'debris', pink: i % 3 === 1, life: 4, vr: 6,
          update: z => { if (z.x > this.gx - 150) { z.gone = true; G.puff(z.x, z.y, 2, '#f2f7ff', 10); } } });
        if (i % 3 === 0) TH.Audio.sfx('whoosh');
        yield 3.6 / n;
      }
      yield 0.6; this.inhaling = false; this.mouthT = 0;
    }
    *breath() {
      this.mouthT = 1; TH.Audio.sfx('tele'); yield this.w(0.6);
      for (let v = 0; v < 3 + (TH.diff > 1 ? 1 : 0); v++) {
        const mx = this.gx - 170, my = this.gy + 60, a = TH.aimAt(mx, my) + TH.rand(-0.1, 0.1);
        for (let k = -2; k <= 2; k++) TH.fireOrb(mx, my, a + k * 0.21 + (v % 2 ? 0.105 : 0), 400 * this.rate, { r: 15, pink: v === 1 && k === 0, color: '#ff6a2a' });
        TH.Audio.sfx('spit'); this.shakeT = 0.15;
        yield this.w(0.7);
      }
      this.mouthT = 0;
    }
    *bolts() {
      this.hornGlow = 1; TH.Audio.sfx('tele'); yield this.w(0.5);
      for (let i = 0; i < 4 + TH.diff; i++) {
        const x = TH.clamp(TH.world.player.x + TH.rand(-30, 30), 50, this.gx - 190);
        G.warn(x, this.w(0.6), 70, true); TH.Audio.sfx('warn');
        yield this.w(0.6);
        TH.spawnHaz({ x, y: GY / 2, w: 56, h: GY, kind: 'bolt', life: 0.22 }); TH.Audio.sfx('zap'); G.shake(6, 0.15);
        yield this.w(0.1);
      }
      this.hornGlow = 0;
    }

    draw(ctx) {
      const t = this.t, shx = (this.dead ? TH.rand(-5, 5) : 0) + (this.shakeT > 0 ? Math.sin(t * 60) * 3 : 0);
      G.flash = this.flashT > 0;
      if (this.mode === 'body') {
        G.ellipse(ctx, this.x, GY + 6, 170, 13, 'rgba(20,8,10,.25)', 0);
        ctx.save(); ctx.translate(this.x + shx, this.y + this.jumpY);
        ctx.scale(Math.abs(this.fv) < 0.08 ? (this.fv < 0 ? -0.08 : 0.08) : this.fv, 1);
        this.drawBody(ctx, t);
        ctx.translate(105, -185 + this.crouch * 28 + Math.sin(t * 2.4) * 4);
        this.drawHead(ctx, t, this.mouth);
        ctx.restore();
      } else {
        if (this.inhaling) {   // 吸气气流
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          for (let i = 0; i < 16; i++) {
            const u = ((t * 1.4 + i * 0.137) % 1), y0 = 120 + (i * 83 % 460), x = u * (this.gx - 160), y = TH.lerp(y0, this.gy + 60, u * u);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 70 * (1 - u * 0.6), y - (this.gy + 60 - y0) * 0.12 * u); ctx.stroke();
          }
        }
        ctx.save(); ctx.translate(this.gx + shx, this.gy + Math.sin(t * 2) * 6); ctx.scale(-1.9, 1.9);
        this.drawHead(ctx, t, this.mouth);
        ctx.restore();
      }
      G.flash = false;
    }
    drawBody(ctx, t) {
      const cr = this.crouch * 28, air = this.jumpY < -5, walk = Math.sin(t * 5) * 3;
      const leg = (lx, lift) => {
        const top = -80 + cr * 0.5;
        G.rrect(ctx, lx - 17, top, 34, -6 - lift - top, 12, TEAL, 4);
        G.ellipse(ctx, lx + 5, -9 - lift, 24, 11, BELLY, 3.5);
        for (let i = 0; i < 3; i++) G.poly(ctx, [lx + 8 + i * 8, -12 - lift, lx + 18 + i * 8, -6 - lift, lx + 8 + i * 8, -2 - lift], '#fffdf5', 2.5);
      };
      ctx.beginPath(); ctx.moveTo(-150, -108 + cr); ctx.quadraticCurveTo(-218, -150 + cr + Math.sin(t * 5) * 8, -198, -214 + cr);
      ctx.quadraticCurveTo(-178, -168 + cr, -138, -140 + cr); ctx.closePath(); G.done(ctx, '#e8372c', 4);
      G.circle(ctx, -199, -214 + cr, 13, '#f0b93a', 3.5);
      leg(-128, air ? 20 : Math.max(0, walk)); leg(-86, air ? 10 : Math.max(0, -walk));
      G.ellipse(ctx, -45, -112 + cr, 125, 82, TEAL, 4);
      G.ellipse(ctx, -40, -66 + cr, 86, 30, BELLY, 3);
      ctx.strokeStyle = G.col('#f0b93a'); ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-112 + i * 44, -140 + cr + (i % 2) * 16, 14, 0.2, 4.6); ctx.stroke(); }
      leg(20, air ? 12 : Math.max(0, -walk)); leg(62, air ? 24 : this.paw * 74 + Math.max(0, walk));
    }
    drawHead(ctx, t, m) {   // 以头部中心为原点，朝 +x
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * (0.39 + 1.22 * i / 11), rr = 84 + Math.sin(t * 6 + i) * (4 + this.rage * 5);
        G.circle(ctx, Math.cos(a) * rr - 8, Math.sin(a) * rr - 6, 24 + this.rage * 3, i % 2 ? '#e8372c' : '#f0b93a', 3.5);
      }
      if (m > 0.05) {
        ctx.beginPath(); ctx.moveTo(-4, 24); ctx.lineTo(96, 20); ctx.lineTo(92 - m * 14, 34 + m * 52); ctx.lineTo(-4, 36 + m * 14); ctx.closePath(); G.done(ctx, '#5a0f1a', 3.5);
        G.ellipse(ctx, 40, 36 + m * 26, 26, 6 + m * 8, '#ff6b6b', 0);
      }
      ctx.save(); ctx.rotate(m * 0.5);
      G.rrect(ctx, -12, 28, 104, 38, 18, TEAL, 4);
      G.poly(ctx, [58, 31, 67, 8, 76, 31], '#fffdf5', 3); G.poly(ctx, [26, 31, 34, 14, 42, 31], '#fffdf5', 3);
      ctx.restore();
      G.poly(ctx, [-40, -70, -64, -114, -16, -86], TEAL, 4);
      G.circle(ctx, 0, -8, 84, TEAL, 4);
      G.rrect(ctx, 20, -18, 86, 52, 22, '#3aa3a0', 4);
      G.ellipse(ctx, 98, -6, 12, 9, '#1c4a55', 3);
      G.poly(ctx, [44, 32, 52, 55, 60, 32], '#fffdf5', 3); G.poly(ctx, [74, 32, 81, 51, 88, 32], '#fffdf5', 3);
      if (this.hornGlow) { ctx.globalAlpha = 0.5 + Math.sin(t * 30) * 0.3; G.circle(ctx, 40, -150, 34, '#fff3a0', 0); ctx.globalAlpha = 1; }
      ctx.beginPath(); ctx.moveTo(-8, -84); ctx.quadraticCurveTo(8, -150, 54, -162); ctx.quadraticCurveTo(36, -120, 32, -76); ctx.closePath(); G.done(ctx, '#fff3c4', 4);
      G.ellipse(ctx, 34, -38, 20, 17, this.rage ? '#ffd34d' : '#fffdf5', 3.5);
      if (this.dead) G.text(ctx, '×', 34, -37, 28, G.OUT); else G.circle(ctx, 40, -36, 7, this.rage ? '#b3202a' : G.OUT, 0);
      G.poly(ctx, [6, -64, 60, -48, 58, -38, 8, -50], '#e8372c', 3.5);
      ctx.beginPath(); ctx.arc(-10, 14, 16, 0.3, 4.4); ctx.strokeStyle = G.col('#f0b93a'); ctx.lineWidth = 4; ctx.stroke();
    }
  }

  TH.HazDraw.sound = function (ctx, h) {   // 声波
    const d = Math.sign(h.vx) || 1, c = h.pink ? G.PINK : (h.low ? '#ffd34d' : '#9db7ff');
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse(h.x - d * (i * 20 + 14), h.y, 26, Math.max(4, h.h / 2 - i * 8), 0, d > 0 ? -Math.PI * 0.42 : Math.PI * 0.58, d > 0 ? Math.PI * 0.42 : Math.PI * 1.42);
      ctx.lineCap = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = G.OUT; ctx.stroke(); ctx.lineWidth = 6; ctx.strokeStyle = c; ctx.stroke();
    }
  };
  TH.HazDraw.spike = function (ctx, h) {   // 冰刺
    const k = Math.min(1, h.t / 0.07) * Math.min(1, (h.life - h.t) / 0.12), hh = 150 * k, x = h.x;
    G.poly(ctx, [x - 25, GY, x - 9, GY - hh * 0.6, x, GY - hh, x + 10, GY - hh * 0.55, x + 25, GY], '#dff3ff', 3.5);
    G.line(ctx, x, GY - hh, x + 3, GY - 4, '#9db7ff', 2.5);
  };
  TH.HazDraw.flame = function (ctx, h) {   // 地面余焰
    const k = Math.min(1, (h.life - h.t) / 0.3);
    for (let i = -1; i <= 1; i++) {
      const x = h.x + i * 26, hh = (30 + Math.sin(h.t * 22 + i * 2) * 10 + (i ? 0 : 12)) * k;
      G.poly(ctx, [x - 15, GY, x - 6, GY - hh * 0.5, x, GY - hh, x + 7, GY - hh * 0.45, x + 15, GY], '#ff6a2a', 3);
      G.poly(ctx, [x - 7, GY, x, GY - hh * 0.55, x + 7, GY], '#ffd34d', 0);
    }
  };
  TH.HazDraw.icicle = function (ctx, h) {   // 冰锥
    G.poly(ctx, [h.x - 13, h.y - 26, h.x + 13, h.y - 26, h.x, h.y + 22], '#dff3ff', 3.5);
    G.line(ctx, h.x - 3, h.y - 20, h.x, h.y + 10, '#9db7ff', 2.5);
  };
  TH.HazDraw.debris = function (ctx, h) {   // 被吸来的雪块
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
    G.star(ctx, 0, 0, h.r + 3, h.r * 0.72, 7, 0, h.pink ? G.PINK : '#eef4ff', 3.5);
    G.circle(ctx, -5, -5, h.r * 0.3, h.pink ? '#ffd0e4' : '#c3d1ee', 0);
    ctx.restore();
  };
  TH.HazDraw.bolt = function (ctx, h) {   // 角雷
    const pts = [h.x + TH.rand(-8, 8), 0];
    for (let y = 70; y < GY; y += 70) pts.push(h.x + TH.rand(-24, 24), y);
    pts.push(h.x, GY);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineWidth = 30; ctx.strokeStyle = G.OUT; ctx.stroke(); ctx.lineWidth = 22; ctx.strokeStyle = '#ffd34d'; ctx.stroke();
    ctx.lineWidth = 8; ctx.strokeStyle = '#fffbe0'; ctx.stroke();
    G.star(ctx, h.x, GY - 6, 44, 18, 7, h.t * 20, '#fff3a0', 3);
  };

  let iconBoss = null;
  TH.BossList.push({
    id: 'nian', name: '年兽·夕', sub: '雪夜村口', bg: 'snow', music: 'nian', par: 140,
    taunts: ['“红灯笼吓不倒我，你也一样！”', '“今年的年夜饭，就是你了。”', '“爆竹声太小——再响一点啊！”'],
    make: () => new Nian(),
    icon(ctx, x, y, s) {
      if (!iconBoss) iconBoss = new Nian();
      iconBoss.t = TH.time;
      ctx.save(); ctx.translate(x + 6 * s, y + 18 * s); ctx.scale(-s * 0.66, s * 0.66); iconBoss.drawHead(ctx, TH.time, 0.3); ctx.restore();
    }
  });
})();
