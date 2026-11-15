'use strict';
// 音频：WebAudio 合成音效 + 五声音阶程序化配乐（无任何外部素材）
(function () {
  const TH = window.TH;
  let ac = null, master, musGain, sfxGain, noiseBuf, muted = false;

  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    musGain = ac.createGain(); musGain.gain.value = 0.42; musGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  // o: {w 波形, f 起始频率, f2 结束频率, t 时长, v 音量, d 延迟, at 绝对时间, a 起音}
  function tone(o, dest) {
    const t0 = o.at || (ac.currentTime + (o.d || 0));
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.w || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.t);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(o.v, t0 + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.t);
    osc.connect(g); g.connect(dest || sfxGain);
    osc.start(t0); osc.stop(t0 + o.t + 0.03);
  }
  // o: {t, v, f 滤波频率, f2, q, k 滤波类型, d, at}
  function noise(o, dest) {
    const t0 = o.at || (ac.currentTime + (o.d || 0));
    const src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true;
    fl.type = o.k || 'bandpass'; fl.Q.value = o.q || 1;
    fl.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.t);
    g.gain.setValueAtTime(o.v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.t);
    src.connect(fl); fl.connect(g); g.connect(dest || sfxGain);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + o.t + 0.03);
  }

  const SFX = {
    shoot: () => tone({ w: 'square', f: 980, f2: 520, t: 0.05, v: 0.04 }),
    spread: () => { noise({ t: 0.05, v: 0.07, f: 2600, q: 2 }); tone({ w: 'triangle', f: 520, f2: 300, t: 0.05, v: 0.05 }); },
    homing: () => tone({ w: 'sine', f: 660, f2: 1100, t: 0.07, v: 0.05 }),
    hit: () => noise({ t: 0.03, v: 0.05, f: 4200, q: 3 }),
    jump: () => tone({ w: 'sine', f: 300, f2: 620, t: 0.12, v: 0.12 }),
    land: () => noise({ t: 0.07, v: 0.1, f: 260, k: 'lowpass' }),
    dash: () => noise({ t: 0.16, v: 0.16, f: 700, f2: 3200, q: 1.5 }),
    parry: () => { tone({ w: 'triangle', f: 1320, f2: 1980, t: 0.22, v: 0.22 }); tone({ w: 'sine', f: 2640, t: 0.3, v: 0.1, d: 0.03 }); },
    card: () => { tone({ w: 'triangle', f: 880, t: 0.1, v: 0.12 }); tone({ w: 'triangle', f: 1175, t: 0.16, v: 0.12, d: 0.08 }); },
    hurt: () => { tone({ w: 'sawtooth', f: 320, f2: 70, t: 0.32, v: 0.2 }); noise({ t: 0.2, v: 0.2, f: 900 }); },
    ex: () => { tone({ w: 'sawtooth', f: 180, f2: 900, t: 0.28, v: 0.16 }); noise({ t: 0.3, v: 0.16, f: 500, f2: 4000 }); },
    super: () => {
      for (let i = 0; i < 6; i++) tone({ w: 'square', f: 392 * Math.pow(1.122, i * 2), t: 0.14, v: 0.1, d: i * 0.07 });
      noise({ t: 0.9, v: 0.2, f: 300, f2: 5000 });
    },
    deny: () => tone({ w: 'square', f: 160, f2: 120, t: 0.1, v: 0.08 }),
    boom: () => { noise({ t: 0.5, v: 0.4, f: 500, f2: 60, k: 'lowpass' }); tone({ w: 'sine', f: 120, f2: 35, t: 0.4, v: 0.3 }); },
    pop: () => { noise({ t: 0.12, v: 0.2, f: 1800, f2: 400 }); },
    crack: () => { noise({ t: 0.06, v: 0.22, f: 3000, q: 0.8 }); noise({ t: 0.06, v: 0.2, f: 2400, d: 0.07 }); },
    tele: () => tone({ w: 'triangle', f: 500, f2: 760, t: 0.18, v: 0.1 }),
    warn: () => { tone({ w: 'square', f: 740, t: 0.06, v: 0.06 }); tone({ w: 'square', f: 740, t: 0.06, v: 0.06, d: 0.1 }); },
    spit: () => { tone({ w: 'sine', f: 420, f2: 180, t: 0.12, v: 0.14 }); noise({ t: 0.08, v: 0.08, f: 1200 }); },
    roar: () => { tone({ w: 'sawtooth', f: 140, f2: 60, t: 0.7, v: 0.22 }); noise({ t: 0.7, v: 0.22, f: 400, f2: 150, k: 'lowpass' }); },
    whoosh: () => noise({ t: 0.4, v: 0.18, f: 400, f2: 2400, q: 1.2 }),
    zap: () => { noise({ t: 0.25, v: 0.3, f: 5000, f2: 800, q: 0.7 }); tone({ w: 'sawtooth', f: 1400, f2: 90, t: 0.22, v: 0.14 }); },
    drum: () => { tone({ w: 'sine', f: 170, f2: 55, t: 0.22, v: 0.4 }); noise({ t: 0.08, v: 0.14, f: 900 }); },
    gong: () => {
      [110, 163, 221, 290].forEach((f, i) => tone({ w: 'sine', f, f2: f * 0.97, t: 1.6 - i * 0.25, v: 0.2 - i * 0.03 }));
      noise({ t: 0.5, v: 0.14, f: 2400, f2: 600 });
    },
    move: () => tone({ w: 'triangle', f: 660, t: 0.05, v: 0.08 }),
    ok: () => { tone({ w: 'triangle', f: 660, t: 0.08, v: 0.1 }); tone({ w: 'triangle', f: 990, t: 0.12, v: 0.1, d: 0.07 }); },
    stamp: () => { tone({ w: 'sine', f: 120, f2: 50, t: 0.25, v: 0.4 }); noise({ t: 0.1, v: 0.2, f: 600, k: 'lowpass' }); },
    win: () => [0, 4, 7, 12, 16].forEach((s, i) => tone({ w: 'triangle', f: 523 * Math.pow(2, s / 12), t: 0.3, v: 0.14, d: i * 0.11 })),
    lose: () => [7, 4, 2, -3].forEach((s, i) => tone({ w: 'triangle', f: 330 * Math.pow(2, s / 12), t: 0.34, v: 0.14, d: i * 0.2 }))
  };

  // ---- 配乐：每个字符 = 一个八分音符；'.' 休止，'-' 延音 ----
  const NOTE = { q: -5, w: -3, 1: 0, 2: 2, 3: 4, 5: 7, 6: 9, i: 12, o: 14, p: 16, u: 19, y: 21 };
  const TRACKS = {
    menu: {
      bpm: 96, root: 62, lead: 'triangle', drive: 0,
      mel: '3-5-6-5-3-2-1---2-3-5-6-5-------6-i-o-i-6-5-3---2-3-5-3-2-1-----',
      bass: '1---5---6---5---2---5---1---5---6---3---6---1---2---5---1---1---'
    },
    lion: {
      bpm: 150, root: 60, lead: 'square', drive: 2,
      mel: '5565i-6535321-2.5565i-6io-i-6-5.6i65356.5321235.6-5-3-2-1---5.1.',
      bass: '1.5.1.5.6.3.6.3.1.5.1.5.5.2.5.5.6.3.6.3.1.5.1.5.2.5.2.5.1.5.1.1.'
    },
    kite: {
      bpm: 132, root: 65, lead: 'triangle', drive: 1,
      mel: 'i-6-5-6-i-o-p---o-i-6-i-5-------3-5-6-i-6-5-3-5-2-3-5-6-5---i---',
      bass: '1.5.1.5.6.3.6.3.2.6.2.6.5.2.5.5.1.5.1.5.6.3.6.3.2.6.5.5.1.5.1.5.'
    },
    nian: {
      bpm: 166, root: 57, lead: 'sawtooth', drive: 3,
      mel: '6-6-i-6-5-3-5-6-6-6-o-i-6---3---2-3-5-3-2-1-w---1-2-3-5-6---6.6.',
      bass: 'w.w.3.w.w.w.3.w.1.1.5.1.w.w.3.3.2.2.w.2.1.1.w.w.1.1.3.3.w.w.w.w.'
    }
  };
  let cur = null, curId = null, step = 0, nextT = 0, timer = null;

  function note(midi, t0, dur, w, v) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = w; osc.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + 0.012);
    g.gain.setValueAtTime(v * 0.7, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(musGain);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }
  function perc(s, t0, tr) {
    const b = s % 8;
    if (tr.drive === 0) { if (b === 0) tone({ at: t0, w: 'sine', f: 90, f2: 50, t: 0.2, v: 0.12 }, musGain); return; }
    if (b === 0 || b === 4) tone({ at: t0, w: 'sine', f: 150, f2: 48, t: 0.16, v: 0.3 }, musGain);       // 鼓
    if (b === 2 || b === 6) tone({ at: t0, w: 'square', f: 820, t: 0.04, v: 0.06 }, musGain);            // 梆子
    if (tr.drive >= 2 && b % 2 === 1) noise({ at: t0, t: 0.03, v: 0.05, f: 6500, k: 'highpass' }, musGain); // 镲
    if (tr.drive >= 3 && (b === 3 || b === 7)) tone({ at: t0, w: 'sine', f: 110, f2: 60, t: 0.1, v: 0.18 }, musGain);
    if (tr.drive >= 2 && s % 32 === 30) noise({ at: t0, t: 0.25, v: 0.07, f: 3000, k: 'highpass' }, musGain);
  }
  function sched() {
    if (!ac || !cur || ac.state !== 'running') return;
    const spb = 60 / cur.bpm / 2;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;
    while (nextT < ac.currentTime + 0.3) {
      const L = cur.mel.length, m = cur.mel[step % L], b = cur.bass[step % cur.bass.length];
      if (m !== '.' && m !== '-') {
        let len = 1;
        while (cur.mel[(step + len) % L] === '-' && len < 8) len++;
        note(cur.root + NOTE[m] + 12, nextT, spb * len * 0.95, cur.lead, cur.lead === 'triangle' ? 0.16 : 0.07);
      }
      if (b !== '.' && b !== '-') note(cur.root + NOTE[b] - 12, nextT, spb * 1.7, 'triangle', 0.2);
      perc(step, nextT, cur);
      nextT += spb; step++;
    }
  }

  const lastPlay = {};
  TH.Audio = {
    unlock() { init(); if (ac && ac.state === 'suspended') ac.resume(); },
    sfx(name) {
      if (!ac || muted || ac.state !== 'running' || !SFX[name]) return;
      const now = ac.currentTime;
      if (lastPlay[name] !== undefined && now - lastPlay[name] < 0.035) return;
      lastPlay[name] = now;
      SFX[name]();
    },
    music(id) {
      if (id === curId) return;
      curId = id; cur = id ? TRACKS[id] : null; step = 0; nextT = 0;
      if (!timer) timer = setInterval(sched, 60);
    },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; },
    get muted() { return muted; }
  };
})();
