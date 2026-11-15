'use strict';
// Boss 1：金鬃醒狮 —— 绣球连珠 / 爆竹雨 / 扑跃 → 采青飞叶 / 火球 → 狮头脱壳满场弹
(function () {
  const TH = window.TH, G = TH.Gfx, GY = TH.GROUND, TAU = TH.TAU, W = TH.W;
  const PAL = [
    { body: '#e8372c', trim: '#ffd34d', fur: '#fff8ea', head: '#f0b93a', accent: '#3f8f7a' },
    { body: '#b3202a', trim: '#f0b93a', fur: '#ffe9c2', head: '#e8372c', accent: '#2b3a67' },
    { body: '#2b2233', trim: '#e8372c', fur: '#e8e0f0', head: '#4a3a5a', accent: '#ffd34d' }
  ];
  const q = (a, b, c, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c;

  class Lion extends TH.Boss {
    constructor() {
      super({ name: '金鬃醒狮', hp: 900, phases: [0.62, 0.28] });
      this.x = 1440; this.y = GY; this.side = 1; this.fv = -1; this.jumpY = 0; this.crouch = 0; this.pal = 0;
      this.mouth = 0; this.mouthT = 0; this.shakeHead = 0; this.mode = 'body';
      this.hx = 0; this.hy = 0; this.hvx = 0; this.hvy = 0; this.hold = false; this.burst = false; this.spin = 0;
    }
    get f() { return -this.side; }
    headPos() {
      if (this.mode === 'head') return { x: this.hx, y: this.hy };
      return { x: this.x + this.fv * 72, y: this.y + this.jumpY - 156 + this.crouch * 36 + Math.sin(this.t * 3) * 5 };
    }
    hurtShapes() {
      const h = this.headPos();
      if (this.mode === 'head') return [{ x: h.x, y: h.y, r: 78 }];
      return [{ x: h.x, y: h.y, r: 80 }, { x: this.x - this.fv * 62, y: this.y + this.jumpY - 100, w: 190, h: 150 }];
    }
    contactShapes() {
      const s = this.hurtShapes();
      if (this.mode === 'body') s.push({ x: this.x + this.fv * 25, y: this.y + this.jumpY - 45, w: 120, h: 90 });
      return s;
    }
    update(dt) {
      this.step(dt);
      this.mouth += (this.mouthT - this.mouth) * Math.min(1, dt * 14);
      this.shakeHead = Math.max(0, this.shakeHead - dt);
      if (this.mode !== 'head') return;
      if (this.dead) { this.hvy += 1500 * dt; this.hy = Math.min(GY - 74, this.hy + this.hvy * dt); this.spin *= 0.94; return; }
      if (this.burst) this.spin += dt * 15;
      if (this.hold) return;
      this.hx += this.hvx * dt; this.hy += this.hvy * dt; this.spin += dt * 2.4 * Math.sign(this.hvx);
      let hit = false;
      if ((this.hx < 112 && this.hvx < 0) || (this.hx > W - 112 && this.hvx > 0)) { this.hvx = -this.hvx; hit = true; }
      if ((this.hy < 112 && this.hvy < 0) || (this.hy > GY - 94 && this.hvy > 0)) { this.hvy = -this.hvy; hit = true; }
      if (hit) { TH.Audio.sfx('drum'); G.puff(this.hx, this.hy + (this.hvy < 0 ? 70 : 0), 3, '#fff8ea', 12); }
    }
    onDeath() { this.hvy = -500; this.mouthT = 1; }

    *intro() {
      for (let t = 0; t < 1; t += TH.STEP / 1.1) {
        this.x = TH.lerp(1440, 1010, TH.easeOut(t)); this.jumpY = -Math.abs(Math.sin(t * Math.PI * 3)) * 46 * (1 - t); yield 0;
      }
      this.x = 1010; this.jumpY = 0; this.mouthT = 1; this.shakeHead = 0.6; TH.Audio.sfx('roar'); G.shake(6, 0.5);
      yield 0.7; this.mouthT = 0; yield 0.3;
    }
    *transition(n) {
      this.mouthT = 0; this.crouch = 0;
      const sx = this.x, sj = this.jumpY, sf = this.fv;
      this.side = this.x > W / 2 ? 1 : -1;
      const tx = this.side > 0 ? 1010 : 270;
      for (let t = 0; t < 1; t += TH.STEP / 0.45) { this.x = TH.lerp(sx, tx, t); this.jumpY = TH.lerp(sj, 0, t); this.fv = TH.lerp(sf, -this.side, t); yield 0; }
      this.x = tx; this.jumpY = 0; this.fv = -this.side;
      this.mouthT = 1; this.shakeHead = 1.0; TH.Audio.sfx('roar'); G.shake(8, 0.8);
      yield 0.55;
      const h = this.headPos();
      if (n === 2) {
        this.pal = 1; G.shards(this.x, GY - 110, ['#f0b93a', '#ffd34d', '#fff8ea'], 26, 520); G.boom(h.x, h.y, 1.4);
      } else {
        this.pal = 2; this.hx = h.x; this.hy = h.y; this.mode = 'head'; this.hold = true;
        this.hvx = this.f * 340 * this.rate; this.hvy = -250 * this.rate;
        G.shards(this.x, GY - 100, ['#b3202a', '#f0b93a', '#ffe9c2'], 36, 560); G.boom(this.x - this.f * 60, GY - 100, 1.6);
      }
      TH.Audio.sfx('gong');
      yield 0.8; this.mouthT = 0; this.hold = false; yield 0.2;
    }

    *phase1() { for (const p of TH.shuffle(['balls', 'crackers', 'pounce'])) { yield* this[p](); yield this.w(0.7); } }
    *phase2() { for (const p of TH.shuffle(['lettuce', 'fire', 'balls', 'pounce2'])) { yield* this[p](); yield this.w(0.55); } }
    *phase3() {
      yield this.w(TH.rand(2.0, 3.0));
      this.hold = true; this.burst = true; this.mouthT = 1; TH.Audio.sfx('tele'); yield this.w(0.55);
      const n = 12 + TH.diff * 2; let off = TH.rand(0, TAU);
      for (let k = 0; k < 2 + (TH.diff > 1 ? 1 : 0); k++) {
        for (let i = 0; i < n; i++) TH.fireOrb(this.hx, this.hy, off + i * TAU / n, 320 * this.rate, { pink: i % 6 === 0, r: 14 });
        TH.Audio.sfx('spit'); off += TAU / n / 2;
        yield this.w(0.55);
      }
      this.hold = false; this.burst = false; this.mouthT = 0;
      if (Math.random() < 0.5) yield* this.crackers();
    }

    *balls() {
      this.mouthT = 1; TH.Audio.sfx('tele'); yield this.w(0.45);
      const n = 4 + TH.diff, pinkAt = TH.randi(1, n - 1), f = this.f;
      for (let i = 0; i < n; i++) {
        const h = this.headPos();
        TH.spawnHaz({ x: h.x + f * 40, y: h.y + 30, vx: f * TH.rand(300, 430) * this.rate, vy: -TH.rand(100, 420), g: 1500, r: 26, kind: 'ball',
          pink: i === pinkAt, bounceV: TH.pick([600, 720, 840]), vr: f * 7, life: 7, onBounce: () => TH.Audio.sfx('land') });
        TH.Audio.sfx('spit'); this.shakeHead = 0.12;
        yield this.w(0.45);
      }
      this.mouthT = 0;
    }
    *crackers() {
      this.mouthT = 0.6; this.shakeHead = 0.8; TH.Audio.sfx('roar'); yield this.w(0.5);
      for (let k = 0; k < 2 + (TH.diff > 1 ? 1 : 0); k++) {
        const cols = TH.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4 + TH.diff).map(s => 100 + s * 120);
        cols[0] = TH.clamp(TH.world.player.x, 60, W - 60);
        for (const x of cols) G.warn(x, this.w(0.85), 80, true);
        TH.Audio.sfx('warn');
        yield this.w(0.85);
        for (const x of cols) {
          TH.spawnHaz({ x, y: -40 - TH.rand(0, 80), vy: 520, g: 900, r: 20, kind: 'cracker', dieOnGround: true, vr: TH.rand(-6, 6),
            onDie: h => {
              if (h.parried) return;
              TH.spawnHaz({ x: h.x, y: GY - 30, r: 62, kind: 'blast', life: 0.22 });
              TH.Audio.sfx('crack'); G.shards(h.x, GY - 20, ['#e8372c', '#ffd34d'], 6, 300);
            } });
        }
        yield this.w(1.0);
      }
      this.mouthT = 0;
    }
    *pounce() {
      const sx = this.x, tx = this.side > 0 ? 270 : 1010, f0 = this.fv;
      TH.Audio.sfx('tele'); G.warn(tx, this.w(0.55) + this.w(0.95), 320);
      for (let t = 0; t < 1; t += TH.STEP / this.w(0.55)) { this.crouch = TH.easeOut(t); yield 0; }
      TH.Audio.sfx('whoosh');
      const dur = this.w(0.95);
      for (let t = 0; t < 1; t += TH.STEP / dur) {
        this.crouch = Math.max(0, 1 - t * 4); this.x = TH.lerp(sx, tx, t); this.jumpY = -Math.sin(t * Math.PI) * 340;
        this.fv = TH.lerp(f0, -f0, TH.easeInOut(TH.clamp((t - 0.55) / 0.4, 0, 1)));
        yield 0;
      }
      this.x = tx; this.jumpY = 0; this.side = -this.side; this.fv = -this.side; this.crouch = 0.6;
      TH.Audio.sfx('boom'); G.shake(12, 0.35); G.puff(tx, GY - 10, 8, '#fff8ea', 24);
      TH.shock(tx - 70, -1, 500 * this.rate); TH.shock(tx + 70, 1, 500 * this.rate);
      for (let t = 0; t < 1; t += TH.STEP / 0.3) { this.crouch = 0.6 * (1 - t); yield 0; }
      this.crouch = 0;
    }
    *pounce2() { yield* this.pounce(); yield this.w(0.3); yield* this.pounce(); }
    *lettuce() {
      this.mouthT = 1; TH.Audio.sfx('tele'); yield this.w(0.4);
      const n = 6 + TH.diff, f = this.f;
      for (let i = 0; i < n; i++) {
        const h = this.headPos();
        TH.spawnHaz({ x: h.x + f * 30, y: h.y + 20, vx: f * TH.rand(140, 560), vy: -TH.rand(520, 820), g: 760, r: 19, kind: 'leaf', pink: i % 3 === 1,
          life: 9, ph: TH.rand(0, TAU), dieOnGround: true,
          update: z => { if (z.vy > 120) { z.vy = 120; z.vx = Math.sin(z.t * 3 + z.ph) * 150; } z.rot = Math.sin(z.t * 3 + z.ph) * 0.6; },
          onDie: z => G.puff(z.x, z.y, 2, '#9ad36a', 8) });
        TH.Audio.sfx('spit');
        yield this.w(0.2);
      }
      this.mouthT = 0; yield this.w(1.2);
    }
    *fire() {
      this.mouthT = 1; TH.Audio.sfx('tele'); yield this.w(0.4);
      for (let v = 0; v < 3; v++) {
        const h = this.headPos(), a = TH.aimAt(h.x, h.y + 20);
        for (let k = -1; k <= 1; k++) TH.fireOrb(h.x + this.f * 40, h.y + 24, a + k * 0.3, 430 * this.rate, { pink: k === 0 && v === 1 });
        TH.Audio.sfx('spit'); this.shakeHead = 0.15;
        yield this.w(0.6);
      }
      this.mouthT = 0;
    }

    draw(ctx) {
      const P = PAL[this.pal], t = this.t, shx = this.dead ? TH.rand(-5, 5) : 0;
      G.flash = this.flashT > 0;
      if (this.mode === 'body') {
        G.ellipse(ctx, this.x, GY + 6, 150, 12, 'rgba(20,8,10,.25)', 0);
        ctx.save(); ctx.translate(this.x + shx, this.y + this.jumpY);
        ctx.scale(Math.abs(this.fv) < 0.08 ? (this.fv < 0 ? -0.08 : 0.08) : this.fv, 1);
        this.drawBody(ctx, P, t);
        ctx.restore();
      }
      const h = this.headPos();
      this.drawHead(ctx, h.x + shx, h.y, P, t);
      G.flash = false;
    }
    drawBody(ctx, P, t) {
      const cr = this.crouch * 30, air = this.jumpY < -5, walk = Math.sin(t * 6) * 3;
      G.line(ctx, -150, -128 + cr, -166, -148 + cr, G.OUT, 10); G.line(ctx, -150, -128 + cr, -166, -148 + cr, P.trim, 5);
      G.circle(ctx, -170, -154 + cr + Math.sin(t * 5) * 5, 16, P.fur, 3.5);
      [-124, -88, -8, 28].forEach((lx, i) => {
        const k = i % 2 ? -1 : 1, ly = air ? 14 + k * 6 : Math.max(0, k * walk), top = -64 + cr * 0.5;
        G.rrect(ctx, lx - 11, top, 22, -8 - ly - top, 8, P.trim, 3.5);
        ctx.fillStyle = G.col(P.body); ctx.fillRect(lx - 9, -26 - ly, 18, 5);
        G.ellipse(ctx, lx + 4, -5 - ly, 15, 7, '#2a1711', 0);
      });
      ctx.beginPath(); ctx.moveTo(44, -150 + cr); ctx.quadraticCurveTo(-60, -204 + cr, -150, -140 + cr);
      ctx.quadraticCurveTo(-172, -100 + cr * 0.6, -152, -58); ctx.lineTo(50, -58); ctx.closePath(); G.done(ctx, P.body, 4);
      ctx.strokeStyle = G.col(P.trim); ctx.lineWidth = 3;
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
        ctx.beginPath(); ctx.arc(-128 + i * 30 + (r % 2) * 15, -146 + r * 26 + cr * 0.7, 13, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      }
      for (let i = 0; i < 8; i++) G.circle(ctx, -142 + i * 27, -58, 13, P.fur, 3);
      for (let i = 0; i < 6; i++) { const u = 0.08 + i * 0.17; G.circle(ctx, q(44, -60, -150, u), q(-150, -204, -140, u) + cr - 4, 11, P.fur, 3); }
    }
    drawHead(ctx, x, y, P, t) {
      const m = this.mouth, pl = (TH.world && TH.world.player) || { x: x - 300, y: y + 120 };
      let rot = this.mode === 'head' ? this.spin : 0;
      if (this.shakeHead > 0) rot += Math.sin(t * 45) * 0.1;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      for (const s of [-1, 1]) G.ellipse(ctx, s * 74, -34 + Math.sin(t * 7 + s) * 4, 20, 13, P.accent, 3.5, s * 0.5);
      for (let i = -3; i <= 3; i++) G.ellipse(ctx, i * 17, 68 + m * 34 - Math.abs(i) * 3, 10, 20, P.fur, 3);
      G.rrect(ctx, -52, 30 + m * 30, 104, 34, 16, P.head, 4);
      if (m > 0.05) { G.rrect(ctx, -46, 34, 92, 10 + m * 34, 8, '#5a0f1a', 3.5); G.ellipse(ctx, 0, 42 + m * 30, 22, 8 * m + 2, '#ff6b6b', 0); }
      G.circle(ctx, 0, -6, 76, P.head, 4);
      G.scallops(ctx, 0, -6, 76, 9, 15, P.fur, 3, Math.PI * 1.1, Math.PI * 1.9);
      G.circle(ctx, -62, 26, 17, P.fur, 3); G.circle(ctx, 62, 26, 17, P.fur, 3);
      G.poly(ctx, [-12, -80, 0, -110, 12, -80], P.trim, 3.5); G.circle(ctx, 0, -54, 12, '#dff3ff', 3.5);
      const ang = Math.atan2(pl.y - 40 - y, pl.x - x) - rot, ex = Math.cos(ang) * 8, ey = Math.sin(ang) * 7;
      const blink = (t % 3.7) < 0.12;
      for (const s of [-1, 1]) {
        G.circle(ctx, s * 32, -14, 23, '#fffdf5', 3.5);
        if (this.dead) G.text(ctx, '×', s * 32, -13, 34, G.OUT);
        else if (blink) G.line(ctx, s * 32 - 16, -14, s * 32 + 16, -14, G.OUT, 4);
        else { G.circle(ctx, s * 32 + ex, -14 + ey, 10, G.OUT, 0); G.circle(ctx, s * 32 + ex + 3, -17 + ey, 3, '#fff', 0); }
        G.ellipse(ctx, s * 34, -43, 24, 9, P.fur, 3, s * (this.pal ? 0.38 : -0.12));
      }
      G.circle(ctx, 0, 14, 15, P.accent, 3.5); G.circle(ctx, -5, 9, 4, 'rgba(255,255,255,.6)', 0);
      G.rrect(ctx, -50, 24, 100, 14, 7, P.fur, 3.5);
      ctx.restore();
    }
  }

  TH.HazDraw.ball = function (ctx, h) {   // 绣球
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
    G.circle(ctx, 0, 0, h.r, h.pink ? G.PINK : '#e8372c', 3.5);
    ctx.strokeStyle = h.pink ? '#ffd0e4' : '#ffd34d'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, 0, h.r * 0.45, h.r - 2, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, h.r - 2, h.r * 0.45, 0, 0, TAU); ctx.stroke();
    G.circle(ctx, 0, 0, 5, '#ffd34d', 2);
    ctx.restore();
  };
  TH.HazDraw.cracker = function (ctx, h) {   // 爆竹
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
    G.rrect(ctx, -9, -20, 18, 40, 4, '#e8372c', 3.5);
    ctx.fillStyle = '#ffd34d'; ctx.fillRect(-7.5, -13, 15, 4); ctx.fillRect(-7.5, 9, 15, 4);
    G.line(ctx, 0, -20, 4, -30, '#7a5a3a', 3);
    G.star(ctx, 5, -32, 7 + Math.sin(h.t * 40) * 2, 3, 4, h.t * 9, '#fff3a0', 2);
    ctx.restore();
  };
  TH.HazDraw.leaf = function (ctx, h) {   // 生菜叶
    const c = h.pink ? G.PINK : '#8fd05f', c2 = h.pink ? '#ffd0e4' : '#c9ef9a';
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
    G.circle(ctx, -9, -6, 12, c, 3); G.circle(ctx, 9, -6, 12, c, 3); G.circle(ctx, 0, 5, 14, c, 3);
    G.circle(ctx, 0, -2, 11, c, 0);
    G.line(ctx, 0, -12, 0, 14, c2, 3); G.line(ctx, 0, 0, -8, -7, c2, 2.5); G.line(ctx, 0, 4, 8, -3, c2, 2.5);
    ctx.restore();
  };

  let iconBoss = null;
  TH.BossList.push({
    id: 'lion', name: '金鬃醒狮', sub: '庙会街 · 黄昏', bg: 'fair', music: 'lion', par: 110,
    taunts: ['“采青还没采够，你就先趴下啦？”', '“锣鼓一响，小老虎变小花猫！”', '“回去再蹲十年马步吧！”'],
    make: () => new Lion(),
    icon(ctx, x, y, s) {
      if (!iconBoss) iconBoss = new Lion();
      iconBoss.t = TH.time;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s); iconBoss.drawHead(ctx, 0, 0, PAL[0], TH.time); ctx.restore();
    }
  });
})();
