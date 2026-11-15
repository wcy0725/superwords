'use strict';
// 场景：标题、选关、战绩结算
(function () {
  const TH = window.TH, G = TH.Gfx, Hud = TH.Hud, W = TH.W, H = TH.H, GY = TH.GROUND, TAU = TH.TAU;
  const DIFFS = ['简单', '普通', '困难'];
  const S = TH.Scenes = {};
  S.DIFFS = DIFFS;

  S.title = function () {
    let t = 0, hero = null;
    return {
      enter() { t = 0; hero = new TH.Player(); TH.Audio.music('menu'); },
      update(dt) {
        t += dt; hero.animT += dt;
        if (t > 0.3 && TH.Input.pressed('confirm')) { TH.Audio.sfx('ok'); TH.setScene(S.select(0)); }
      },
      draw(ctx) {
        TH.Bg.draw(ctx, 'fair');
        Hud.dim(ctx, 0.28);
        const bob = Math.sin(t * 2) * 6;
        TH.BossList[0].icon(ctx, 215, 455, 1.05);
        TH.BossList[1].icon(ctx, 1085, 225, 1.1);
        TH.BossList[2].icon(ctx, 1075, 480, 1.35);
        G.title(ctx, '虎头小子', W / 2, 185 + bob, 150, '#ffd34d');
        G.rrect(ctx, W / 2 - 170, 288 + bob, 340, 56, 12, '#c9302a', 5);
        G.text(ctx, '灯 会 擂 台', W / 2, 317 + bob, 36, '#fbf0d6');
        G.ellipse(ctx, W / 2, GY + 8, 80, 14, 'rgba(20,8,10,.3)', 0);
        ctx.save(); ctx.translate(W / 2, GY); ctx.scale(2.2, 2.2); hero.drawBody(ctx, 0, 0, 1, false); ctx.restore();
        if (Math.floor(t * 2.5) % 2 === 0) G.text(ctx, '按 Enter 或 Z 开始', W / 2, 668, 34, '#fbf0d6', { stroke: G.OUT, sw: 7 });
        G.text(ctx, '原创横版射击 · Boss Rush', W - 24, 28, 20, 'rgba(251,240,214,.85)', { align: 'right', bold: false });
        G.paper(ctx);
      }
    };
  };

  S.select = function (sel) {
    let t = 0;
    sel = sel || 0;
    const HELP = [
      '移动 ←→ / A D　　瞄准 ↑↓ / W S　　跳跃 Z / K　　射击 X / J　　冲刺 Shift / L',
      '锁定瞄准 C / U　　大招 V / I　　切换武器 Tab / Q　　暂停 Esc　　静音 M　　全屏 F',
      '空中再按一次跳跃可「格挡」粉色物体，并获得一张符；集满五张符时按大招键放必杀'
    ];
    return {
      enter() { t = 0; TH.Audio.music('menu'); },
      update(dt) {
        t += dt;
        const I = TH.Input, n = TH.BossList.length;
        if (I.pressed('left')) { sel = (sel + n - 1) % n; TH.Audio.sfx('move'); }
        if (I.pressed('right')) { sel = (sel + 1) % n; TH.Audio.sfx('move'); }
        if (I.pressed('up')) { TH.diff = (TH.diff + 1) % 3; TH.Save.save(); TH.Audio.sfx('move'); }
        if (I.pressed('down')) { TH.diff = (TH.diff + 2) % 3; TH.Save.save(); TH.Audio.sfx('move'); }
        if (t > 0.2 && I.pressed('confirm')) { TH.Audio.sfx('ok'); TH.setScene(S.fight(sel)); }
        else if (I.pressed('back')) TH.setScene(S.title());
      },
      draw(ctx) {
        ctx.fillStyle = '#3b1420'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,211,77,.09)'; ctx.lineWidth = 4;
        for (let i = 0; i < 66; i++) {
          const r = Math.floor(i / 11), x = (i % 11) * 130 + (r % 2) * 65 - 20, y = r * 126 + 40;
          ctx.beginPath(); ctx.arc(x, y, 40, 0, TAU); ctx.stroke(); ctx.strokeRect(x - 11, y - 11, 22, 22);
        }
        G.title(ctx, '选择擂台', W / 2, 66, 60, '#ffd34d');
        TH.BossList.forEach((b, i) => {
          const on = i === sel, sc = on ? 1.05 : 0.93;
          ctx.save(); ctx.translate(W / 2 + (i - 1) * 380, 322 + (on ? Math.sin(t * 4) * 5 - 8 : 0)); ctx.scale(sc, sc);
          Hud.panel(ctx, 0, 0, 320, 400, on ? '#fbf0d6' : '#cdb994');
          G.rrect(ctx, -130, -176, 260, 196, 12, ['#e2694a', '#8fd3dc', '#27306a'][i], 4);
          ctx.save(); G.rrectPath(ctx, -130, -176, 260, 196, 12); ctx.clip(); b.icon(ctx, 0, -84, 0.92); ctx.restore();
          G.text(ctx, '第' + '一二三'[i] + '关', 0, 48, 22, '#c9302a');
          G.text(ctx, b.name, 0, 88, 40, '#4a3328');
          G.text(ctx, b.sub, 0, 128, 22, '#7a5a48', { bold: false });
          const best = TH.Save.data.best[b.id + '_' + TH.diff];
          if (best) { G.text(ctx, '最佳 ' + Hud.fmtTime(best.time), 0, 164, 22, '#4a3328'); Hud.stamp(ctx, 104, -150, best.g, 0.5, 0.2); }
          else G.text(ctx, '尚未击破', 0, 164, 22, '#a08874', { bold: false });
          ctx.restore();
        });
        G.text(ctx, '难度　▲  ' + DIFFS[TH.diff] + '  ▼　　　← → 选关　　Enter / Z 出战', W / 2, 580, 28, '#fbf0d6', { stroke: G.OUT, sw: 6 });
        HELP.forEach((s, i) => G.text(ctx, s, W / 2, 630 + i * 28, 19, 'rgba(251,240,214,.82)', { bold: false }));
        G.paper(ctx);
      }
    };
  };

  S.result = function (r) {   // r: {idx, time, hp, parry, ex}
    const def = TH.BossList[r.idx];
    const timeS = r.time <= def.par ? 40 : Math.max(0, 40 - (r.time - def.par) * 0.5);
    const score = timeS + r.hp * 10 + Math.min(3, r.parry) * 5 + Math.min(6, r.ex) * 2.5;
    const g = score >= 95 ? 4 : score >= 82 ? 3 : score >= 66 ? 2 : score >= 50 ? 1 : 0;
    const rows = [
      ['用时', Hud.fmtTime(r.time) + '　（目标 ' + Hud.fmtTime(def.par) + '）'],
      ['剩余生命', r.hp + ' / 3'],
      ['格挡', Math.min(3, r.parry) + ' / 3'],
      ['符咒消耗', Math.min(6, r.ex) + ' / 6'],
      ['难度', DIFFS[TH.diff]]
    ];
    let t = 0, shown = 0, stampT = -1, isBest = false, sel = 0;
    return {
      enter() {
        t = 0; TH.Audio.music('menu'); TH.Audio.sfx('win');
        const key = def.id + '_' + TH.diff, old = TH.Save.data.best[key];
        if (!old || score > old.score || (score === old.score && r.time < old.time)) {
          TH.Save.data.best[key] = { g, score, time: r.time }; TH.Save.save(); isBest = true;
        }
      },
      update(dt) {
        t += dt; G.shakeStep(dt); G.updateFx(dt);
        const want = Math.min(rows.length, Math.floor((t - 0.5) / 0.35) + 1);
        if (t > 0.5 && want > shown) { shown = want; TH.Audio.sfx('move'); }
        if (stampT < 0 && t > 0.5 + rows.length * 0.35 + 0.4) {
          stampT = t; TH.Audio.sfx('stamp'); G.shake(10, 0.3);
          G.shards(W / 2 + 230, 330, ['#e8372c', '#ffd34d', '#fbf0d6'], 18, 420);
        }
        if (stampT >= 0 && t > stampT + 0.4) {
          sel = Hud.menuInput(sel, 2);
          if (TH.Input.pressed('confirm')) { TH.Audio.sfx('ok'); TH.setScene(sel === 0 ? S.select(r.idx) : S.fight(r.idx)); }
        }
      },
      draw(ctx) {
        const sh = G.shakeOff();
        TH.Bg.draw(ctx, def.bg); Hud.dim(ctx, 0.5);
        ctx.save(); ctx.translate(sh.x, sh.y);
        Hud.panel(ctx, W / 2, H / 2 + 10, 820, 560);
        G.title(ctx, '击破！', W / 2, 136, 70, '#e8372c', { stroke: '#fbf0d6' });
        G.text(ctx, def.name, W / 2, 200, 28, '#7a5a48');
        for (let i = 0; i < shown; i++) {
          const y = 262 + i * 52;
          G.text(ctx, rows[i][0], W / 2 - 340, y, 30, '#c9302a', { align: 'left' });
          G.text(ctx, rows[i][1], W / 2 - 170, y, 30, '#4a3328', { align: 'left' });
          G.line(ctx, W / 2 - 340, y + 24, W / 2 + 90, y + 24, 'rgba(74,51,40,.25)', 2);
        }
        if (stampT >= 0) {
          const k = Math.min(1, (t - stampT) / 0.16);
          Hud.stamp(ctx, W / 2 + 240, 340, g, 2.4 - 1.1 * k, -0.18);
          if (isBest && t > stampT + 0.3) G.text(ctx, '新纪录！', W / 2 + 240, 478, 30, '#c9302a');
          if (t > stampT + 0.4) Hud.menu(ctx, ['返回选关', '再战一次'], sel, W / 2, 556, 46, 28);
        }
        G.drawFx(ctx);
        ctx.restore();
        G.paper(ctx);
      }
    };
  };
})();
