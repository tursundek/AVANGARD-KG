(() => {
  'use strict';
  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const phone = matchMedia('(max-width:700px)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const onIntroDone = fn => {
    if (root.classList.contains('intro-hold')) window.addEventListener('av:intro-done', fn, { once: true });
    else fn();
  };

  /* ---------- Mobile menu ---------- */
  const menu = document.getElementById('mobileMenu');
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('closeBtn');
  function setMenu(open, focus = true) {
    menu.classList.toggle('active', open);
    menu.setAttribute('aria-hidden', String(!open));
    body.classList.toggle('no-scroll', open);
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) closeBtn.focus({ preventScroll: true });
    else if (focus) menuBtn.focus({ preventScroll: true });
  }
  menuBtn.addEventListener('click', () => setMenu(true));
  closeBtn.addEventListener('click', () => setMenu(false));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false, false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('active')) setMenu(false); });

  /* ---------- Split helpers (text stays in the HTML; this only wraps it) ---------- */
  function splitChars(el, masked) {
    const text = el.textContent.trim();
    el.textContent = '';
    let c = 0;
    text.split(/(\s+)/).forEach(part => {
      if (/^\s+$/.test(part)) { el.append(' '); return; }
      const word = document.createElement('span');
      word.style.display = 'inline-block';
      word.style.whiteSpace = 'nowrap';
      [...part].forEach(ch => {
        const s = document.createElement('span');
        s.className = 'ch'; s.textContent = ch; s.style.setProperty('--c', c++);
        if (masked) { const m = document.createElement('span'); m.className = 'mk'; m.append(s); word.append(m); }
        else word.append(s);
      });
      el.append(word);
    });
  }
  function splitWords(el) {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(/\s+/).forEach((w, i) => {
      const m = document.createElement('span'); m.className = 'word-mask'; m.setAttribute('aria-hidden', 'true');
      const ink = document.createElement('span'); ink.className = 'word-ink'; ink.textContent = w; ink.style.setProperty('--w', i);
      m.append(ink); el.append(m, ' ');
    });
  }

  /* ---------- Hero title ---------- */
  const heroTitle = document.querySelector('.hero-title');
  const titleMain = heroTitle.querySelector('.title-main');
  heroTitle.setAttribute('aria-label', heroTitle.textContent.replace(/\s+/g, ' ').trim());
  if (!reduced) {
    splitChars(heroTitle.querySelector('.title-top'), true);
    splitChars(titleMain, true);
    titleMain.classList.add('is-split');
    [...heroTitle.children].forEach(c => c.setAttribute('aria-hidden', 'true'));
  }

  /* ---------- Fit big words to their column ---------- */
  const fitMax = el => el.classList.contains('title-main') ? 200 : el.classList.contains('contact-title') ? 116 : 280;
  function paintTitleGradient() {
    if (!titleMain.classList.contains('is-split')) return;
    const range = document.createRange(); range.selectNodeContents(titleMain);
    const box = range.getBoundingClientRect();
    const w = box.width, left = box.left;
    titleMain.querySelectorAll('.ch').forEach(ch => {
      // Each letter shows its own slice of one shared gradient.
      const x = ch.getBoundingClientRect().left - left;
      ch.style.backgroundSize = w + 'px 100%';
      ch.style.backgroundPosition = (-x) + 'px 0';
    });
  }
  function fitAll() {
    document.querySelectorAll('[data-fit]').forEach(el => {
      el.style.fontSize = '';
      const avail = el.parentElement.clientWidth - (parseFloat(getComputedStyle(el.parentElement).paddingLeft) || 0) - (parseFloat(getComputedStyle(el.parentElement).paddingRight) || 0);
      const range = document.createRange(); range.selectNodeContents(el);
      const natural = range.getBoundingClientRect().width;
      if (!natural || !avail) return;
      const size = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = Math.min(fitMax(el), size * avail / natural * .995) + 'px';
    });
    paintTitleGradient();
  }

  /* ---------- Section headings: word masks ---------- */
  if (!reduced) document.querySelectorAll('h2[data-split]').forEach(splitWords);

  /* ---------- About quote: words light up while scrolling ---------- */
  const quote = document.querySelector('[data-words]');
  let quoteWords = [];
  if (quote && !reduced) {
    const text = quote.textContent.trim();
    quote.setAttribute('aria-label', text);
    quote.textContent = '';
    text.split(/\s+/).forEach((w, i) => {
      const s = document.createElement('span');
      s.className = 'w' + (i < 2 ? ' brand' : ''); s.textContent = w; s.setAttribute('aria-hidden', 'true');
      quote.append(s, ' ');
    });
    quoteWords = [...quote.querySelectorAll('.w')];
  }

  /* ---------- Marquee content (built from existing service names) ---------- */
  const marquee = document.querySelector('[data-marquee]');
  const words = ['Строительство', 'Проектирование', 'Сметная документация', 'Генеральный подряд', 'Тендерное сопровождение'];
  const tracks = marquee ? [...marquee.querySelectorAll('.marquee-track')] : [];
  tracks.forEach((t, i) => {
    const list = i ? [...words].reverse() : words;
    const group = `<div class="marquee-group">${list.map(w => `<span>${w}</span><b></b>`).join('')}</div>`;
    t.innerHTML = group.repeat(3);
  });

  /* ---------- Section labels decode like a terminal ---------- */
  const glyphs = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ0123456789#/+*';
  function scramble(el) {
    const final = el.textContent; const len = final.length;
    const dur = Math.min(1000, 320 + len * 55), start = performance.now(); let last = 0;
    (function step(now) {
      const t = Math.min(1, (now - start) / dur);
      if (now - last > 45 || t === 1) {
        last = now; const done = Math.floor(t * len); let out = '';
        for (let i = 0; i < len; i++) out += (i < done || final[i] === ' ') ? final[i] : glyphs[(Math.random() * glyphs.length) | 0];
        el.textContent = out;
      }
      if (t < 1) requestAnimationFrame(step); else el.textContent = final;
    })(start);
  }

  /* ---------- Reveal on enter ---------- */
  const revealTargets = [
    ...document.querySelectorAll('[data-reveal]'),
    ...document.querySelectorAll('h2[data-split]'),
    ...document.querySelectorAll('.service'),
  ];
  if (reduced || !('IntersectionObserver' in window)) {
    revealTargets.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add('in');
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    // Stagger siblings that enter together (document rows).
    document.querySelectorAll('.doc[data-reveal]').forEach((el, i) => el.style.setProperty('--d', (i % 2) * 90 + 'ms'));
    onIntroDone(() => revealTargets.forEach(el => io.observe(el)));

    const labelIO = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      labelIO.unobserve(e.target);
      scramble(e.target);
    }), { threshold: 0.8 });
    document.querySelectorAll('main .label').forEach(l => { l.setAttribute('aria-label', l.textContent.trim()); labelIO.observe(l); });
  }

  const heroMedia = document.getElementById('heroMedia');
  onIntroDone(() => requestAnimationFrame(() => {
    heroTitle.classList.add('in');
    heroMedia.classList.add('in');
  }));

  /* ---------- Side index (wide screens) ---------- */
  const sideLabels = { about: 'О компании', services: 'Услуги', cycle: 'Полный цикл', documents: 'Документы', faq: 'Вопросы', contacts: 'Контакты', map: 'Карта' };
  const sideIndex = document.createElement('nav');
  sideIndex.className = 'side-index';
  sideIndex.setAttribute('aria-label', 'Разделы страницы');
  const sideSections = Object.keys(sideLabels).map(id => document.getElementById(id)).filter(Boolean);
  sideSections.forEach((s, i) => {
    const a = document.createElement('a');
    a.href = '#' + s.id;
    a.innerHTML = `<span>${sideLabels[s.id]}</span>${String(i + 1).padStart(2, '0')}`;
    sideIndex.append(a);
  });
  body.append(sideIndex);
  const sideLinks = [...sideIndex.children];

  /* ---------- Scroll-linked scene (one rAF for everything) ---------- */
  const progressBar = document.getElementById('scrollProgress');
  const heroImg = heroMedia.querySelector('img');
  const aboutImg = document.querySelector('.about-img img');
  const services = [...document.querySelectorAll('.service')];
  const footerEl = document.querySelector('.foot-word');
  const processEl = document.getElementById('process');
  const processSteps = processEl ? [...processEl.children] : [];
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const sections = navLinks.map(a => document.querySelector(a.hash)).filter(Boolean);
  let frame = 0, lastY = scrollY, lastT = 0, velocity = 0, offset = 0, groupW = [1, 1], marqueeVisible = false;

  const measureMarquee = () => { groupW = tracks.map(t => t.firstElementChild ? t.firstElementChild.offsetWidth : 1); };

  function scene(now) {
    frame = 0;
    const y = scrollY, vh = innerHeight;
    const max = Math.max(1, root.scrollHeight - vh);
    body.classList.toggle('is-scrolled', y > 20);
    body.classList.toggle('past-hero', y > vh * 0.45);
    if (footerEl) body.classList.toggle('at-footer', footerEl.getBoundingClientRect().top < vh * 0.98);
    if (progressBar) progressBar.style.transform = `scaleX(${clamp(y / max, 0, 1)})`;

    // Full-cycle line fills while the block crosses the screen; steps light up in turn.
    if (processEl) {
      const pr = processEl.getBoundingClientRect();
      const t = reduced ? 1 : clamp((vh * 0.8 - pr.top) / (pr.height * 0.8 + vh * 0.2), 0, 1);
      processEl.style.setProperty('--prog', t.toFixed(4));
      processSteps.forEach((s, i) => s.classList.toggle('on', t > 0.02 && t >= i / (processSteps.length - 1) - 0.02));
    }

    if (!reduced) {
      // Hero photo opens to full width as it reaches the top.
      const r = heroMedia.getBoundingClientRect();
      const p = clamp(1 - (r.top - vh * 0.12) / (vh * 0.6), 0, 1);
      heroMedia.style.setProperty('--p', p.toFixed(4));
      if (r.bottom > 0 && r.top < vh) heroImg.style.setProperty('--y', (-r.top * 0.12 - 40).toFixed(1));

      if (aboutImg) {
        const ar = aboutImg.parentElement.getBoundingClientRect();
        if (ar.bottom > 0 && ar.top < vh) aboutImg.style.setProperty('--py', (((ar.top + ar.height / 2) - vh / 2) * -0.08).toFixed(1));
      }

      // Quote words light up between 85% and 35% of the viewport.
      if (quoteWords.length) {
        const qr = quote.getBoundingClientRect();
        const t = clamp((vh * 0.85 - qr.top) / (vh * 0.5 + qr.height * 0.5), 0, 1);
        const lit = Math.round(t * quoteWords.length);
        quoteWords.forEach((w, i) => w.classList.toggle('on', i < lit));
      }

      // Stacked service cards shrink and dim as the next one covers them.
      services.forEach((card, i) => {
        const next = services[i + 1];
        if (!next) { card.style.setProperty('--s', 1); card.style.setProperty('--dim', 0); return; }
        const cr = card.getBoundingClientRect(), nr = next.getBoundingClientRect();
        const cover = clamp((cr.bottom - nr.top) / cr.height, 0, 1);
        card.style.setProperty('--s', (1 - cover * 0.06).toFixed(4));
        card.style.setProperty('--dim', (cover * 0.55).toFixed(3));
      });

      // Marquee: steady drift plus a push from scroll speed.
      if (marqueeVisible && tracks.length) {
        const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
        const raw = dt ? (y - lastY) / dt : 0;
        velocity += (raw - velocity) * 0.12;
        offset += dt * ((phone.matches ? 34 : 50) + Math.min(2200, Math.abs(velocity)) * 0.45);
        const skew = clamp(velocity * -0.004, -7, 7);
        tracks.forEach((t, i) => {
          const w = groupW[i] || 1, x = i ? -(w - (offset % w)) : -(offset % w);
          t.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(i ? -skew : skew).toFixed(2)}deg)`;
        });
      }
    }
    lastY = y; lastT = now;

    // Active section in the desktop nav.
    let current = null;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.45) current = navLinks[i]; });
    navLinks.forEach(a => a.setAttribute('aria-current', String(a === current)));
    let sideCurrent = -1;
    sideSections.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.45) sideCurrent = i; });
    sideLinks.forEach((a, i) => a.setAttribute('aria-current', String(i === sideCurrent)));

    if (marqueeVisible && !reduced && !document.hidden) frame = requestAnimationFrame(scene);
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(scene); };
  if (marquee && 'IntersectionObserver' in window) {
    new IntersectionObserver(e => { marqueeVisible = e[0].isIntersecting; lastT = 0; schedule(); }).observe(marquee);
  }
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', () => { fitAll(); measureMarquee(); schedule(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { lastT = 0; schedule(); });
  document.fonts.ready.then(() => { fitAll(); measureMarquee(); schedule(); });
  addEventListener('load', () => { fitAll(); measureMarquee(); schedule(); });
  fitAll(); measureMarquee(); schedule();

  /* ---------- Desktop: cursor ring + magnetic buttons ---------- */
  if (reduced || !fine.matches) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor'; cursor.setAttribute('aria-hidden', 'true'); cursor.innerHTML = '<i></i>';
  body.append(cursor);
  let px = -100, py = -100, cx = -100, cy = -100, cf = 0;
  const loop = () => {
    cf = 0; cx += (px - cx) * 0.2; cy += (py - cy) * 0.2;
    cursor.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    if (Math.abs(px - cx) > 0.1 || Math.abs(py - cy) > 0.1) cf = requestAnimationFrame(loop);
  };
  document.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX; py = e.clientY;
    if (!cursor.classList.contains('on')) { cx = px; cy = py; cursor.classList.add('on'); }
    const t = e.target instanceof Element ? e.target : null;
    cursor.classList.toggle('link', !!(t && t.closest('a,button,summary')));
    if (!cf) cf = requestAnimationFrame(loop);
  }, { passive: true });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) cursor.classList.remove('on'); });
  document.addEventListener('pointerdown', () => cursor.classList.add('down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('down'));

  // Card borders light up where the pointer is.
  document.querySelectorAll('.service-inner,.fact,.contact-inner,.map-card,.info,.regulation').forEach(card => {
    card.classList.add('glow');
    const spot = document.createElement('span'); spot.className = 'spot'; spot.setAttribute('aria-hidden', 'true');
    card.append(spot);
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--gx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--gy', (e.clientY - r.top) + 'px');
    }, { passive: true });
  });

  const springs = new Set(); let sf = 0;
  const springLoop = () => {
    sf = 0;
    springs.forEach(s => {
      s.x += (s.tx - s.x) * 0.16; s.y += (s.ty - s.y) * 0.16;
      const still = Math.abs(s.tx - s.x) < 0.02 && Math.abs(s.ty - s.y) < 0.02;
      if (still && !s.tx && !s.ty) { s.el.style.translate = ''; springs.delete(s); }
      else s.el.style.translate = `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px`;
    });
    if (springs.size) sf = requestAnimationFrame(springLoop);
  };
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    const s = { el, x: 0, y: 0, tx: 0, ty: 0 };
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      s.tx = (e.clientX - (r.left + r.width / 2)) * 0.25;
      s.ty = (e.clientY - (r.top + r.height / 2)) * 0.35;
      springs.add(s); if (!sf) sf = requestAnimationFrame(springLoop);
    });
    el.addEventListener('pointerleave', () => { s.tx = s.ty = 0; springs.add(s); if (!sf) sf = requestAnimationFrame(springLoop); });
  });
})();
