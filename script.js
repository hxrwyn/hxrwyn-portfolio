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
    const el = e.target.closest('a[href], button');
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

  renderSound();
})();
