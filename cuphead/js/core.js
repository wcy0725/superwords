'use strict';
// 核心：命名空间、工具函数、输入、存档、主循环
(function () {
  const TH = window.TH = {};
  TH.W = 1280; TH.H = 720; TH.GROUND = 610; TH.STEP = 1 / 60; TH.TAU = Math.PI * 2;
  TH.time = 0;      // 全局动画时钟
  TH.diff = 1;      // 0 简单 / 1 普通 / 2 困难

  TH.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  TH.lerp = (a, b, t) => a + (b - a) * t;
  TH.rand = (a, b) => a + Math.random() * (b - a);
  TH.randi = (a, b) => Math.floor(TH.rand(a, b + 1));
  TH.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  TH.shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  TH.easeOut = t => 1 - (1 - t) * (1 - t);
  TH.easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  TH.backOut = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  // ---- 碰撞：形状为 {x,y,r}（圆）或 {x,y,w,h}（以中心为基准的矩形）----
  function circRect(c, r) {
    const dx = Math.abs(c.x - r.x) - r.w / 2, dy = Math.abs(c.y - r.y) - r.h / 2;
    if (dx > c.r || dy > c.r) return false;
    if (dx <= 0 || dy <= 0) return true;
    return dx * dx + dy * dy <= c.r * c.r;
  }
  TH.hit = function (a, b) {
    const ac = a.w === undefined, bc = b.w === undefined;
    if (ac && bc) { const dx = a.x - b.x, dy = a.y - b.y, rr = a.r + b.r; return dx * dx + dy * dy <= rr * rr; }
    if (ac) return circRect(a, b);
    if (bc) return circRect(b, a);
    return Math.abs(a.x - b.x) * 2 <= a.w + b.w && Math.abs(a.y - b.y) * 2 <= a.h + b.h;
  };

  // ---- 输入：键盘 + 手柄，动作映射 ----
  const MAP = {
    left: ['ArrowLeft', 'KeyA', 'GP_L'], right: ['ArrowRight', 'KeyD', 'GP_R'],
    up: ['ArrowUp', 'KeyW', 'GP_U'], down: ['ArrowDown', 'KeyS', 'GP_D'],
    jump: ['KeyZ', 'KeyK', 'Space', 'GP_A'], shoot: ['KeyX', 'KeyJ', 'GP_X'],
    dash: ['ShiftLeft', 'ShiftRight', 'KeyL', 'GP_Y'], ex: ['KeyV', 'KeyI', 'GP_B'],
    lock: ['KeyC', 'KeyU', 'GP_RB'], swap: ['Tab', 'KeyQ', 'KeyO', 'GP_LB'],
    pause: ['Escape', 'KeyP', 'GP_START'], confirm: ['Enter', 'KeyZ', 'Space', 'KeyK', 'GP_A'],
    back: ['Escape', 'Backspace', 'GP_B'], mute: ['KeyM']
  };
  const GP = { GP_A: 0, GP_B: 1, GP_X: 2, GP_Y: 3, GP_LB: 4, GP_RB: 5, GP_START: 9, GP_U: 12, GP_D: 13, GP_L: 14, GP_R: 15 };
  const used = new Set(); for (const k in MAP) MAP[k].forEach(c => used.add(c));
  const held = new Set(), fresh = new Set();
  window.addEventListener('keydown', e => {
    if (used.has(e.code)) e.preventDefault();
    if (TH.Audio) TH.Audio.unlock();
    if (e.repeat) return;
    if (e.code === 'KeyF') {   // 全屏切换
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    }
    held.add(e.code); fresh.add(e.code);
  });
  window.addEventListener('keyup', e => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  window.addEventListener('pointerdown', () => { if (TH.Audio) TH.Audio.unlock(); });
  TH.Input = {
    down: a => MAP[a].some(c => held.has(c)),
    pressed: a => MAP[a].some(c => fresh.has(c)),
    eat: a => MAP[a].forEach(c => fresh.delete(c)),
    endStep() { fresh.clear(); },
    poll() {
      let p = null;
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of pads) if (g && g.connected) { p = g; break; }
      const now = {};
      if (p) {
        for (const k in GP) now[k] = !!(p.buttons[GP[k]] && p.buttons[GP[k]].pressed);
        const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
        if (ax < -0.4) now.GP_L = true; if (ax > 0.4) now.GP_R = true;
        if (ay < -0.5) now.GP_U = true; if (ay > 0.5) now.GP_D = true;
      }
      for (const k in GP) {
        if (now[k]) { if (!held.has(k)) fresh.add(k); held.add(k); } else held.delete(k);
      }
    }
  };

  // ---- 存档 ----
  const KEY = 'tigerhat_save_v1';
  TH.Save = {
    data: { best: {}, diff: 1 },
    load() {
      try { const s = localStorage.getItem(KEY); if (s) Object.assign(this.data, JSON.parse(s)); } catch (e) { /* 忽略 */ }
      TH.diff = TH.clamp(this.data.diff | 0, 0, 2);
    },
    save() { try { this.data.diff = TH.diff; localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* 忽略 */ } }
  };

  // ---- 画布与主循环（固定步长 60Hz）----
  let scene = null, canvas = null, ctx = null, viewK = 1;
  TH.setScene = s => { scene = s; TH.scene = s; if (s.enter) s.enter(); };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = Math.min(window.innerWidth / TH.W, window.innerHeight / TH.H);
    canvas.style.width = Math.floor(TH.W * s) + 'px';
    canvas.style.height = Math.floor(TH.H * s) + 'px';
    const k = Math.min(1.5, s * dpr);                 // 后备分辨率上限 1920x1080，保证软件渲染也流畅
    canvas.width = Math.max(320, Math.round(TH.W * k));
    canvas.height = Math.max(180, Math.round(TH.H * k));
    viewK = canvas.width / TH.W;
    TH.viewK = viewK; TH.pxW = canvas.width; TH.pxH = canvas.height; TH.viewGen = (TH.viewGen || 0) + 1;
  }
  TH.boot = function (first) {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    TH.ctx = ctx;
    resize();
    window.addEventListener('resize', resize);
    TH.setScene(first);
    let last = performance.now(), acc = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      TH.Input.poll();
      acc += dt;
      let n = 0;
      while (acc >= TH.STEP && n < 4) {
        TH.time += TH.STEP;
        if (TH.Input.pressed('mute') && TH.Audio) TH.Audio.toggleMute();
        scene.update(TH.STEP);
        TH.Input.endStep();
        acc -= TH.STEP; n++;
      }
      if (acc > TH.STEP * 4) acc = 0;
      ctx.setTransform(viewK, 0, 0, viewK, 0, 0);
      scene.draw(ctx);
    }
    requestAnimationFrame(frame);
  };
})();
