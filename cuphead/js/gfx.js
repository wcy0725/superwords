'use strict';
// 绘图：剪纸风格的描边图形助手、粒子特效、震屏、纸纹覆盖层
(function () {
  const TH = window.TH, TAU = TH.TAU;
  const G = TH.Gfx = {};
  G.OUT = '#2a1711';
  G.PINK = '#ff5c9d';
  G.FONT = '"KaiTi","STKaiti","Kaiti SC","Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Yu Gothic",sans-serif';
  G.flash = false;                        // 为 true 时所有填充变白（Boss 受击闪白）
  G.col = c => G.flash ? '#fff6e0' : c;

  // 路径建好后调用：填充 + 描边
  G.done = function (ctx, fill, lw) {
    if (fill) { ctx.fillStyle = G.col(fill); ctx.fill(); }
    if (lw !== 0) {
      ctx.lineWidth = lw || 4; ctx.strokeStyle = G.OUT;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    }
  };
  G.circle = function (ctx, x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); G.done(ctx, fill, lw); };
  G.ellipse = function (ctx, x, y, rx, ry, fill, lw, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, TAU); G.done(ctx, fill, lw);
  };
  G.rrectPath = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  };
  G.rrect = function (ctx, x, y, w, h, r, fill, lw) { G.rrectPath(ctx, x, y, w, h, r); G.done(ctx, fill, lw); };
  G.poly = function (ctx, pts, fill, lw, open) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    if (!open) ctx.closePath();
    G.done(ctx, fill, lw);
  };
  G.line = function (ctx, x1, y1, x2, y2, color, lw) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = G.col(color || G.OUT); ctx.lineWidth = lw || 4; ctx.lineCap = 'round'; ctx.stroke();
  };
  G.starPath = function (ctx, x, y, r1, r2, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (rot || 0) + i * Math.PI / n, r = i % 2 ? r2 : r1;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  };
  G.star = function (ctx, x, y, r1, r2, n, rot, fill, lw) { G.starPath(ctx, x, y, r1, r2, n, rot); G.done(ctx, fill, lw); };
  // 一圈扇贝形花边（狮子毛边、祥云等）
  G.scallops = function (ctx, x, y, r, n, br, fill, lw, a0, a1) {
    a0 = a0 === undefined ? 0 : a0; a1 = a1 === undefined ? TAU : a1;
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (n === 1 ? 0 : i / (a1 - a0 >= TAU - 0.01 ? n : n - 1));
      G.circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, br, fill, lw);
    }
  };
  // o: {align, stroke, sw, bold, rot}
  G.text = function (ctx, str, x, y, size, color, o) {
    o = o || {};
    ctx.save();
    ctx.font = (o.bold === false ? '' : 'bold ') + size + 'px ' + G.FONT;
    ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
    if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
    if (o.stroke) { ctx.lineWidth = o.sw || 6; ctx.strokeStyle = o.stroke; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
    ctx.fillStyle = color; ctx.fillText(str, x, y);
    ctx.restore();
  };
  // 剪纸标题字：投影 + 粗描边 + 填充
  G.title = function (ctx, str, x, y, size, fill, o) {
    o = o || {};
    G.text(ctx, str, x + size * 0.06, y + size * 0.08, size, 'rgba(20,8,10,.45)', { align: o.align, stroke: 'rgba(20,8,10,.45)', sw: size * 0.16, rot: o.rot });
    G.text(ctx, str, x, y, size, fill, { align: o.align, stroke: o.stroke || G.OUT, sw: size * 0.16, rot: o.rot });
  };

  // ---------------- 粒子 ----------------
  TH.fx = [];
  function add(p) { p.t = 0; if (TH.fx.length < 700) TH.fx.push(p); return p; }
  G.spark = function (x, y, color, n, spd) {
    n = n || 6; spd = spd || 260;
    for (let i = 0; i < n; i++) {
      const a = TH.rand(0, TAU), s = TH.rand(0.3, 1) * spd;
      add({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 400, life: TH.rand(.15, .42), size: TH.rand(3, 6), color, rot: a });
    }
  };
  G.puff = function (x, y, n, color, size) {
    n = n || 5; size = size || 14;
    for (let i = 0; i < n; i++) {
      add({ k: 'puff', x: x + TH.rand(-size, size), y: y + TH.rand(-size, size) * 0.6, vx: TH.rand(-70, 70), vy: TH.rand(-90, -10), g: 0,
        life: TH.rand(.3, .6), size: TH.rand(.6, 1.2) * size, color: color || '#fff8ea' });
    }
  };
  G.ring = function (x, y, color, r1, life, lw) { add({ k: 'ring', x, y, vx: 0, vy: 0, g: 0, r1: r1 || 60, life: life || .3, color, lw: lw || 6 }); };
  G.shards = function (x, y, colors, n, spd) {
    n = n || 10; spd = spd || 420;
    for (let i = 0; i < n; i++) {
      const a = TH.rand(0, TAU), s = TH.rand(0.3, 1) * spd;
      add({ k: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 180, g: 900, life: TH.rand(.6, 1.2), size: TH.rand(7, 15),
        color: TH.pick(colors), rot: a, vr: TH.rand(-9, 9) });
    }
  };
  G.flashStar = function (x, y, size, color) { add({ k: 'star', x, y, vx: 0, vy: 0, g: 0, life: .16, size: size || 40, color: color || '#fff', rot: TH.rand(0, TAU) }); };
  G.float = function (x, y, str, color, size) { add({ k: 'text', x, y, vx: 0, vy: -70, g: 0, life: .9, str, color: color || '#fff', size: size || 26 }); };
  // 地面预警标记；col=true 时附带整列光柱
  G.warn = function (x, life, w, col) { add({ k: 'warn', x, y: TH.GROUND, vx: 0, vy: 0, g: 0, life, w: w || 60, col: !!col }); };
  G.boom = function (x, y, s) {
    s = s || 1;
    G.flashStar(x, y, 70 * s, '#fff3c4'); G.ring(x, y, '#ffd34d', 90 * s, .35, 8);
    G.spark(x, y, '#ffb02e', 10, 420 * s); G.puff(x, y, 6, '#fff8ea', 22 * s);
  };
  G.updateFx = function (dt) {
    const a = TH.fx;
    for (let i = a.length - 1; i >= 0; i--) {
      const p = a[i];
      p.t += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
      if (p.t >= p.life) { a[i] = a[a.length - 1]; a.pop(); }
    }
  };
  G.drawFx = function (ctx) {
    for (const p of TH.fx) {
      const u = p.t / p.life;
      ctx.save();
      if (p.k === 'spark') {
        ctx.globalAlpha = 1 - u * u; ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = p.color; ctx.fillRect(-p.size * 1.6, -p.size / 2, p.size * 3.2, p.size);
      } else if (p.k === 'puff') {
        G.circle(ctx, p.x, p.y, p.size * (1 - u * u), p.color, 3);
      } else if (p.k === 'ring') {
        ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(p.x, p.y, TH.lerp(8, p.r1, TH.easeOut(u)), 0, TAU);
        ctx.strokeStyle = p.color; ctx.lineWidth = p.lw * (1 - u) + 1; ctx.stroke();
      } else if (p.k === 'shard') {
        ctx.globalAlpha = Math.min(1, (1 - u) * 3); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.strokeStyle = G.OUT; ctx.lineWidth = 2;
        ctx.fillRect(-p.size / 2, -p.size * .3, p.size, p.size * .6); ctx.strokeRect(-p.size / 2, -p.size * .3, p.size, p.size * .6);
      } else if (p.k === 'star') {
        ctx.globalAlpha = 1 - u; G.starPath(ctx, p.x, p.y, p.size * (0.5 + u), p.size * 0.18, 4, p.rot);
        ctx.fillStyle = p.color; ctx.fill();
      } else if (p.k === 'text') {
        ctx.globalAlpha = Math.min(1, (1 - u) * 2.5);
        G.text(ctx, p.str, p.x, p.y, p.size, p.color, { stroke: G.OUT, sw: 5 });
      } else if (p.k === 'warn') {
        const blink = (Math.floor(p.t * 12) % 2) ? 0.55 : 1;
        if (p.col) {
          const gr = ctx.createLinearGradient(0, 0, 0, TH.GROUND);
          gr.addColorStop(0, 'rgba(255,90,60,0)'); gr.addColorStop(1, 'rgba(255,90,60,' + (0.28 * blink) + ')');
          ctx.fillStyle = gr; ctx.fillRect(p.x - p.w / 2, 0, p.w, TH.GROUND);
        }
        ctx.globalAlpha = blink;
        G.ellipse(ctx, p.x, p.y + 4, p.w / 2 * (0.6 + 0.4 * u), 9, 'rgba(255,70,50,.55)', 0);
        G.poly(ctx, [p.x, p.y - 44, p.x + 19, p.y - 12, p.x - 19, p.y - 12], '#ffd84a', 3);
        G.text(ctx, '!', p.x, p.y - 23, 22, G.OUT);
      }
      ctx.restore();
    }
  };

  // ---------------- 震屏 ----------------
  let shMag = 0, shT = 0, shDur = 1;
  G.shake = function (mag, time) { if (mag >= shMag * (shT / shDur || 0)) { shMag = mag; shT = time; shDur = time; } };
  G.shakeStep = function (dt) { if (shT > 0) shT = Math.max(0, shT - dt); };
  G.shakeOff = function () {
    if (shT <= 0) return { x: 0, y: 0 };
    const m = shMag * (shT / shDur), k = TH.viewK || 1;   // 取整到设备像素，保证图层 1:1 贴图
    return { x: Math.round(TH.rand(-m, m) * k) / k, y: Math.round(TH.rand(-m, m) * k) / k };
  };

  // ---------------- 与输出分辨率 1:1 的离屏图层缓存 ----------------
  // 整屏位图若每帧缩放/渐变填充，在无 GPU 加速时非常慢；这里按当前画布像素尺寸预渲染一次
  let layers = {}, layerGen = -1;
  G.layer = function (key, paint) {
    if (layerGen !== TH.viewGen) { layers = {}; layerGen = TH.viewGen; }
    let cv = layers[key];
    if (!cv) {
      cv = layers[key] = document.createElement('canvas');
      cv.width = TH.pxW || TH.W; cv.height = TH.pxH || TH.H;
      const c = cv.getContext('2d'), k = cv.width / TH.W;
      c.scale(k, k); paint(c, k);
    }
    return cv;
  };
  G.blit = function (ctx, cv) {
    const s = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, 0, 0, TH.W, TH.H); ctx.imageSmoothingEnabled = s;
  };

  // ---------------- 纸纹 + 暗角 ----------------
  G.paper = function (ctx) {
    G.blit(ctx, G.layer('paper', function (c) {
      const tile = document.createElement('canvas'); tile.width = tile.height = 256;
      const x = tile.getContext('2d');
      for (let i = 0; i < 2600; i++) {
        x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.08)' : 'rgba(60,30,10,.07)';
        const px = Math.random() * 256, py = Math.random() * 256;
        if (Math.random() < .15) x.fillRect(px, py, TH.rand(4, 14), 1); else x.fillRect(px, py, 1.5, 1.5);
      }
      c.fillStyle = c.createPattern(tile, 'repeat'); c.fillRect(0, 0, TH.W, TH.H);
      const vig = c.createRadialGradient(TH.W / 2, TH.H / 2, TH.H * 0.45, TH.W / 2, TH.H / 2, TH.H * 0.95);
      vig.addColorStop(0, 'rgba(30,10,20,0)'); vig.addColorStop(1, 'rgba(30,10,20,.42)');
      c.fillStyle = vig; c.fillRect(0, 0, TH.W, TH.H);
    }));
  };
})();
