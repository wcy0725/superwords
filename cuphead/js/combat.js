'use strict';
// 战斗：玩家子弹、敌方危险物（含可格挡的粉色物）、碰撞、Boss 基类（生成器脚本驱动）
(function () {
  const TH = window.TH, G = TH.Gfx, GY = TH.GROUND, TAU = TH.TAU, W = TH.W, H = TH.H;
  const PCOL = { straight: '#ffd34d', spread: '#ff7a4a', homing: '#7df0c1', exbolt: '#fff3a0', exstar: '#ffb02e', exhoming: '#7df0c1', rocket: '#ff6b6b' };

  TH.pb = [];   // 玩家子弹
  TH.haz = [];  // 危险物
  TH.shootP = function (o) { o.t = 0; o.hitCd = 0; TH.pb.push(o); return o; };
  // 危险物：圆形用 r；矩形用 w,h（中心基准）。pink=可格挡
  TH.spawnHaz = function (o) {
    const h = Object.assign({ vx: 0, vy: 0, ax: 0, ay: 0, g: 0, r: 14, life: 10, t: 0, pink: false, kind: 'orb', rot: 0, vr: 0,
      bounceV: 0, dieOnGround: false, dead: false, gone: false, harmless: false }, o);
    TH.haz.push(h); return h;
  };
  TH.clearHaz = function () { for (const h of TH.haz) if (!h.harmless) G.puff(h.x, h.y, 2, '#fff8ea', 12); TH.haz.length = 0; };
  TH.aimAt = function (x, y) { const p = TH.world.player; return Math.atan2(p.y - 30 - y, p.x - x); };
  TH.fireOrb = function (x, y, ang, spd, o) {
    return TH.spawnHaz(Object.assign({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 15, kind: 'orb', life: 6 }, o));
  };
  TH.shock = function (x, dir, spd) {   // 贴地冲击波
    return TH.spawnHaz({ x, y: GY - 26, vx: dir * spd, w: 40, h: 52, kind: 'wave', life: 5 });
  };

  TH.updateHaz = function (dt) {
    const a = TH.haz;
    for (let i = a.length - 1; i >= 0; i--) {
      const h = a[i];
      h.t += dt;
      if (h.update) h.update(h, dt);
      h.vx += h.ax * dt; h.vy += (h.ay + h.g) * dt;
      h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt;
      const rad = h.w === undefined ? h.r : h.h / 2;
      if (h.vy > 0 && h.y + rad >= GY && (h.bounceV || h.dieOnGround)) {
        h.y = GY - rad;
        if (h.bounceV) { h.vy = -h.bounceV; if (h.onBounce) h.onBounce(h); } else h.dead = true;
      }
      if (h.t >= h.life || h.x < -180 || h.x > W + 180 || h.y < -500 || h.y > H + 160) h.gone = true;
      if (h.dead || h.gone) {
        if (h.dead && h.onDie) h.onDie(h);
        a.splice(i, 1);
      }
    }
  };

  TH.updatePB = function (dt) {
    const a = TH.pb, w = TH.world, boss = w.boss;
    const shapes = boss && !boss.dead ? boss.hurtShapes() : [];
    for (let i = a.length - 1; i >= 0; i--) {
      const b = a[i];
      b.t += dt; b.hitCd -= dt;
      if (b.homing && b.t > (b.delay || 0) && shapes.length) {
        let best = shapes[0], bd = 1e12;
        for (const s of shapes) { const d = (s.x - b.x) * (s.x - b.x) + (s.y - b.y) * (s.y - b.y); if (d < bd) { bd = d; best = s; } }
        const sp = Math.hypot(b.vx, b.vy), cur = Math.atan2(b.vy, b.vx);
        let d = Math.atan2(best.y - b.y, best.x - b.x) - cur;
        while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const na = cur + TH.clamp(d, -b.homing * dt, b.homing * dt);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'rocket' && Math.random() < 0.5) G.spark(b.x, b.y, '#ffd34d', 1, 80);
      let dead = b.t >= b.life || b.x < -60 || b.x > W + 60 || b.y < -80 || b.y > GY + 6;
      if (!dead && b.hitCd <= 0) {
        let hs = null;
        for (const s of shapes) if (TH.hit(b, s)) { hs = s; break; }
        if (hs) {
          const did = boss.damage(b.dmg);
          G.spark(b.x, b.y, did ? PCOL[b.kind] : '#cfd6e6', b.ex ? 6 : 2, 220);
          TH.Audio.sfx('hit');
          if (did && !b.ex) w.player.addMeter(b.dmg * 0.45);
          if (b.pierce) { b.pierce--; b.hitCd = 0.09; if (b.pierce <= 0) dead = true; } else dead = true;
        } else {
          for (const h of TH.haz) {
            if (h.hp === undefined || h.dead || !TH.hit(b, h)) continue;
            h.hp -= b.dmg; h.flashT = 0.06; G.spark(b.x, b.y, PCOL[b.kind], 2, 200);
            if (h.hp <= 0) h.dead = true;
            if (!b.pierce) dead = true;
            break;
          }
        }
      }
      if (dead) {
        if (b.ex && b.t < b.life) { G.boom(b.x, b.y, b.kind === 'rocket' ? 0.8 : 0.5); if (b.kind === 'rocket') TH.Audio.sfx('pop'); }
        a.splice(i, 1);
      }
    }
  };

  TH.collidePlayer = function () {
    const w = TH.world, p = w.player;
    if (p.dead) return;
    const box = p.box();
    if (p.parryT > 0) {
      const pbx = p.parryBox();
      for (const h of TH.haz) {
        if (h.pink && !h.dead && !h.harmless && TH.hit(h, pbx)) { h.dead = true; h.parried = true; p.onParry(h); break; }
      }
    }
    if (p.inv > 0 || p.superT > 0 || p.safe) return;
    for (const h of TH.haz) {
      if (h.dead || h.harmless || !TH.hit(h, box)) continue;
      if (p.hurt() && h.w === undefined && !h.solid) h.gone = true;
      return;
    }
    const boss = w.boss;
    if (boss && !boss.dead && !boss.noContact) {
      for (const s of boss.contactShapes()) if (TH.hit(s, box)) { p.hurt(); return; }
    }
  };

  // ---- 通用危险物外观；各 Boss 文件会继续往里注册 ----
  TH.HazDraw = {
    orb(ctx, h) {
      const c = h.pink ? G.PINK : (h.color || '#ff8a2a');
      ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(Math.atan2(h.vy, h.vx));
      G.poly(ctx, [-h.r * 0.5, -h.r * 0.8, -h.r * 2.1, 0, -h.r * 0.5, h.r * 0.8], c, 3);
      G.circle(ctx, 0, 0, h.r, c, 3.5); G.circle(ctx, h.r * 0.2, -h.r * 0.15, h.r * 0.45, h.pink ? '#ffd0e4' : '#ffe08a', 0);
      ctx.restore();
    },
    wave(ctx, h) {
      const d = Math.sign(h.vx) || 1, x = h.x, s = 1 + Math.sin(h.t * 30) * 0.06;
      ctx.beginPath(); ctx.moveTo(x - d * 30, GY);
      ctx.quadraticCurveTo(x - d * 16, GY - 30 * s, x + d * 20, GY - 62 * s);
      ctx.quadraticCurveTo(x + d * 14, GY - 26 * s, x + d * 26, GY); ctx.closePath();
      G.done(ctx, h.color || '#fff0c9', 3.5);
      G.circle(ctx, x - d * 24, GY - 8, 9, '#fff8ea', 3); G.circle(ctx, x - d * 40, GY - 5, 6, '#fff8ea', 3);
    },
    blast(ctx, h) {
      const u = h.t / h.life;
      ctx.globalAlpha = 1 - u * u;
      G.star(ctx, h.x, h.y, h.r * 1.2, h.r * 0.65, 9, h.t * 6, '#ff8a2a', 4);
      G.circle(ctx, h.x, h.y, h.r * 0.55, '#fff3a0', 0);
      ctx.globalAlpha = 1;
    }
  };
  TH.drawHaz = function (ctx) {
    for (const h of TH.haz) {
      if (h.pink) {
        const rr = (h.w === undefined ? h.r : Math.max(h.w, h.h) / 2) + 7 + Math.sin(TH.time * 12) * 3;
        ctx.globalAlpha = 0.35; G.circle(ctx, h.x, h.y, rr, G.PINK, 0); ctx.globalAlpha = 1;
      }
      (h.draw || TH.HazDraw[h.kind] || TH.HazDraw.orb)(ctx, h);
    }
  };
  TH.drawPB = function (ctx) {
    for (const b of TH.pb) {
      ctx.save(); ctx.translate(b.x, b.y);
      const a = Math.atan2(b.vy, b.vx);
      if (b.kind === 'straight') {
        ctx.rotate(a); G.poly(ctx, [15, 0, 0, 6, -18, 0, 0, -6], '#ffd34d', 2.5); G.poly(ctx, [8, 0, 0, 2.5, -8, 0, 0, -2.5], '#fff8d0', 0);
      } else if (b.kind === 'spread') {
        ctx.rotate(a); ctx.globalAlpha = Math.min(1, (b.life - b.t) * 9); G.poly(ctx, [13, 0, -9, 8, -4, 0, -9, -8], '#ff7a4a', 2.5);
      } else if (b.kind === 'homing') {
        G.star(ctx, 0, 0, 11, 5, 5, b.t * 10, '#7df0c1', 2.5);
      } else if (b.kind === 'exbolt') {
        ctx.rotate(a); G.poly(ctx, [-10, -20, -64, 0, -10, 20], '#ffb02e', 3.5);
        G.star(ctx, 0, 0, 30, 18, 8, b.t * 12, '#ffd34d', 3.5); G.circle(ctx, 0, 0, 13, '#fffbe0', 0);
      } else if (b.kind === 'exstar') {
        G.star(ctx, 0, 0, 18, 8, 6, b.t * 14, '#ffb02e', 3);
      } else if (b.kind === 'exhoming') {
        G.star(ctx, 0, 0, 17, 8, 5, b.t * 10, '#7df0c1', 3); G.circle(ctx, 0, 0, 5, '#eafff6', 0);
      } else {  // rocket
        ctx.rotate(a); G.poly(ctx, [-16, -5, -28, 0, -16, 5], '#ffd34d', 2);
        G.rrect(ctx, -16, -6, 24, 12, 3, '#e8372c', 3); G.poly(ctx, [8, -8, 22, 0, 8, 8], '#ffd34d', 3);
      }
      ctx.restore();
    }
  };

  // ---- Boss 基类：脚本是生成器，yield 秒数 = 等待；yield 0 = 等一帧 ----
  class Boss {
    constructor(cfg) {
      this.name = cfg.name;
      this.maxHp = cfg.hp * [0.75, 1, 1.25][TH.diff]; this.hp = this.maxHp;
      this.cuts = cfg.phases;                    // 进入第 2、3 阶段时的剩余血量比例
      this.rate = [0.85, 1, 1.18][TH.diff];      // 节奏倍率
      this.phase = 1; this.t = 0; this.flashT = 0; this.dead = false; this.deadT = 0;
      this.invuln = true; this.noContact = false; this.script = null; this.wait = 0;
    }
    w(sec) { return sec / this.rate; }
    start() { this.script = this.main(); this.wait = 0; }
    *main() { yield* this.intro(); this.invuln = false; while (true) yield* this['phase' + this.phase](); }
    *intro() { yield 1.6; }
    *transition() { yield 1.2; }
    damage(d) {
      if (this.invuln || this.dead) return false;
      this.hp -= d; this.flashT = 0.07;
      if (this.hp <= 0) {
        this.hp = 0; this.dead = true; this.invuln = true; this.script = null;
        TH.clearHaz(); TH.world.wind = 0; this.onDeath();
      } else if (this.phase <= this.cuts.length && this.hp / this.maxHp <= this.cuts[this.phase - 1]) this.nextPhase();
      return true;
    }
    nextPhase() {
      const self = this, n = ++this.phase;
      this.invuln = true; TH.clearHaz(); TH.world.wind = 0;
      TH.Audio.sfx('boom'); G.shake(12, 0.4);
      this.script = (function* () { yield* self.transition(n); self.invuln = false; while (true) yield* self['phase' + n](); })();
      this.wait = 0;
    }
    onDeath() {}
    progress() { return 1 - this.hp / this.maxHp; }
    step(dt) {
      this.t += dt; this.flashT = Math.max(0, this.flashT - dt);
      if (this.dead) { this.deadT += dt; return; }
      if (!this.script) return;
      this.wait -= dt;
      let guard = 0;
      while (this.wait <= 0 && this.script && guard++ < 20) {
        const r = this.script.next();
        if (r.done) { this.script = null; break; }
        this.wait += Math.max(r.value || 0, TH.STEP * 0.999);
      }
    }
    update(dt) { this.step(dt); }
    hurtShapes() { return []; }
    contactShapes() { return this.hurtShapes(); }
    center() { const s = this.hurtShapes()[0]; return s ? { x: s.x, y: s.y } : { x: W / 2, y: H / 2 }; }
    draw() {}
  }
  TH.Boss = Boss;
  TH.BossList = [];   // 各 Boss 文件注册：{id,name,sub,bg,music,par,taunts,make()}
})();
