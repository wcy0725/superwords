'use strict';
// Boss 2：燕夫人（沙燕风筝）—— 纸镖 / 线轴 / 俯冲 → 起风 + 小风筝编队 → 化作蜈蚣风筝满场游走
(function () {
  const TH = window.TH, G = TH.Gfx, GY = TH.GROUND, TAU = TH.TAU, W = TH.W, H = TH.H;
  const NAVY = '#27407a', SP = 5, SEGS = 13;
  const q = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c;
  const baseX = ct => 640 + 500 * Math.sin(ct * 0.75), baseY = ct => 250 + 130 * Math.sin(ct * 1.9 + 1);
  const SEGCOL = ['#e8372c', '#f0b93a', '#3f8f7a', '#27407a'];

  class Kite extends TH.Boss {
    constructor() {
      super({ name: '燕夫人', hp: 1050, phases: [0.6, 0.3] });
      this.x = 980; this.y = -220; this.homeX = 980; this.homeY = 230; this.side = 1; this.tilt = 0; this.mode = 'swallow';
      this.free = false; this.path = null; this.windT = 0; this.windDir = 0; this.fallV = 0;
      this.trail = []; this.ct = 0; this.diveK = 0; this.enterK = 1;
    }
    hurtShapes() {
      if (this.mode === 'swallow') return [{ x: this.x, y: this.y, r: 62 }, { x: this.x, y: this.y - 6, w: 260, h: 44 }];
      const s = [{ x: this.x, y: this.y, r: 46 }];
      for (let i = 1; i <= SEGS; i++) { const p = this.trail[i * SP]; if (p) s.push({ x: p.x, y: p.y, r: 24 }); }
      return s;
    }
    update(dt) {
      this.step(dt);
      if (this.dead) {
        if (this.mode === 'swallow') { this.fallV += 900 * dt; this.y = Math.min(GY - 60, this.y + this.fallV * dt); this.tilt += dt * 3 * (this.y < GY - 61 ? 1 : 0); }
        return;
      }
      if (this.mode === 'swallow') {
        if (this.free) {
          const tx = this.homeX + Math.sin(this.t * 1.3) * 70, ty = this.homeY + Math.sin(this.t * 2.1) * 34, k = Math.min(1, dt * 3);
          this.tilt = TH.clamp((tx - this.x) * 0.004, -0.3, 0.3);
          this.x += (tx - this.x) * k; this.y += (ty - this.y) * k;
        }
        if (this.phase === 2 && !this.invuln) {
          this.windT -= dt;
          if (this.windT <= 0) { this.windDir = this.windDir ? -this.windDir : TH.pick([-1, 1]); this.windT = this.w(7); TH.Audio.sfx('whoosh'); }
          TH.world.wind = this.windDir * 135;
        }
      } else {
        this.ct += dt * this.rate;
        this.x = baseX(this.ct); this.y = TH.lerp(baseY(this.ct), GY - 60, this.diveK) - 560 * this.enterK;
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > (SEGS + 1) * SP) this.trail.pop();
      }
    }
    onDeath() { this.fallV = -300; }

    *intro() {
      for (let t = 0; t < 1; t += TH.STEP / 1.3) { this.y = TH.lerp(-220, this.homeY, TH.backOut(t)); this.tilt = Math.sin(t * 9) * 0.25 * (1 - t); yield 0; }
      this.free = true; TH.Audio.sfx('whoosh'); yield 0.8;
    }
    *transition(n) {
      this.path = null; this.free = false; this.diveK = 0;
      const sx = this.x, sy = this.y;
      this.side = this.x > W / 2 ? 1 : -1; this.homeX = this.side > 0 ? 980 : 300;
      if (n === 2) {
        for (let t = 0; t < 1; t += TH.STEP / 0.6) { this.x = TH.lerp(sx, this.homeX, t); this.y = TH.lerp(sy, this.homeY, t); this.tilt = Math.sin(t * 20) * 0.3; yield 0; }
        G.shards(this.x, this.y, ['#f0b93a', '#e8372c', '#fff8ea'], 22, 480); TH.Audio.sfx('gong');
        G.float(W / 2, 150, '起风了！', '#fff8ea', 54);
        this.tilt = 0; this.free = true; this.windDir = 0; this.windT = 0.9;
        yield 0.9;
      } else {
        for (let t = 0; t < 1; t += TH.STEP / 0.9) { this.y = TH.lerp(sy, -320, t * t); this.tilt += 0.4; yield 0; }
        G.shards(this.x, 40, ['#27407a', '#f0b93a', '#e8372c'], 30, 520); TH.Audio.sfx('gong');
        this.mode = 'centi'; this.ct = 0; this.enterK = 1; this.tilt = 0;
        this.x = baseX(0); this.y = baseY(0) - 560; this.trail = [];
        for (let i = 0; i < (SEGS + 1) * SP; i++) this.trail.push({ x: this.x, y: this.y });
        yield 0.3;
        for (let t = 0; t < 1; t += TH.STEP / 1.0) { this.enterK = 1 - TH.easeOut(t); yield 0; }
        this.enterK = 0; TH.Audio.sfx('roar');
      }
    }

    *phase1() { for (const p of TH.shuffle(['darts', 'spools', 'swoop'])) { yield* this[p](); yield this.w(0.75); } }
    *phase2() { for (const p of TH.shuffle(['squad', 'fan', 'swoop', 'spools'])) { yield* this[p](); yield this.w(0.6); } }
    *phase3() {
      yield this.w(1.3);
      TH.Audio.sfx('tele'); yield this.w(0.3);
      if (Math.random() < 0.5) {
        const n = 10 + TH.diff * 2, off = TH.rand(0, TAU);
        for (let i = 0; i < n; i++) TH.fireOrb(this.x, this.y, off + i * TAU / n, 300 * this.rate, { pink: i % 5 === 0, r: 14, color: '#f0b93a' });
        TH.Audio.sfx('spit');
      } else {
        for (let v = 0; v < 3; v++) {
          const a = TH.aimAt(this.x, this.y);
          for (let k = -1; k <= 1; k++) this.dart(a + k * 0.24, 470, v === 1 && k === 0);
          TH.Audio.sfx('spit'); yield this.w(0.4);
        }
      }
      yield this.w(1.1);
      const dur = this.w(1.9);
      G.warn(baseX(this.ct + 0.95), dur * 0.62, 240); TH.Audio.sfx('warn');
      for (let t = 0; t < 1; t += TH.STEP / dur) { this.diveK = Math.pow(Math.sin(t * Math.PI), 0.8); yield 0; }
      this.diveK = 0;
    }

    dart(a, spd, pink) {
      TH.spawnHaz({ x: this.x, y: this.y + (this.mode === 'swallow' ? 30 : 0), vx: Math.cos(a) * spd * this.rate, vy: Math.sin(a) * spd * this.rate, r: 11, kind: 'dart', pink, life: 5 });
    }
    *darts() {
      TH.Audio.sfx('tele'); yield this.w(0.4);
      for (let v = 0; v < 3; v++) {
        const a = TH.aimAt(this.x, this.y + 30);
        for (let i = 0; i < 3; i++) { this.dart(a, 640, v === 1 && i === 1); TH.Audio.sfx('spit'); yield this.w(0.1); }
        yield this.w(0.55);
      }
    }
    *fan() {
      TH.Audio.sfx('tele'); yield this.w(0.4);
      for (let v = 0; v < 2 + (TH.diff > 1 ? 1 : 0); v++) {
        const a = TH.aimAt(this.x, this.y + 30) + (v % 2 ? 0.13 : 0);
        for (let k = -2; k <= 2; k++) this.dart(a + k * 0.26, 520, k === 0 && v === 0);
        TH.Audio.sfx('spit'); yield this.w(0.8);
      }
    }
    *spools() {
      TH.Audio.sfx('tele'); yield this.w(0.4);
      const dir = -this.side, rate = this.rate;
      for (let i = 0; i < 3 + (TH.diff > 1 ? 1 : 0); i++) {
        TH.spawnHaz({ x: this.x + TH.rand(-40, 40), y: this.y + 40, vy: 100, g: 1600, r: 22, kind: 'spool', pink: i === 1, life: 8, vr: dir * 9, bounceV: 1,
          onBounce: z => { z.g = 0; z.vy = 0; z.bounceV = 0; z.vx = dir * 340 * rate; TH.Audio.sfx('land'); } });
        TH.Audio.sfx('spit');
        yield this.w(0.5);
      }
    }
    *swoop() {
      this.free = false;
      const sx = this.x, sy = this.y, ex = W - this.homeX, ey = this.homeY, cx = 640, cy = 870;
      this.path = { sx, sy, cx, cy, ex, ey };
      TH.Audio.sfx('warn');
      for (let t = 0; t < 1; t += TH.STEP / this.w(0.8)) { this.tilt = -this.side * 0.5 * t; yield 0; }
      TH.Audio.sfx('whoosh');
      const dur = this.w(1.15);
      for (let t = 0; t < 1; t += TH.STEP / dur) {
        const u = TH.easeInOut(t), px = q(sx, cx, ex, u), py = q(sy, cy, ey, u);
        this.tilt = TH.clamp((px - this.x) / TH.STEP * 0.0012, -0.8, 0.8);
        this.x = px; this.y = py; yield 0;
      }
      this.path = null; this.side = -this.side; this.homeX = W - this.homeX; this.tilt = 0; this.free = true;
    }
    *squad() {
      TH.Audio.sfx('tele'); yield this.w(0.4);
      const dir = -this.side, n = 5 + TH.diff, pinkAt = TH.randi(1, n - 2);
      let last = null;
      for (let i = 0; i < n; i++) {
        let low = Math.random() < 0.5;
        if (low === last && Math.random() < 0.7) low = !low;
        last = low;
        TH.spawnHaz({ x: dir > 0 ? -40 : W + 40, y: 0, y0: low ? GY - 24 : GY - 68, vx: dir * 430 * this.rate, r: 20, kind: 'minikite', pink: i === pinkAt, life: 6, ci: i,
          update: z => { z.y = z.y0 + Math.sin(z.t * 8) * 5; } });
        yield this.w(0.5);
      }
    }

    draw(ctx) {
      const t = this.t, shx = this.dead ? TH.rand(-5, 5) : 0;
      if (this.windDir && this.phase === 2 && !this.dead) {   // 风线与风向预告
        ctx.lineCap = 'round';
        for (let i = 0; i < 14; i++) {
          const sp = 700 + (i * 53 % 300), span = W + 240;
          const x = (((i * 173 + t * sp * this.windDir) % span) + span) % span - 120, y = 60 + (i * 97 % 500);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - this.windDir * (60 + (i % 3) * 30), y);
          ctx.strokeStyle = 'rgba(39,64,122,.35)'; ctx.lineWidth = 6; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 3; ctx.stroke();
        }
        if (this.windT < 1.2 && Math.floor(t * 10) % 2) G.title(ctx, this.windDir > 0 ? '◀ 风向将变' : '风向将变 ▶', W / 2, 120, 34, '#fff8ea');
      }
      if (this.path) {   // 俯冲轨迹预告
        const p = this.path;
        ctx.fillStyle = 'rgba(232,55,44,.75)';
        for (let i = 1; i < 22; i++) { const u = i / 22; ctx.beginPath(); ctx.arc(q(p.sx, p.cx, p.ex, u), q(p.sy, p.cy, p.ey, u), 5 + (Math.floor(t * 12 + i) % 2) * 2, 0, TAU); ctx.fill(); }
      }
      G.flash = this.flashT > 0;
      if (this.mode === 'swallow') {
        if (!this.dead) G.line(ctx, this.x, this.y + 50, this.x + this.side * 90, H + 20, 'rgba(42,23,17,.4)', 2);
        ctx.save(); ctx.translate(this.x + shx, this.y); ctx.rotate(this.tilt); this.drawSwallow(ctx, t); ctx.restore();
      } else this.drawCenti(ctx, t, shx);
      G.flash = false;
    }
    drawSwallow(ctx, t) {
      const flap = Math.sin(t * 6) * 8, pl = (TH.world && TH.world.player) || { x: this.x - 200, y: this.y + 300 };
      const ang = Math.atan2(pl.y - this.y, pl.x - this.x) - this.tilt, ex = Math.cos(ang) * 3.5, ey = Math.sin(ang) * 3.5;
      for (const s of [-1, 1]) {
        const sw = Math.sin(t * 4 + s) * 10;
        ctx.beginPath(); ctx.moveTo(s * 8, 44); ctx.quadraticCurveTo(s * 42 + sw, 92, s * 60 + sw, 152);
        ctx.quadraticCurveTo(s * 28 + sw * .5, 112, s * 2, 70); ctx.closePath(); G.done(ctx, NAVY, 3.5);
        G.circle(ctx, s * 42 + sw * 0.8, 116, 7, '#f0b93a', 2.5);
      }
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(s * 18, -30); ctx.quadraticCurveTo(s * 90, -64 - flap, s * 150, -22 + flap);
        ctx.quadraticCurveTo(s * 160, 6 + flap, s * 132, 22 + flap); ctx.quadraticCurveTo(s * 80, 4, s * 20, 30); ctx.closePath(); G.done(ctx, NAVY, 4);
        ctx.beginPath(); ctx.moveTo(s * 32, -16); ctx.quadraticCurveTo(s * 90, -40 - flap * .8, s * 134, -10 + flap * .9);
        ctx.quadraticCurveTo(s * 90, -6, s * 32, 12); ctx.closePath(); G.done(ctx, '#f0b93a', 2.5);
        G.circle(ctx, s * 74, -12 - flap * .3, 9, '#e8372c', 2.5); G.circle(ctx, s * 106, -7 + flap * .4, 6, '#fff8ea', 2.5);
      }
      ctx.beginPath(); ctx.moveTo(-24, -34); ctx.quadraticCurveTo(-30, 20, -10, 56); ctx.lineTo(10, 56); ctx.quadraticCurveTo(30, 20, 24, -34); ctx.closePath(); G.done(ctx, NAVY, 4);
      G.ellipse(ctx, 0, 16, 13, 22, '#fff8ea', 3); G.circle(ctx, 0, 9, 5, '#e8372c', 0); G.circle(ctx, 0, 25, 4, '#f0b93a', 0);
      G.circle(ctx, 0, -52, 36, '#fff8ea', 4);
      ctx.beginPath(); ctx.arc(0, -52, 36, Math.PI * 1.15, Math.PI * 1.85); ctx.closePath(); G.done(ctx, NAVY, 3.5);
      for (const s of [-1, 1]) {
        G.ellipse(ctx, s * 14, -50, 9, 11, '#fffdf5', 3);
        if (this.dead) G.text(ctx, '×', s * 14, -49, 18, G.OUT); else G.circle(ctx, s * 14 + ex, -49 + ey, 4.5, G.OUT, 0);
        G.line(ctx, s * 3, -58, s * 26, -66, G.OUT, 4);
        G.circle(ctx, s * 25, -37, 6, 'rgba(232,55,44,.55)', 0);
      }
      G.poly(ctx, [-7, -40, 7, -40, 0, -25], '#f0b93a', 3);
    }
    drawCenti(ctx, t, shx) {
      for (let i = SEGS; i >= 1; i--) {
        const p = this.trail[i * SP], p2 = this.trail[i * SP - 2]; if (!p || !p2) continue;
        const a = Math.atan2(p2.y - p.y, p2.x - p.x) + Math.PI / 2, wob = Math.sin(t * 9 + i) * 0.25, r = 25 - i * 0.5;
        const cx = Math.cos(a + wob), cy = Math.sin(a + wob), px = p.x + shx * (i % 2 ? 1 : -1);
        G.line(ctx, px - cx * (r + 22), p.y - cy * (r + 22), px + cx * (r + 22), p.y + cy * (r + 22), G.OUT, 3);
        G.circle(ctx, px - cx * (r + 22), p.y - cy * (r + 22), 6, '#fff8ea', 2.5); G.circle(ctx, px + cx * (r + 22), p.y + cy * (r + 22), 6, '#fff8ea', 2.5);
        G.circle(ctx, px, p.y, r, SEGCOL[i % 4], 3.5); G.circle(ctx, px, p.y, r * 0.5, '#fff8ea', 2.5);
      }
      const p1 = this.trail[3] || { x: this.x - 1, y: this.y }, a = Math.atan2(this.y - p1.y, this.x - p1.x);
      const pl = (TH.world && TH.world.player) || { x: 0, y: H }, ea = Math.atan2(pl.y - this.y, pl.x - this.x);
      ctx.save(); ctx.translate(this.x + shx, this.y);
      for (const s of [-1, 1]) {   // 触须
        const ax = Math.cos(a + s * 0.6) * 78, ay = Math.sin(a + s * 0.6) * 78 + Math.sin(t * 8 + s) * 6;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(ax * 0.7, ay * 0.7 - 16, ax, ay); ctx.strokeStyle = G.OUT; ctx.lineWidth = 4; ctx.stroke();
        G.circle(ctx, ax, ay, 8, '#f0b93a', 3);
      }
      G.circle(ctx, 0, 0, 46, '#e8372c', 4); G.circle(ctx, 0, 0, 36, '#f0b93a', 3);
      for (const s of [-1, 1]) {
        G.circle(ctx, s * 16, -8, 13, '#fffdf5', 3);
        if (this.dead) G.text(ctx, '×', s * 16, -7, 22, G.OUT); else G.circle(ctx, s * 16 + Math.cos(ea) * 5, -8 + Math.sin(ea) * 5, 6, G.OUT, 0);
        G.line(ctx, s * 4, -20, s * 30, -28, G.OUT, 5);
        G.poly(ctx, [s * 8, 16, s * 18, 16, s * 13, 30], '#fffdf5', 2.5);
      }
      G.rrect(ctx, -22, 10, 44, 9, 4, '#5a0f1a', 3);
      ctx.restore();
    }
  }

  TH.HazDraw.dart = function (ctx, h) {   // 纸镖
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(h.vy, h.vx));
    G.poly(ctx, [17, 0, -13, 11, -6, 0, -13, -11], h.pink ? G.PINK : '#fffdf5', 3);
    G.line(ctx, -6, 0, 15, 0, h.pink ? '#ffd0e4' : '#b9c4d6', 2);
    ctx.restore();
  };
  TH.HazDraw.spool = function (ctx, h) {   // 线轴
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
    G.circle(ctx, 0, 0, h.r, h.pink ? G.PINK : '#c98a4b', 3.5);
    G.circle(ctx, 0, 0, h.r * 0.62, h.pink ? '#ffd0e4' : '#fff8ea', 2.5);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; G.line(ctx, Math.cos(a) * h.r * 0.6, Math.sin(a) * h.r * 0.6, -Math.cos(a) * h.r * 0.6, -Math.sin(a) * h.r * 0.6, 'rgba(42,23,17,.45)', 2); }
    G.circle(ctx, 0, 0, 4, G.OUT, 0);
    ctx.restore();
  };
  TH.HazDraw.minikite = function (ctx, h) {   // 小风筝
    const d = Math.sign(h.vx) || 1, c = h.pink ? G.PINK : SEGCOL[h.ci % 4];
    for (let i = 1; i <= 4; i++) G.circle(ctx, h.x - d * (18 + i * 11), h.y + Math.sin(h.t * 12 + i) * 5, 4, '#fff8ea', 2);
    G.poly(ctx, [h.x + d * 24, h.y, h.x, h.y - 19, h.x - d * 20, h.y, h.x, h.y + 19], c, 3.5);
    G.line(ctx, h.x - d * 20, h.y, h.x + d * 24, h.y, G.OUT, 2); G.line(ctx, h.x, h.y - 19, h.x, h.y + 19, G.OUT, 2);
  };

  let iconBoss = null;
  TH.BossList.push({
    id: 'kite', name: '燕夫人', sub: '风筝坡 · 晴日', bg: 'hill', music: 'kite', par: 125,
    taunts: ['“线在我手里，你飞不高的。”', '“起风了——该你下场啦！”', '“小老虎也想上天？做梦去吧。”'],
    make: () => new Kite(),
    icon(ctx, x, y, s) {
      if (!iconBoss) iconBoss = new Kite();
      iconBoss.t = TH.time;
      ctx.save(); ctx.translate(x, y + 14 * s); ctx.scale(s * 0.62, s * 0.62); iconBoss.drawSwallow(ctx, TH.time); ctx.restore();
    }
  });
})();
