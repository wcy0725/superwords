'use strict';
// HUD 与通用界面部件：生命灯笼、能量符、武器、纸板面板、菜单、横幅
(function () {
  const TH = window.TH, G = TH.Gfx, W = TH.W, H = TH.H, TAU = TH.TAU;
  const INK = '#4a3328', RED = '#c9302a';

  TH.Hud = {
    draw(ctx, p) {
      const x0 = 30, y0 = H - 40, t = TH.time;
      ctx.fillStyle = 'rgba(20,8,14,.5)'; G.rrectPath(ctx, 12, H - 74, 424, 66, 16); ctx.fill();
      // 生命：三盏小灯笼
      for (let i = 0; i < 3; i++) {
        const on = i < p.hp, x = x0 + 14 + i * 38, danger = p.hp === 1 && Math.floor(t * 6) % 2;
        G.rrect(ctx, x - 6, y0 - 19, 12, 5, 2, '#f0b93a', 2.5);
        G.ellipse(ctx, x, y0, 13, 15, on ? (danger ? '#ff8a7a' : '#e8372c') : '#4a2f36', 3.5);
        if (on) { ctx.beginPath(); ctx.ellipse(x, y0, 6, 15, 0, 0, TAU); ctx.strokeStyle = 'rgba(42,23,17,.4)'; ctx.lineWidth = 2; ctx.stroke(); }
        G.rrect(ctx, x - 6, y0 + 14, 12, 5, 2, '#f0b93a', 2.5);
      }
      // 能量：五张符
      const full5 = p.meter >= 500;
      for (let i = 0; i < 5; i++) {
        const f = TH.clamp(p.meter / 100 - i, 0, 1), x = x0 + 134 + i * 27, bob = full5 ? Math.sin(t * 10 + i) * 3 : 0;
        const cy = y0 - 18 + bob;
        G.rrect(ctx, x, cy, 20, 36, 4, '#3b2a33', 3.5);
        if (f > 0) {
          ctx.save(); G.rrectPath(ctx, x, cy, 20, 36, 4); ctx.clip();
          ctx.fillStyle = f >= 1 ? (full5 ? '#fff3a0' : '#ffd34d') : '#c98a2e';
          ctx.fillRect(x, cy + 36 * (1 - f), 20, 36 * f);
          ctx.restore();
          G.rrectPath(ctx, x, cy, 20, 36, 4); ctx.strokeStyle = G.OUT; ctx.lineWidth = 3.5; ctx.stroke();
        }
        if (f >= 1) G.text(ctx, '符', x + 10, cy + 19, 15, RED);
      }
      // 当前武器
      const w = TH.WEAPONS[p.weapon], wx = x0 + 296;
      G.circle(ctx, wx, y0, 17, '#fbf0d6', 3.5);
      G.star(ctx, wx, y0, 11, 5, w.id === 'spread' ? 3 : w.id === 'homing' ? 5 : 4, t * 2, w.color, 2.5);
      G.text(ctx, w.name, wx + 26, y0 + 1, 22, '#fbf0d6', { align: 'left', stroke: G.OUT, sw: 5 });
      if (TH.Audio.muted) G.text(ctx, '静音', W - 50, H - 30, 20, '#fbf0d6', { stroke: G.OUT, sw: 5 });
    },
    // 以 (x,y) 为中心的纸板
    panel(ctx, x, y, w, h, fill) {
      ctx.fillStyle = 'rgba(20,8,10,.4)'; G.rrectPath(ctx, x - w / 2 + 8, y - h / 2 + 11, w, h, 18); ctx.fill();
      G.rrect(ctx, x - w / 2, y - h / 2, w, h, 18, fill || '#fbf0d6', 5);
      G.rrectPath(ctx, x - w / 2 + 12, y - h / 2 + 12, w - 24, h - 24, 10); ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.stroke();
    },
    menu(ctx, items, sel, x, y, gap, size) {
      gap = gap || 52; size = size || 32;
      items.forEach((s, i) => {
        const on = i === sel, yy = y + i * gap;
        if (on) {
          const wob = Math.sin(TH.time * 8) * 4, half = s.length * size * 0.56 + 26;
          G.poly(ctx, [x - half - 16 + wob, yy - 11, x - half + wob, yy, x - half - 16 + wob, yy + 11], RED, 3);
          G.poly(ctx, [x + half + 16 - wob, yy - 11, x + half - wob, yy, x + half + 16 - wob, yy + 11], RED, 3);
        }
        G.text(ctx, s, x, yy, on ? size + 4 : size, on ? RED : INK);
      });
    },
    // 菜单输入：返回新的选中项
    menuInput(sel, n) {
      const I = TH.Input;
      if (I.pressed('up')) { sel = (sel + n - 1) % n; TH.Audio.sfx('move'); }
      if (I.pressed('down')) { sel = (sel + 1) % n; TH.Audio.sfx('move'); }
      return sel;
    },
    // 弹入式大横幅：t 为已显示时间，dur 为总时长
    banner(ctx, str, t, dur, color, size) {
      if (t < 0 || t > dur) return;
      const inK = TH.backOut(Math.min(1, t / 0.28)), out = Math.max(0, (t - (dur - 0.25)) / 0.25);
      ctx.save(); ctx.translate(W / 2, H / 2 - 40); ctx.scale(0.4 + 0.6 * inK + out * 0.5, 0.4 + 0.6 * inK + out * 0.5);
      ctx.rotate(-0.05); ctx.globalAlpha = 1 - out;
      G.title(ctx, str, 0, 0, size || 130, color || '#ffd34d');
      ctx.restore();
    },
    dim(ctx, a) { ctx.fillStyle = 'rgba(18,8,14,' + a + ')'; ctx.fillRect(0, 0, W, H); },
    fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r; },
    GRADES: ['丁', '丙', '乙', '甲', '甲上'],
    // 印章式评级
    stamp(ctx, x, y, g, s, rot) {
      const label = TH.Hud.GRADES[g], col = g >= 3 ? '#d02a22' : g === 2 ? '#c8611c' : '#6a6f86';
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot || -0.18); ctx.scale(s, s);
      G.rrectPath(ctx, -62, -62, 124, 124, 16); ctx.fillStyle = 'rgba(251,240,214,.9)'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.stroke();
      G.rrectPath(ctx, -49, -49, 98, 98, 9); ctx.lineWidth = 3; ctx.stroke();
      G.text(ctx, label, 0, 3, label.length > 1 ? 44 : 72, col);
      ctx.restore();
    }
  };
})();
