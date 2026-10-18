(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Click sounds (Web Audio, no audio files) ---------- */
  const DEFAULT_ON = true; // set to false to start muted
  const KEY = 'portfolio-sound';
  const soundBtn = $('#soundBtn');
  let soundOn = DEFAULT_ON, ctx;
  try { const saved = localStorage.getItem(KEY); if (saved) soundOn = saved === 'on'; } catch {}

  function renderSound() {
    soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.title = soundOn ? 'Mute sound effects' : 'Unmute sound effects';
  }

  function tone(freq, { dur = .07, vol = .04, type = 'sine', delay = 0 } = {}) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + delay, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * .85, t + dur);
    gain.gain.setValueAtTime(.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + .02);
  }

  const sounds = {
    link:   () => tone(640),
    button: () => { tone(520); tone(780, { delay: .05, dur: .09 }); },
    menu:   () => tone(440, { type: 'triangle' }),
    copy:   () => { tone(700); tone(940, { delay: .07, dur: .1 }); },
    on:     () => { tone(500); tone(750, { delay: .06, dur: .1 }); }
  };
  const play = name => { if (soundOn) try { sounds[name](); } catch {} };

  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem(KEY, soundOn ? 'on' : 'off'); } catch {}
    renderSound();
    if (soundOn) play('on');
  });

  // One listener covers every link and button, keyboard activation included.
  document.addEventListener('click', e => {
    const el = e.target.closest('a[href], button, .hot');
    if (!el || el === soundBtn) return;
    play(el.id === 'menuBtn' ? 'menu' : el.id === 'copy' ? 'copy' : el.matches('.btn') ? 'button' : 'link');
  });

  /* ---------- Responsive navigation ---------- */
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.textContent = open ? '✕' : '☰';
  }
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', e => { if (!e.target.closest('header')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });

  /* ---------- Scroll-triggered reveals ---------- */
  $$('.cards, .fgrid').forEach(group => $$('.reveal', group).forEach((el, i) => el.style.setProperty('--d', i * 90 + 'ms')));
  const visual = $('.visual'); if (visual) visual.style.setProperty('--d', '.15s');

  const items = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }), { threshold: .12 });
    items.forEach(el => io.observe(el));
  } else items.forEach(el => el.classList.add('visible'));

  /* ---------- Reading progress + active nav link ---------- */
  const bar = $('#progress');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();

  if ('IntersectionObserver' in window) {
    const si = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      $$('a[href^="#"]', nav).forEach(a => {
        const on = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }), { rootMargin: '-35% 0px -55% 0px' });
    $$('main section[id]').forEach(s => si.observe(s));
  }

  /* ---------- Card spotlight follows the pointer ---------- */
  $$('.card, .project').forEach(el => el.addEventListener('pointermove', e => {
    if (reduceMotion.matches || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px');
    el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  /* ---------- Copy email + footer year ---------- */
  const copyBtn = $('#copy');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const status = $('#copied'), mail = 'harwynquintoarabi@gmail.com';
    try { await navigator.clipboard.writeText(mail); status.textContent = 'Copied!'; }
    catch { status.textContent = mail; }
    setTimeout(() => status.textContent = '', 2000);
  });
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Resume preview modal ---------- */
  const cvM = $('#cvModal'), cvO = $('#cvObj');
  function openCV() {
    if (!cvM) return false;
    if (!cvM.showModal) { window.open(cvO.dataset.src.split('#')[0], '_blank', 'noreferrer'); return true; }
    if (!cvO.data) cvO.data = cvO.dataset.src;
    document.body.style.overflow = 'hidden';
    cvM.showModal();
    return true;
  }
  if (cvM) {
    $$('[data-cv]').forEach(b => b.addEventListener('click', openCV));
    $('#cvClose').addEventListener('click', () => cvM.close());
    cvM.addEventListener('click', e => { if (e.target === cvM) cvM.close(); });
    cvM.addEventListener('close', () => { document.body.style.overflow = ''; });
  }

  /* ---------- Project filter + search ---------- */
  const projs = $$('.project[data-cat]');
  if (projs.length) {
    const tabs = $$('.tab'), q = $('#pSearch'), empty = $('#pEmpty');
    let cat = 'all';
    const apply = () => {
      const t = q.value.trim().toLowerCase();
      let n = 0;
      projs.forEach(p => {
        const ok = (cat === 'all' || p.dataset.cat === cat) && (!t || (p.textContent + ' ' + p.dataset.tags).toLowerCase().includes(t));
        if (ok && p.hidden && !reduceMotion.matches && p.animate) p.animate([{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 350, easing: 'ease-out' });
        p.hidden = !ok;
        n += ok;
      });
      empty.hidden = n > 0;
    };
    tabs.forEach(b => b.addEventListener('click', () => {
      cat = b.dataset.f;
      tabs.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      apply();
    }));
    q.addEventListener('input', apply);
  }

  /* ---------- GitHub live stats (public API, cached 10 min) ---------- */
  const ghBox = $('#ghub');
  if (ghBox && 'IntersectionObserver' in window) {
    const USER = 'hxrwyn', mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    const render = ({ u, r, e }) => {
      $('#gRepos').textContent = u.r;
      $('#gFollow').textContent = u.f;
      $('#gStars').textContent = r.reduce((a, x) => a + x.s, 0);
      const days = [...Array(14)].map((_, i) => new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10));
      const per = days.map(d => e.filter(x => x.t.slice(0, 10) === d).reduce((a, x) => a + x.n, 0));
      $('#gCommits').textContent = per.reduce((a, b) => a + b, 0);
      const bars = $('#gBars'), max = Math.max(1, ...per);
      bars.replaceChildren(...per.map((n, i) => { const b = mk('i'); b.title = days[i] + ': ' + n + ' commits'; requestAnimationFrame(() => b.style.height = Math.max(3, n / max * 90) + 'px'); return b; }));
      const langs = {}; r.forEach(x => { if (x.l) langs[x.l] = (langs[x.l] || 0) + 1; });
      const tot = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
      $('#gLangs').replaceChildren(...Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l, n]) => {
        const row = mk('div', 'lang'), bar = mk('i'), fill = mk('b');
        bar.append(fill); row.append(mk('span', '', l), bar, mk('span', '', Math.round(n / tot * 100) + '%'));
        requestAnimationFrame(() => fill.style.width = n / tot * 100 + '%'); fill.style.width = '0';
        return row;
      }));
      $('#gRepoList').replaceChildren(...r.slice(0, 4).map(x => {
        const a = mk('a', 'grepo'); a.href = x.u; a.target = '_blank'; a.rel = 'noreferrer';
        a.append(mk('b', '', x.n), mk('p', '', x.d || 'No description yet.'), mk('small', '', [x.l, '★ ' + x.s, '⑂ ' + x.f].filter(Boolean).join('   ')));
        return a;
      }));
      $('#gNote').textContent = 'Public repositories and public pushes only, pulled live from the GitHub API.';
    };
    const load = async () => {
      try {
        let data; try { const c = JSON.parse(sessionStorage.getItem('gh') || 'null'); if (c && Date.now() - c.t < 6e5) data = c.d; } catch {}
        if (!data) {
          const get = p => fetch('https://api.github.com' + p).then(x => { if (!x.ok) throw new Error(x.status); return x.json(); });
          const [u, r, e] = await Promise.all([get('/users/' + USER), get('/users/' + USER + '/repos?per_page=100&sort=pushed'), get('/users/' + USER + '/events/public?per_page=100')]);
          data = {
            u: { r: u.public_repos, f: u.followers },
            r: r.filter(x => !x.fork).map(x => ({ n: x.name, d: x.description, l: x.language, s: x.stargazers_count, f: x.forks_count, u: x.html_url })),
            e: e.filter(x => x.type === 'PushEvent').map(x => ({ t: x.created_at, n: x.payload.size ?? (x.payload.commits || []).length ?? 1 }))
          };
          try { sessionStorage.setItem('gh', JSON.stringify({ t: Date.now(), d: data })); } catch {}
        }
        render(data);
      } catch { $('#gNote').textContent = 'Live data is unavailable right now (GitHub limits anonymous requests). The profile link above still works.'; }
    };
    const gio = new IntersectionObserver(([en]) => { if (en.isIntersecting) { gio.disconnect(); load(); } }, { rootMargin: '200px' });
    gio.observe(ghBox);
  }

  /* ---------- Hero circuit canvas ---------- */
  (() => {
    const band = $('#home'), cv = $('#headerCanvas');
    if (!band || !cv || !cv.getContext) return;
    const ctx = cv.getContext('2d'), G = 28, COL = ['#8df4cf', '#8ba9ff', '#c6a0ff'];
    const DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    const mouse = { x: 0, y: 0, ax: 0, ay: 0, in: false, moved: false };
    let W = 0, H = 0, dpr = 1, bg, paths = [], pulses = [], sparks = [], bolts = [], target = 10, raf = 0, last = 0, lastSpark = 0, onScreen = true;
    const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function at(p, d) {
      d = clamp(d, 0, p.len);
      let k = 1; while (k < p.cum.length - 1 && p.cum[k] < d) k++;
      const t = (d - p.cum[k - 1]) / ((p.cum[k] - p.cum[k - 1]) || 1), a = p.pts[k - 1], b = p.pts[k];
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    function trail(p, a, b) {
      a = Math.max(0, a); b = Math.min(p.len, b);
      const o = [at(p, a)];
      p.cum.forEach((c, i) => { if (c > a && c < b) o.push(p.pts[i]); });
      o.push(at(p, b));
      return o;
    }
    function glow(pts, color, w) { // pts run tail -> head
      const [x0, y0] = pts[0], [x1, y1] = pts[pts.length - 1];
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, color);
      ctx.strokeStyle = g; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.stroke();
    }

    function build() {
      const r = band.getBoundingClientRect();
      W = r.width | 0; H = r.height | 0; dpr = Math.min(devicePixelRatio || 1, W < 700 ? 1.5 : 2);
      cv.width = W * dpr; cv.height = H * dpr;
      const rnd = mulberry(20261019), cols = W / G | 0, rows = H / G | 0;
      paths = []; pulses = []; sparks = []; bolts = [];
      for (let i = 0, n = clamp(W * H / 11000 | 0, 24, 110); i < n; i++) {
        let x = (rnd() * cols | 0) * G, y = (rnd() * rows | 0) * G, d = rnd() * 8 | 0;
        const pts = [[x, y]];
        for (let s = 3 + (rnd() * 5 | 0); s > 0; s--) {
          const len = (2 + (rnd() * 6 | 0)) * G;
          x = clamp(x + DIRS[d][0] * len, 0, W); y = clamp(y + DIRS[d][1] * len, 0, H);
          pts.push([x, y]); d = (d + (rnd() < .5 ? 1 : 7)) % 8;
        }
        const cum = [0];
        for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
        if (cum[cum.length - 1] > G) paths.push({ pts, cum, len: cum[cum.length - 1], c: COL[rnd() * 3 | 0] });
      }
      target = clamp(W * H / 45000 | 0, 8, 26);
      // static layer: board, traces, vias, chips
      bg = document.createElement('canvas'); bg.width = W * dpr; bg.height = H * dpr;
      const b = bg.getContext('2d'); b.scale(dpr, dpr);
      b.fillStyle = '#080b12'; b.fillRect(0, 0, W, H); b.lineWidth = 1.2; b.lineJoin = 'round';
      paths.forEach(p => {
        b.strokeStyle = b.fillStyle = p.c; b.globalAlpha = .22;
        b.beginPath(); p.pts.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); b.stroke();
        b.globalAlpha = .5;
        const e = p.pts[p.pts.length - 1], s = p.pts[0];
        b.beginPath(); b.arc(e[0], e[1], 3.2, 0, 6.283); b.stroke();
        b.beginPath(); b.arc(s[0], s[1], 1.8, 0, 6.283); b.fill();
      });
      b.globalAlpha = 1;
      for (let i = 0, n = 4 + (W / 260 | 0); i < n; i++) {
        const cw = (3 + (rnd() * 3 | 0)) * G, ch = (2 + (rnd() * 2 | 0)) * G;
        const x = (1 + (rnd() * Math.max(1, cols - 6) | 0)) * G, y = (1 + (rnd() * Math.max(1, rows - 4) | 0)) * G;
        b.fillStyle = '#0a0f18'; b.strokeStyle = 'rgba(141,244,207,.42)';
        b.beginPath(); (b.roundRect || b.rect).call(b, x, y, cw, ch, 4); b.fill(); b.stroke();
        b.strokeStyle = 'rgba(141,244,207,.2)'; b.strokeRect(x + 8, y + 8, cw - 16, ch - 16);
        b.strokeStyle = 'rgba(141,244,207,.45)'; b.beginPath();
        for (let k = G / 2; k < cw; k += G / 2) { b.moveTo(x + k, y); b.lineTo(x + k, y - 5); b.moveTo(x + k, y + ch); b.lineTo(x + k, y + ch + 5); }
        b.stroke();
        b.fillStyle = 'rgba(141,244,207,.55)'; b.beginPath(); b.arc(x + 6, y + 6, 1.6, 0, 6.283); b.fill();
      }
    }

    function spawnSparks() {
      const near = [];
      paths.forEach(p => {
        let best = 1e9, along = 0;
        for (let k = 1; k < p.pts.length; k++) {
          const [ax, ay] = p.pts[k - 1], [bx, by] = p.pts[k], vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy || 1;
          const u = clamp(((mouse.x - ax) * vx + (mouse.y - ay) * vy) / L, 0, 1);
          const d = Math.hypot(ax + vx * u - mouse.x, ay + vy * u - mouse.y);
          if (d < best) { best = d; along = p.cum[k - 1] + Math.sqrt(L) * u; }
        }
        if (best < 240) near.push({ p, d: best, along });
      });
      near.sort((a, b) => a.d - b.d).slice(0, 3).forEach(n => {
        if (sparks.length > 30) return;
        sparks.push({ p: n.p, d: clamp(n.along + (Math.random() < .5 ? -1 : 1) * (90 + Math.random() * 130), 0, n.p.len), to: n.along });
      });
    }

    function frame(t) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(bg, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // ambient data pulses
      pulses = pulses.filter(q => (q.d += q.v * dt) - q.l < q.p.len);
      for (let i = pulses.length; i < target && paths.length; i++) pulses.push({ p: paths[Math.random() * paths.length | 0], d: 0, v: 70 + Math.random() * 100, l: 50 + Math.random() * 60 });
      pulses.forEach(q => {
        const pts = trail(q.p, q.d - q.l, q.d);
        ctx.globalAlpha = .9; glow(pts, q.p.c, 2); ctx.globalAlpha = .18; glow(pts, q.p.c, 7);
        if (q.d <= q.p.len) { const [x, y] = at(q.p, q.d); ctx.globalAlpha = 1; ctx.fillStyle = q.p.c; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill(); }
      });
      // cursor aura + sparks
      if (mouse.in) {
        const k = Math.min(1, dt * 9); mouse.ax += (mouse.x - mouse.ax) * k; mouse.ay += (mouse.y - mouse.ay) * k;
        const g = ctx.createRadialGradient(mouse.ax, mouse.ay, 0, mouse.ax, mouse.ay, 150);
        g.addColorStop(0, 'rgba(141,244,207,.16)'); g.addColorStop(.5, 'rgba(139,169,255,.06)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(mouse.ax - 150, mouse.ay - 150, 300, 300);
        if (mouse.moved && t - lastSpark > 85) { spawnSparks(); lastSpark = t; mouse.moved = false; }
      }
      sparks = sparks.filter(s => {
        const dir = Math.sign(s.to - s.d);
        s.d += dir * 520 * dt;
        if ((s.to - s.d) * dir <= 0) { const [x, y] = at(s.p, s.to); bolts.push({ x, y, life: .2 }); return false; }
        const tail = s.d - dir * 45, pts = trail(s.p, Math.min(s.d, tail), Math.max(s.d, tail));
        if (dir < 0) pts.reverse();
        ctx.globalAlpha = 1; glow(pts, '#d8fff1', 2.2); ctx.globalAlpha = .25; glow(pts, '#8df4cf', 8);
        return true;
      });
      bolts = bolts.filter(bo => {
        bo.life -= dt; if (bo.life <= 0) return false;
        ctx.globalAlpha = bo.life / .2; ctx.strokeStyle = '#bfffe9'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bo.x, bo.y);
        for (let k = 1; k < 6; k++) { const f = k / 6, j = (Math.random() - .5) * 18; ctx.lineTo(bo.x + (mouse.x - bo.x) * f + j, bo.y + (mouse.y - bo.y) * f + j); }
        ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        return true;
      });
      ctx.globalAlpha = 1;
    }

    const run = () => { if (!raf && !reduceMotion.matches && onScreen && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    function drawStatic() { // reduced motion: one still frame, no loop
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(bg, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (let i = 0; i < Math.min(14, paths.length); i++) { const p = paths[i * 7 % paths.length], d = p.len * ((i * 37 % 100) / 100); ctx.globalAlpha = .8; glow(trail(p, d - 70, d), p.c, 2); }
      ctx.globalAlpha = 1;
    }
    const setup = () => { stop(); build(); reduceMotion.matches ? drawStatic() : run(); };

    band.addEventListener('pointermove', e => {
      if (reduceMotion.matches) return;
      const r = band.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (!mouse.in) { mouse.in = true; mouse.ax = mouse.x; mouse.ay = mouse.y; }
      mouse.moved = true;
    });
    band.addEventListener('pointerleave', () => { mouse.in = false; });
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? run() : stop(); }).observe(band);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : run());
    reduceMotion.addEventListener('change', setup);
    let tm;
    if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(setup, 150); }).observe(band);
    setup();
  })();

  /* ---------- NeuroComm pinout viewer ---------- */
  (() => {
    const wrap = $('#pinout'); if (!wrap) return;
    const map = JSON.parse($('#pinmap').textContent), tip = $('#ptip'), hots = $$('.hot', wrap);
    let pinned = null;
    const show = el => {
      const d = map[el.dataset.k]; if (!d) return;
      hots.forEach(h => h.classList.toggle('on', h === el));
      const b = document.createElement('b'), s = document.createElement('span'); b.textContent = d.t; s.textContent = d.d;
      tip.replaceChildren(b, s); tip.hidden = false;
      const w = wrap.getBoundingClientRect(), r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      const below = r.bottom - w.top + 10, y = below + th > w.height ? r.top - w.top - th - 10 : below;
      tip.style.left = clamp(r.left - w.left + r.width / 2 - tw / 2, 4, Math.max(4, w.width - tw - 4)) + 'px';
      tip.style.top = Math.max(4, y) + 'px';
    };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const hide = () => { if (pinned) return show(pinned); hots.forEach(h => h.classList.remove('on')); tip.hidden = true; };
    hots.forEach(el => {
      el.addEventListener('mouseenter', () => show(el));
      el.addEventListener('focus', () => show(el));
      el.addEventListener('mouseleave', hide);
      el.addEventListener('blur', hide);
      el.addEventListener('click', () => { pinned = pinned === el ? null : el; pinned ? show(el) : hide(); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.dispatchEvent(new Event('click')); } });
    });
    document.addEventListener('click', e => { if (!e.target.closest('.hot')) { pinned = null; hide(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { pinned = null; hide(); } });
  })();

  /* ---------- Terminal mode ---------- */
  (() => {
    const btn = $('#termBtn'); if (!btn) return;
    const box = $('#term'), out = $('#termOut'), form = $('#termForm'), inp = $('#termInput'), hist = [];
    let hi = 0;
    const line = (t, c) => { const d = document.createElement('div'); if (c) d.className = c; d.textContent = t; out.append(d); out.scrollTop = out.scrollHeight; };
    const mail = () => { const a = $('.contactbox a[href^="mailto:"]'); return a ? a.getAttribute('href').replace('mailto:', '') : ''; };
    const GO = { cal2hub: 'cal2hub.html', neurocomm: 'neurocomm.html', experience: 'experience.html' };
    const toggle = open => {
      box.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) { if (!out.childElementCount) line('Portfolio terminal. Type help to see commands.'); inp.focus(); } else btn.focus();
    };
    const C = {
      help: () => ['Commands:', '  about         who I am', '  skills        tools I work with', '  projects      selected work', '  experience    work history', '  contact       ways to reach me', '  open <name>   cal2hub, neurocomm, experience, github, cv', '  clear         clear the screen', '  exit          close the terminal'],
      about: () => ['Harwyn Lance Arabi', 'Fourth-year Computer Engineering student at ICCT Colleges – Cainta, expected 2027.', 'Software and embedded systems. Looking for opportunities in software and IT.'],
      skills: () => ['Embedded   C++, ESP32, Arduino Uno', 'Front-end  HTML5, CSS3, JavaScript', 'Other      Java, Python, Android Studio, Godot, Git / GitHub'],
      projects: () => ['cal2hub     Cal2Hub App. Offline Integral Calculus learning app.', 'neurocomm   NeuroComm Board & Smart Necklace. AAC device for people with aphasia.', 'Type "open <name>" to read more.'],
      experience: () => ['Layout Artist & Production Staff, Paperink Printing Services', 'November 2022 – March 2026', 'Type "open experience" for details.'],
      contact: () => ['Email      ' + mail(), 'GitHub     github.com/hxrwyn', 'Facebook   facebook.com/hrwyn.arabii', 'Instagram  instagram.com/hxrwyn.qnto'],
      open: a => {
        const k = (a[0] || '').toLowerCase();
        if (GO[k]) { setTimeout(() => { location.href = GO[k]; }, 350); return ['Opening ' + GO[k] + '...']; }
        if (k === 'github') { window.open('https://github.com/hxrwyn', '_blank', 'noreferrer'); return ['Opening GitHub...']; }
        if (k === 'cv') return openCV() ? ['Opening resume preview...'] : ['Resume preview is not available here.'];
        return ['Usage: open cal2hub | neurocomm | experience | github | cv'];
      },
      clear: () => { out.replaceChildren(); return []; },
      exit: () => { toggle(false); return []; }
    };
    form.addEventListener('submit', e => {
      e.preventDefault();
      const raw = inp.value.trim(); inp.value = ''; if (!raw) return;
      hist.push(raw); hi = hist.length; line('$ ' + raw, 'cmd');
      const [c, ...a] = raw.split(/\s+/), f = C[c.toLowerCase()];
      if (!f) line('command not found: ' + c + '. Type help for a list.', 'err'); else f(a).forEach(t => line(t));
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, hi - 1); inp.value = hist[hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; e.preventDefault(); }
    });
    box.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
    btn.addEventListener('click', () => toggle(box.hidden));
    $('#termClose').addEventListener('click', () => toggle(false));
  })();

  renderSound();
})();
