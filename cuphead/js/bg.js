'use strict';
// 背景：三个舞台。静态层按输出分辨率预渲染一次，动态元素（灯笼、云、烟花、雪）每帧绘制
(function () {
  const TH = window.TH, G = TH.Gfx, W = TH.W, H = TH.H, GY = TH.GROUND, TAU = TH.TAU;
  let K = 1;   // 当前图层的像素倍率（阴影偏移以设备像素计）
  const frac = v => v - Math.floor(v);

  function shadow(c, on) {
    c.shadowColor = on ? 'rgba(20,8,30,.38)' : 'transparent';
    c.shadowBlur = on ? 10 * K : 0; c.shadowOffsetY = on ? 6 * K : 0;
  }
  function sky(c, stops) {
    const g = c.createLinearGradient(0, 0, 0, GY);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function roofPath(c, x, y, w, h) {
    c.beginPath();
    c.moveTo(x - w / 2 - 18, y - 12);
    c.quadraticCurveTo(x - w / 2 + 12, y - 4, x - w * 0.26, y - h);
    c.lineTo(x + w * 0.26, y - h);
    c.quadraticCurveTo(x + w / 2 - 12, y - 4, x + w / 2 + 18, y - 12);
    c.lineTo(x + w / 2, y + 7); c.lineTo(x - w / 2, y + 7); c.closePath();
  }
  function house(c, x, base, w, wallH, roofH, wall, roof, win, snow) {
    c.fillStyle = wall; c.fillRect(x - w * 0.38, base - wallH, w * 0.76, wallH + 2);
    if (snow) { roofPath(c, x, base - wallH - 7, w + 8, roofH); c.fillStyle = '#eef4ff'; c.fill(); }
    roofPath(c, x, base - wallH, w, roofH - (snow ? 4 : 0));
    c.fillStyle = roof; c.fill(); c.lineWidth = 3; c.strokeStyle = G.OUT; c.stroke();
    if (win) {
      c.save(); shadow(c, false); c.fillStyle = win;
      c.fillRect(x - w * 0.2 - 9, base - wallH * 0.62, 18, 22); c.fillRect(x + w * 0.2 - 9, base - wallH * 0.62, 18, 22);
      c.restore();
    }
  }
  function pagoda(c, x, base, tiers, w0, wall, roof, win) {
    let y = base;
    for (let i = 0; i < tiers; i++) {
      const w = w0 * (1 - i * 0.15);
      house(c, x, y, w, 46, 28, wall, roof, i % 2 ? null : win);
      y -= 62;
    }
    c.fillStyle = roof; c.fillRect(x - 3, y - 30, 6, 44);
    G.circle(c, x, y - 34, 7, '#f0b93a', 3);
  }
  function hill(c, baseY, amp, freq, phase, color) {
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) c.lineTo(x, baseY - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.3 + phase * 2) * amp * 0.3);
    c.lineTo(W, H); c.closePath();
    c.fillStyle = color; c.fill(); c.lineWidth = 3; c.strokeStyle = G.OUT; c.stroke();
  }
  function tree(c, x, y, s, leaf) {
    c.fillStyle = '#6b4a2e'; c.fillRect(x - 5 * s, y - 40 * s, 10 * s, 44 * s);
    G.circle(c, x, y - 62 * s, 34 * s, leaf, 3); G.circle(c, x - 22 * s, y - 44 * s, 20 * s, leaf, 3); G.circle(c, x + 22 * s, y - 44 * s, 20 * s, leaf, 3);
    c.fillStyle = leaf; c.beginPath(); c.arc(x, y - 52 * s, 26 * s, 0, TAU); c.fill();
  }
  function pine(c, x, y, s) {
    for (let i = 0; i < 3; i++) {
      const yy = y - i * 34 * s, ww = (52 - i * 12) * s;
      G.poly(c, [x, yy - 66 * s, x + ww, yy - 12 * s, x - ww, yy - 12 * s], '#17403a', 3);
      c.fillStyle = '#eef4ff'; c.beginPath(); c.moveTo(x, yy - 66 * s); c.lineTo(x + ww * 0.4, yy - 42 * s); c.lineTo(x - ww * 0.4, yy - 42 * s); c.closePath(); c.fill();
    }
    c.fillStyle = '#3a2a22'; c.fillRect(x - 5 * s, y - 14 * s, 10 * s, 16 * s);
  }
  // 祥云：先描边后填充，得到并集轮廓
  function cloud(c, x, y, s, col) {
    const parts = [[-34, 4, 20], [-10, -10, 26], [22, -4, 22], [46, 8, 15], [6, 10, 24]];
    c.lineWidth = 6; c.strokeStyle = G.OUT;
    for (const p of parts) { c.beginPath(); c.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, TAU); c.stroke(); }
    c.fillStyle = col || '#fffaf0';
    for (const p of parts) { c.beginPath(); c.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, TAU); c.fill(); }
  }
  function lanterns(ctx, t, y0, sag, n) {
    ctx.strokeStyle = G.OUT; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(-10, y0); ctx.quadraticCurveTo(W / 2, y0 + sag * 2, W + 10, y0); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = u * W, y = y0 + 4 * sag * u * (1 - u);
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 1.6 + i * 0.9) * 0.12);
      ctx.fillStyle = 'rgba(255,180,80,.16)'; ctx.beginPath(); ctx.arc(0, 32, 38, 0, TAU); ctx.fill();
      G.line(ctx, 0, 0, 0, 12, G.OUT, 3);
      G.ellipse(ctx, 0, 32, 19, 22, '#e8372c', 3);
      ctx.beginPath(); ctx.ellipse(0, 32, 9, 22, 0, 0, TAU); ctx.strokeStyle = 'rgba(42,23,17,.45)'; ctx.lineWidth = 2; ctx.stroke();
      G.rrect(ctx, -9, 7, 18, 6, 2, '#f0b93a', 2.5); G.rrect(ctx, -9, 52, 18, 6, 2, '#f0b93a', 2.5);
      G.line(ctx, 0, 58, 0, 74, '#f0b93a', 3);
      ctx.restore();
    }
  }

  const STATIC = {
    fair(c) {   // 庙会街 · 黄昏
      sky(c, ['#3a1d5c', '#8e3a6e', '#e2694a', '#ffb25a']);
      c.fillStyle = 'rgba(255,224,138,.22)'; c.beginPath(); c.arc(330, 400, 175, 0, TAU); c.fill();
      c.fillStyle = '#ffe08a'; c.beginPath(); c.arc(330, 400, 118, 0, TAU); c.fill();
      shadow(c, true);
      [[90, 150, 70], [300, 190, 96], [520, 160, 60], [760, 210, 84], [1180, 180, 74]].forEach(h => house(c, h[0], GY, h[1], h[2], 34, '#6b2c62', '#532050', null));
      pagoda(c, 990, GY, 5, 190, '#5b2456', '#3f163f', '#ffc45e');
      [[190, 220, 96], [620, 250, 110], [1120, 230, 100], [-10, 170, 120], [1290, 170, 130]].forEach(h => house(c, h[0], GY, h[1], h[2], 40, '#42173d', '#2c0f2c', '#ffc45e'));
      shadow(c, false);
      for (let i = 0; i < 26; i++) {   // 彩旗
        const x = 25 + i * 50, y = 16 + Math.sin(i * 0.9) * 4;
        G.poly(c, [x - 16, y, x + 16, y, x, y + 26], ['#f0b93a', '#e8372c', '#3f8f7a'][i % 3], 2.5);
      }
      c.fillStyle = '#7d3327'; c.fillRect(0, GY, W, H - GY);
      c.fillStyle = '#a34a33'; c.fillRect(0, GY, W, 16);
      G.line(c, 0, GY, W, GY, G.OUT, 4); G.line(c, 0, GY + 16, W, GY + 16, G.OUT, 3);
      for (let x = 40; x < W; x += 110) G.line(c, x, GY + 18, x - 14, H, 'rgba(42,23,17,.5)', 3);
      for (let x = 30; x < W; x += 62) { G.circle(c, x, H - 24, 13, '#f0b93a', 3); c.fillStyle = '#7d3327'; c.fillRect(x - 4, H - 28, 8, 8); }
    },
    hill(c) {   // 风筝坡 · 晴日
      sky(c, ['#69c3d4', '#b5e3d8', '#fdf1c9']);
      c.fillStyle = 'rgba(255,243,176,.35)'; c.beginPath(); c.arc(170, 120, 96, 0, TAU); c.fill();
      c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(170, 120, 62, 0, TAU); c.fill();
      shadow(c, true);
      hill(c, 470, 50, 0.0042, 0.5, '#b6d99a'); hill(c, 535, 38, 0.0061, 2.1, '#86c274');
      shadow(c, false);
      [[240, 230, '#e8372c'], [585, 150, '#f0b93a']].forEach(k => {
        G.line(c, k[0], k[1] + 14, k[0] - 60, 470, 'rgba(42,23,17,.5)', 1.5);
        G.poly(c, [k[0], k[1] - 16, k[0] + 12, k[1], k[0], k[1] + 16, k[0] - 12, k[1]], k[2], 2.5);
      });
      shadow(c, true); hill(c, 592, 22, 0.008, 4.0, '#5fae5d'); shadow(c, false);
      tree(c, 110, GY - 6, 1.1, '#3f8f4a'); tree(c, 1195, GY - 4, 1.3, '#3f8f4a'); tree(c, 430, GY - 14, 0.7, '#4c9c50');
      c.fillStyle = '#4c9a48'; c.fillRect(0, GY, W, H - GY);
      c.fillStyle = '#6cc05c'; c.fillRect(0, GY, W, 14);
      G.line(c, 0, GY, W, GY, G.OUT, 4);
      for (let x = 10; x < W; x += 34) G.poly(c, [x, GY + 14, x + 7, GY + 30, x + 14, GY + 14], '#6cc05c', 0);
      for (let i = 0; i < 40; i++) {
        const x = frac(Math.sin(i * 12.99) * 43758.5) * W, y = GY + 40 + frac(Math.sin(i * 78.2) * 24634.6) * 56;
        G.circle(c, x, y, 5, ['#fff8ea', '#ffd34d', '#ff8fb6'][i % 3], 2);
      }
    },
    snow(c) {   // 雪夜村口
      sky(c, ['#0b1030', '#1b2452', '#39427a']);
      for (let i = 0; i < 90; i++) {
        c.fillStyle = 'rgba(255,255,255,' + (0.3 + frac(Math.sin(i * 3.3) * 999) * 0.6) + ')';
        c.fillRect(frac(Math.sin(i * 12.99) * 43758.5) * W, frac(Math.sin(i * 78.2) * 24634.6) * 430, 2.5, 2.5);
      }
      c.fillStyle = 'rgba(253,246,216,.14)'; c.beginPath(); c.arc(1060, 130, 110, 0, TAU); c.fill();
      c.fillStyle = '#fdf6d8'; c.beginPath(); c.arc(1060, 130, 58, 0, TAU); c.fill();
      shadow(c, true);
      hill(c, 500, 64, 0.005, 1, '#27306a');
      [[120, 200, 84], [380, 170, 70], [640, 230, 96], [900, 180, 74], [1170, 210, 90]].forEach(h => house(c, h[0], GY, h[1], h[2], 36, '#1c2350', '#11163a', '#ffc45e', true));
      pine(c, 260, GY, 1.2); pine(c, 770, GY, 1.0); pine(c, 1040, GY, 1.35); pine(c, 30, GY, 1.5);
      shadow(c, false);
      c.fillStyle = '#c9d6f0'; c.fillRect(0, GY, W, H - GY);
      c.fillStyle = '#f2f7ff'; c.fillRect(0, GY, W, 20);
      for (let x = 0; x < W; x += 90) { c.beginPath(); c.ellipse(x + 45, GY + 20, 52, 9, 0, 0, TAU); c.fill(); }
      G.line(c, 0, GY, W, GY, G.OUT, 4);
      for (let i = 0; i < 18; i++) G.ellipse(c, 40 + i * 72, GY + 60 + (i % 3) * 14, 12, 4, 'rgba(120,140,190,.5)', 0);
    }
  };

  const DYN = {
    fair(ctx, t) { lanterns(ctx, t, 44, 34, 9); },
    hill(ctx, t) {
      for (let i = 0; i < 5; i++) {
        const x = ((i * 310 + t * (8 + i * 3)) % (W + 320)) - 160, y = 80 + (i * 67 % 190);
        ctx.globalAlpha = 0.92; cloud(ctx, x, y, 0.9 + (i % 3) * 0.25); ctx.globalAlpha = 1;
      }
    },
    snow(ctx, t) {
      const hues = ['#ff6b6b', '#ffd34d', '#7df0c1', '#9db7ff', '#ff8be0'];
      for (let k = 0; k < 3; k++) {   // 烟花
        const tt = t / 2.6 + k * 0.37, n = Math.floor(tt), u = tt - n, seed = n * 7.13 + k * 3.7;
        if (u > 0.75) continue;
        const fx = 150 + frac(Math.sin(seed) * 43758.5) * 980, fy = 80 + frac(Math.sin(seed * 1.7) * 24634.6) * 180;
        const v = u / 0.75, r = TH.easeOut(v) * 92;
        ctx.globalAlpha = (1 - v) * 0.9; ctx.fillStyle = hues[(n + k) % 5];
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * TAU, dy = v * v * 26;
          ctx.fillRect(fx + Math.cos(a) * r - 3, fy + Math.sin(a) * r + dy - 3, 6, 6);
          ctx.fillRect(fx + Math.cos(a + 0.22) * r * 0.55 - 2, fy + Math.sin(a + 0.22) * r * 0.55 + dy - 2, 4, 4);
        }
        ctx.globalAlpha = 1;
      }
      lanterns(ctx, t, 40, 30, 7);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 70; i++) {  // 雪
        const sp = 40 + (i * 37 % 60);
        const x = ((i * 97.3 + Math.sin(t * 0.7 + i) * 24 + t * 12) % W + W) % W, y = (i * 53.7 + t * sp) % (GY + 20);
        ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, TAU); ctx.fill();
      }
    }
  };

  TH.Bg = {
    draw(ctx, id) {
      G.blit(ctx, G.layer('bg_' + id, (c, k) => { K = k; STATIC[id](c); }));
      DYN[id](ctx, TH.time);
    }
  };
})();
