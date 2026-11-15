'use strict';
// 战斗场景：开场 → 战斗 → 击破 / 败北（进度卡片）→ 结算；含暂停
(function () {
  const TH = window.TH, G = TH.Gfx, Hud = TH.Hud, W = TH.W, H = TH.H;

  TH.Scenes.fight = function (idx) {
    const def = TH.BossList[idx];
    let state, stT, boss, player, time, sel, taunt, koT, cue;

    function reset() {
      TH.pb.length = 0; TH.haz.length = 0; TH.fx.length = 0;
      player = new TH.Player(); boss = def.make();
      TH.world = { player, boss, wind: 0, hitstop: 0, lockInput: true };
      boss.start();
      state = 'intro'; stT = 0; time = 0; sel = 0; koT = 0; cue = 0;
      TH.Audio.music(def.music);
    }
    function leave() { TH.world.wind = 0; TH.setScene(TH.Scenes.select(idx)); }

    function drawDeath(ctx) {
      Hud.dim(ctx, 0.55);
      const k = TH.backOut(Math.min(1, stT / 0.35));
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(k, k); ctx.rotate(-0.015);
      Hud.panel(ctx, 0, 0, 740, 460);
      G.title(ctx, '惜 败', 0, -168, 62, '#e8372c', { stroke: '#fbf0d6' });
      G.rrect(ctx, -326, -116, 150, 130, 12, '#e9d9b8', 4);
      ctx.save(); G.rrectPath(ctx, -326, -116, 150, 130, 12); ctx.clip(); def.icon(ctx, -251, -56, 0.6); ctx.restore();
      G.text(ctx, def.name + '：', -152, -90, 26, '#c9302a', { align: 'left' });
      G.text(ctx, taunt, -152, -44, 27, '#4a3328', { align: 'left', bold: false });
      // 进度条：虎头标记走到这次打到的位置
      const x1 = -300, x2 = 290, y = 70, prog = boss.progress() * TH.easeOut(TH.clamp((stT - 0.35) / 0.9, 0, 1));
      G.line(ctx, x1, y, x2, y, G.OUT, 9); G.line(ctx, x1, y, x2, y, '#cdb994', 4);
      G.line(ctx, x1, y, TH.lerp(x1, x2, prog), y, '#e8372c', 4);
      boss.cuts.forEach((c, i) => {
        const x = TH.lerp(x1, x2, 1 - c);
        G.line(ctx, x, y - 13, x, y + 13, G.OUT, 5);
        G.text(ctx, '二三'[i] + '阶段', x, y + 30, 18, '#7a5a48', { bold: false });
      });
      G.line(ctx, x2, y + 12, x2, y - 40, G.OUT, 5); G.poly(ctx, [x2, y - 40, x2 + 34, y - 30, x2, y - 18], '#e8372c', 3.5);
      const mx = TH.lerp(x1, x2, prog), my = y - 22 - Math.abs(Math.sin(stT * 6)) * 6;
      G.circle(ctx, mx, my, 14, '#ffe2c2', 3);
      ctx.beginPath(); ctx.arc(mx, my, 15, Math.PI * 1.06, Math.PI * 1.94); ctx.closePath(); G.done(ctx, '#e8372c', 3);
      G.circle(ctx, mx - 10, my - 14, 5, '#e8372c', 2.5); G.circle(ctx, mx + 10, my - 14, 5, '#e8372c', 2.5);
      G.text(ctx, '已削减 ' + Math.round(boss.progress() * 100) + '%', 326, -90, 22, '#7a5a48', { align: 'right', bold: false });
      Hud.menu(ctx, ['重新挑战', '返回选关'], sel, 0, 148, 46, 28);
      ctx.restore();
    }

    return {
      enter() { reset(); },
      update(dt) {
        const I = TH.Input, w = TH.world;
        stT += dt;
        if (state === 'pause') {
          sel = Hud.menuInput(sel, 3);
          if (I.pressed('pause')) state = 'fight';
          else if (I.pressed('confirm')) {
            TH.Audio.sfx('ok');
            if (sel === 0) { state = 'fight'; I.eat('jump'); } else if (sel === 1) reset(); else leave();
          }
          return;
        }
        if (state === 'deadmenu') {
          G.updateFx(dt); G.shakeStep(dt);
          sel = Hud.menuInput(sel, 2);
          if (stT > 0.4 && I.pressed('confirm')) { TH.Audio.sfx('ok'); if (sel === 0) reset(); else leave(); }
          return;
        }
        if (state === 'fight' && I.pressed('pause')) { state = 'pause'; sel = 0; TH.Audio.sfx('move'); return; }
        G.shakeStep(dt);
        if (w.hitstop > 0) { w.hitstop -= dt; return; }
        if (state === 'intro') {
          if (cue === 0 && stT > 0.25) { cue = 1; TH.Audio.sfx('drum'); }
          if (cue === 1 && stT > 1.4) { cue = 2; TH.Audio.sfx('gong'); }
          if (stT > 2.3) { state = 'fight'; stT = 0; w.lockInput = false; }
        }
        const d = state === 'ko' && stT < 1.3 ? dt * 0.35 : dt;   // 击破瞬间慢动作
        if (state === 'fight') time += dt;
        player.update(d); boss.update(d);
        TH.updateHaz(d); TH.updatePB(d); TH.collidePlayer(); G.updateFx(d);
        if (state === 'fight') {
          if (boss.dead) {
            state = 'ko'; stT = 0; koT = 0; player.safe = true; player.inv = 0;
            TH.Audio.music(null); TH.Audio.sfx('gong'); G.shake(16, 0.6); w.hitstop = 0.25;
          } else if (player.dead) {
            state = 'dying'; stT = 0; TH.Audio.music(null); TH.Audio.sfx('lose');
          }
        } else if (state === 'ko') {
          koT -= dt;
          if (koT <= 0 && stT < 2.7) {
            koT = 0.13;
            const c = boss.center();
            G.boom(c.x + TH.rand(-110, 110), c.y + TH.rand(-90, 90), TH.rand(0.7, 1.4));
            G.shards(c.x, c.y, ['#e8372c', '#ffd34d', '#fbf0d6'], 3, 520);
            TH.Audio.sfx('pop'); G.shake(6, 0.15);
          }
          if (stT > 3.5) {
            w.wind = 0;
            TH.setScene(TH.Scenes.result({ idx, time, hp: player.hp, parry: player.stats.parry, ex: player.stats.ex }));
          }
        } else if (state === 'dying' && stT > 1.7) {
          state = 'deadmenu'; stT = 0; sel = 0; taunt = TH.pick(def.taunts);
        }
      },
      draw(ctx) {
        const sh = G.shakeOff();
        ctx.fillStyle = '#120a10'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(sh.x, sh.y);
        TH.Bg.draw(ctx, def.bg);
        boss.draw(ctx);
        TH.drawHaz(ctx);
        player.draw(ctx);
        TH.drawPB(ctx);
        G.drawFx(ctx);
        ctx.restore();
        G.paper(ctx);
        Hud.draw(ctx, player);
        if (state === 'intro') {
          G.text(ctx, def.name, W / 2, 150, 40, '#fbf0d6', { stroke: G.OUT, sw: 8 });
          G.text(ctx, def.sub, W / 2, 196, 24, '#fbf0d6', { stroke: G.OUT, sw: 6, bold: false });
          Hud.banner(ctx, '预备——', stT - 0.25, 1.1, '#fbf0d6', 110);
          Hud.banner(ctx, '开打！', stT - 1.4, 0.9, '#ffd34d', 150);
        } else if (state === 'ko') {
          Hud.banner(ctx, '击破！', stT - 0.2, 2.6, '#ffd34d', 150);
        } else if (state === 'deadmenu') {
          drawDeath(ctx);
        } else if (state === 'pause') {
          Hud.dim(ctx, 0.55);
          Hud.panel(ctx, W / 2, H / 2, 420, 330);
          G.title(ctx, '暂 停', W / 2, H / 2 - 100, 52, '#e8372c', { stroke: '#fbf0d6' });
          Hud.menu(ctx, ['继续', '重新开始', '返回选关'], sel, W / 2, H / 2 - 20, 50, 30);
        }
      }
    };
  };
})();
