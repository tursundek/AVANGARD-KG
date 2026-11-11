/* Background cosmos: stars, drifting nodes pulled into a black hole with a particle
   accretion disk, plus a working tower crane and meshing gears. Decorative only. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- Layer ---------- */
  const layer = document.createElement('div');
  layer.className = 'cosmos';
  layer.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  canvas.className = 'cosmos-canvas';
  layer.append(canvas);
  const backdrop = document.querySelector('.backdrop');
  (backdrop || document.body.firstChild).after(layer);
  const ctx = canvas.getContext('2d');

  /* ---------- Crane (SVG) ---------- */
  function zigzag(x1, x2, yTop, yBottom, step) {
    let d = `M${x1} ${yBottom}`, left = false;
    for (let y = yBottom - step; y >= yTop; y -= step) { d += `L${left ? x1 : x2} ${y}`; left = !left; }
    return d;
  }
  function zigzagH(xStart, xEnd, y1, y2, step) {
    let d = `M${xStart} ${y1}`, top = false;
    for (let x = xStart + step; x <= xEnd; x += step) { d += `L${x} ${top ? y1 : y2}`; top = !top; }
    return d;
  }
  const crane = document.createElement('div');
  crane.className = 'crane';
  crane.innerHTML = `
    <svg viewBox="0 0 380 230" fill="none">
      <path class="c-ground" d="M6 214H374"/>
      <path class="c-frame" d="M70 214V44M84 214V44"/>
      <path class="c-lattice" d="${zigzag(70, 84, 46, 214, 14)}"/>
      <path class="c-frame" d="M77 44V14M77 14L346 40M77 14L18 40"/>
      <path class="c-frame" d="M84 40H350M84 50H340M18 40H70M18 48H70"/>
      <path class="c-lattice" d="${zigzagH(84, 340, 40, 50, 12)}"/>
      <rect class="c-weight" x="20" y="48" width="26" height="16" rx="2"/>
      <rect class="c-cabin" x="86" y="52" width="20" height="15" rx="2"/>
      <path class="c-stack" d="M108 214v-10h30v10M112 204v-8h22v8"/>
      <g class="c-building"></g>
      <g class="c-trolley">
        <rect x="-8" y="47" width="16" height="7" rx="1.5" class="c-car"/>
        <line class="c-cable" x1="0" y1="54" x2="0" y2="90"/>
        <g class="c-hook">
          <path d="M0 0v6a4 4 0 0 1-6 3" class="c-hookline"/>
          <rect class="c-payload" x="-14" y="8" width="28" height="9" rx="1"/>
        </g>
      </g>
      <path class="c-measure" d="M77 22V214"/>
      <path class="c-measure c-measure-jib" d="M84 30H200"/>
      <text class="c-label" x="8" y="12" data-l="h">H=32.6m</text>
      <text class="c-label" x="190" y="26" data-l="jib">JIB 47.2m</text>
      <text class="c-label" x="200" y="120" data-l="d">d=12.4m</text>
      <text class="c-label" x="92" y="96" data-l="t">θ=17deg</text>
    </svg>`;
  layer.append(crane);
  const svgNS = 'http://www.w3.org/2000/svg';
  const trolley = crane.querySelector('.c-trolley');
  const cable = crane.querySelector('.c-cable');
  const hook = crane.querySelector('.c-hook');
  const payload = crane.querySelector('.c-payload');
  const building = crane.querySelector('.c-building');
  const measureJib = crane.querySelector('.c-measure-jib');
  const labels = Object.fromEntries([...crane.querySelectorAll('[data-l]')].map(t => [t.dataset.l, t]));
  const BX = 262, BW = 64, FLOOR = 14, GROUND = 214, MAX_FLOORS = 7;
  let floors = 2, lastCycle = -1;
  function drawBuilding(placedGlow) {
    building.textContent = '';
    for (let i = 0; i < floors; i++) {
      const r = document.createElementNS(svgNS, 'rect');
      r.setAttribute('x', BX); r.setAttribute('y', GROUND - (i + 1) * FLOOR); r.setAttribute('width', BW); r.setAttribute('height', FLOOR - 2); r.setAttribute('rx', 1);
      r.setAttribute('class', 'c-floor' + (placedGlow && i === floors - 1 ? ' is-new' : ''));
      building.append(r);
      for (let w = 0; w < 4; w++) {
        const win = document.createElementNS(svgNS, 'rect');
        win.setAttribute('x', BX + 7 + w * 14); win.setAttribute('y', GROUND - (i + 1) * FLOOR + 4); win.setAttribute('width', 7); win.setAttribute('height', 4);
        win.setAttribute('class', 'c-win' + (((i * 4 + w) * 7) % 5 === 0 ? ' lit' : ''));
        building.append(win);
      }
    }
  }
  drawBuilding(false);
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  function updateCrane(now) {
    const cycleLen = 11000;
    const cycle = Math.floor(now / cycleLen);
    const t = (now % cycleLen) / cycleLen;
    const pickX = 123, dropX = BX + BW / 2;
    // Roof height as it was when this cycle began, so the hook does not jump after placing.
    const baseFloors = building.dataset.placed === String(cycle) ? floors - 1 : floors;
    const topY = GROUND - baseFloors * FLOOR - 26;
    const restLen = 34, pickLen = GROUND - 54 - 22, dropLen = topY - 54 + 6;
    let x, len, carrying;
    if (t < .12) { x = pickX; len = restLen + (pickLen - restLen) * ease(seg(t, 0, .12)); carrying = false; }
    else if (t < .24) { x = pickX; len = pickLen + (restLen - pickLen) * ease(seg(t, .12, .24)); carrying = true; }
    else if (t < .48) { x = pickX + (dropX - pickX) * ease(seg(t, .24, .48)); len = restLen; carrying = true; }
    else if (t < .6) { x = dropX; len = restLen + (dropLen - restLen) * ease(seg(t, .48, .6)); carrying = true; }
    else if (t < .7) { x = dropX; len = dropLen + (restLen - dropLen) * ease(seg(t, .6, .7)); carrying = false; }
    else { x = dropX + (pickX - dropX) * ease(seg(t, .7, 1)); len = restLen; carrying = false; }
    const sway = Math.sin(now * 0.004) * (t > .24 && t < .48 ? 2.2 : 0.6);
    trolley.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
    cable.setAttribute('x2', sway.toFixed(2)); cable.setAttribute('y2', (54 + len).toFixed(1));
    hook.setAttribute('transform', `translate(${sway.toFixed(2)} ${(54 + len).toFixed(1)})`);
    payload.style.opacity = carrying ? 1 : 0;
    measureJib.setAttribute('d', `M84 30H${x.toFixed(1)}`);
    // A panel is set when the hook reaches the roof; the tower resets after a while.
    if (cycle !== lastCycle) {
      if (lastCycle !== -1) { floors = floors >= MAX_FLOORS ? 2 : floors; drawBuilding(false); }
      lastCycle = cycle;
    }
    if (t >= .6 && building.dataset.placed !== String(cycle)) {
      building.dataset.placed = String(cycle);
      floors = Math.min(MAX_FLOORS, floors + 1);
      drawBuilding(true);
    }
    if (now - (updateCrane.last || 0) > 250) {
      updateCrane.last = now;
      labels.h.textContent = `H=${(len * 0.31 + 18).toFixed(1)}m`;
      labels.jib.textContent = `JIB ${((x - 84) * 0.19).toFixed(1)}m`;
      labels.d.textContent = `d=${(len * 0.12).toFixed(1)}m`;
      labels.t.textContent = `θ=${(7 + (x - 84) / 260 * 21).toFixed(1)}deg`;
      labels.jib.setAttribute('x', clamp(x - 40, 90, 290).toFixed(0));
      labels.d.setAttribute('x', (x + 14).toFixed(0)); labels.d.setAttribute('y', clamp(54 + len - 10, 70, 190).toFixed(0));
    }
  }

  /* ---------- Gears (SVG) ---------- */
  function gearPath(teeth, rOuter, rInner, rHole) {
    let d = '';
    const step = TAU / teeth;
    for (let i = 0; i < teeth; i++) {
      const a = i * step;
      const pts = [[a, rInner], [a + step * .12, rOuter], [a + step * .45, rOuter], [a + step * .57, rInner]];
      pts.forEach(([ang, r], k) => { d += `${i === 0 && k === 0 ? 'M' : 'L'}${(Math.cos(ang) * r).toFixed(2)} ${(Math.sin(ang) * r).toFixed(2)}`; });
    }
    d += `Z M${rHole} 0A${rHole} ${rHole} 0 1 0 ${-rHole} 0A${rHole} ${rHole} 0 1 0 ${rHole} 0Z`;
    return d;
  }
  // Small gears sit at the sum of pitch radii from the drive gear, so the teeth mesh.
  const pitch = g => (g.ro + g.ri) / 2;
  const gearSpecs = [
    { x: 46, y: 70, teeth: 16, ro: 40, ri: 33, dir: 1 },
    { teeth: 11, ro: 28, ri: 22, dir: -1, at: -25 },
    { teeth: 9, ro: 23, ri: 17, dir: -1, at: 38 },
  ];
  gearSpecs.slice(1).forEach(g => {
    const d = pitch(gearSpecs[0]) + pitch(g) + 0.5, a = g.at * Math.PI / 180;
    g.x = gearSpecs[0].x + Math.cos(a) * d; g.y = gearSpecs[0].y + Math.sin(a) * d;
  });
  const gears = document.createElement('div');
  gears.className = 'gears';
  gears.innerHTML = `
    <svg viewBox="-10 0 170 150" fill="none">
      <circle class="g-orbit" cx="70" cy="74" r="72"/>
      ${gearSpecs.map((g, i) => `<g transform="translate(${g.x.toFixed(2)} ${g.y.toFixed(2)})"><g class="g-gear g${i}"><path d="${gearPath(g.teeth, g.ro, g.ri, g.ri * .32)}"/><circle r="${(g.ri * .62).toFixed(1)}" class="g-ring"/>${[0, 1, 2, 3, 4, 5].map(k => `<path class="g-spoke" d="M0 0L${(Math.cos(k * TAU / 6) * g.ri * .62).toFixed(1)} ${(Math.sin(k * TAU / 6) * g.ri * .62).toFixed(1)}"/>`).join('')}</g></g>`).join('')}
      <text class="g-tag" x="96" y="10">mesh-calc</text>
    </svg>
    <div class="g-metrics">
      <div><span>RPM</span><strong data-g="rpm">18.4 rpm</strong></div>
      <div><span>LOAD</span><strong data-g="load">3.24 kN</strong></div>
      <div><span>ANGLE</span><strong data-g="angle">42.0 deg</strong></div>
      <div><span>MESH</span><strong data-g="mesh">2.40 : 1</strong></div>
      <div><span>COORD</span><strong data-g="coord">X 0.00 / Y 0.00</strong></div>
    </div>`;
  layer.append(gears);
  const gearEls = [...gears.querySelectorAll('.g-gear')];
  const gm = Object.fromEntries([...gears.querySelectorAll('[data-g]')].map(el => [el.dataset.g, el]));
  let gearAngle = 0;
  function updateGears(now, dt) {
    const drive = 0.5 + 0.5 * Math.sin(now * 0.00042 + 0.4);
    const speed = 0.55 + drive * 0.5 + Math.min(2.5, Math.abs(scrollVel) / 900);
    gearAngle += dt * speed;
    gearEls.forEach((el, i) => {
      const g = gearSpecs[i];
      const a = gearAngle * (gearSpecs[0].teeth / g.teeth) * g.dir * 57.2958 + (i ? 180 / g.teeth : 0);
      el.setAttribute('transform', `rotate(${a.toFixed(2)})`);
    });
    if (now - (updateGears.last || 0) > 250) {
      updateGears.last = now;
      const t = now * 0.001;
      gm.rpm.textContent = `${(speed * 18.6).toFixed(1)} rpm`;
      gm.load.textContent = `${(3.18 + drive * 0.54).toFixed(2)} kN`;
      gm.angle.textContent = `${(((gearAngle * 57.2958) % 360 + 360) % 360).toFixed(1)} deg`;
      gm.mesh.textContent = `${(gearSpecs[0].teeth / gearSpecs[1].teeth).toFixed(2)} : 1`;
      gm.coord.textContent = `X ${(Math.sin(t * .7) * 9).toFixed(2)} / Y ${(Math.cos(t * .5) * 9).toFixed(2)}`;
    }
  }

  /* ---------- Orbit ring with lettering around the black hole ---------- */
  const orbit = document.createElement('div');
  orbit.className = 'orbit';
  orbit.innerHTML = `<svg viewBox="0 0 200 200">
      <defs><path id="orbitPath" d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0"/></defs>
      <circle class="o-dash" cx="100" cy="100" r="92"/>
      <circle class="o-tick" cx="100" cy="100" r="97"/>
      <text><textPath href="#orbitPath" textLength="488" lengthAdjust="spacing">AVANGARD KG • НАРЫН • КЫРГЫЗСТАН • СТРОИТЕЛЬСТВО •</textPath></text>
    </svg>`;
  layer.append(orbit);
  function placeOrbit() {
    const size = hole.R * 5;
    orbit.style.width = orbit.style.height = size + 'px';
    orbit.style.left = (hole.x - size / 2) + 'px';
    orbit.style.top = (hole.y - size / 2) + 'px';
  }

  /* ---------- Canvas scene ---------- */
  let W = 1, H = 1, dpr = 1, mobile = false;
  const stars = [], nodes = [], disk = [], events = [];
  const hole = { x: 0, y: 0, R: 50 };
  let zones = [], zonesAt = -1e9;
  let mouse = { x: -9999, y: -9999, on: false };
  let scrollVel = 0, lastScrollY = scrollY, lastScrollT = performance.now();

  function layout() {
    // Measure the layer itself, so the drawing always matches what is on screen.
    W = layer.clientWidth || innerWidth; H = layer.clientHeight || innerHeight; mobile = W <= 700;
    dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.25);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (mobile) { hole.R = 19; hole.x = W - 58; hole.y = Math.max(150, H * 0.19); }
    else {
      hole.R = clamp(W * 0.042, 40, 72); hole.x = W - clamp(W * 0.19, 160, 360); hole.y = H * 0.59;
      // The crane sits under the hole: size it to the free space, and lift the hole if needed,
      // so the tower never runs into the accretion disk. (Same formula as the intro script.)
      const gap = hole.R * 2.6, base = H * 0.97;
      let cw = Math.min(380, W * 0.28, (base - (hole.y + gap)) * 380 / 230);
      if (cw < 200) cw = 200;
      const craneTop = base - cw * 230 / 380;
      if (craneTop < hole.y + gap) hole.y = Math.max(H * 0.42, craneTop - gap);
      crane.style.width = cw + 'px';
    }
    if (mobile) crane.style.width = '';
    stars.length = 0;
    const sc = mobile ? 110 : 230;
    for (let i = 0; i < sc; i++) stars.push({ x: rand(0, W), y: rand(0, H), z: rand(.15, 1), r: rand(.3, 1.5), tw: rand(.4, 1.8), ph: rand(0, TAU) });
    disk.length = 0;
    const dc = mobile ? 110 : 280;
    for (let i = 0; i < dc; i++) {
      const rr = hole.R * (1.35 + Math.pow(Math.random(), 1.6) * 2.4);
      disk.push({ a: rand(0, TAU), r: rr, w: 1.4 / Math.pow(rr / hole.R, 1.5), s: rand(.5, 1.6), h: Math.random() });
    }
    zonesAt = -1e9;
    placeOrbit();
  }

  const maskSel = '.service-inner,.fact,.about-img,.contact-inner,.map-card,.regulation,.doc,.hero-media,.section-head,.quote,.hero-row,.process-step,.cycle-visual,.marquee,.foot-top,.faq-head,.faq-item';
  const textSel = '.doc,.section-head,.quote,.hero-row,.process-step,.marquee,.foot-top,.faq-head,.faq-item';
  function refreshZones() {
    zones = [];
    document.querySelectorAll(maskSel).forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 20) return;
      // z[5]: transparent text block (opaque cards hide the background on their own).
      zones.push([r.left, r.top, r.width, r.height, Math.min(28, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0), el.matches(textSel)]);
    });
  }

  function spawn(kind) {
    let x, y, vx, vy;
    if (kind === 'sky') { x = rand(0, W); y = rand(-20, H * 0.3); vx = rand(-14, 14); vy = rand(8, 26); }
    else if (kind === 'edge') {
      const side = Math.random() < .5 ? -20 : W + 20;
      x = side; y = rand(H * .2, H * .9); vx = side < 0 ? rand(10, 30) : rand(-30, -10); vy = rand(-8, 8);
    } else {
      const a = rand(0, TAU), rr = rand(hole.R * 3, hole.R * 6.5);
      x = hole.x + Math.cos(a) * rr; y = hole.y + Math.sin(a) * rr * .8;
      vx = Math.cos(a + Math.PI / 2) * rand(18, 40); vy = Math.sin(a + Math.PI / 2) * rand(18, 40);
    }
    const band = Math.random() < .3 ? .45 : Math.random() < .85 ? 1 : 1.9;
    return { kind, x, y, vx: vx * band, vy: vy * band, life: rand(3, 9), age: 0, size: rand(.8, 1.8), ph: rand(0, TAU), trail: [], pair: 0 };
  }

  function step(now, dt) {
    const maxNodes = mobile ? 70 : 170;
    if (nodes.length < maxNodes) {
      if (Math.random() < (mobile ? 7 : 14) * dt) nodes.push(spawn('sky'));
      // Only a few nodes circle the hole at once, so it never turns into a swarm.
      const circling = nodes.reduce((c, n) => c + (n.hot > .25 ? 1 : 0), 0);
      if (circling < (mobile ? 3 : 7) && Math.random() < (mobile ? 1.5 : 3) * dt) nodes.push(spawn('orbit'));
      if (Math.random() < (mobile ? 2 : 5) * dt) nodes.push(spawn('edge'));
    }
    const warp = hole.R * (mobile ? 9 : 7.5), swallow = hole.R * 1.05;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      n.age += dt;
      n.vx += Math.cos(now * 0.0004 + n.ph) * dt * 4;
      n.vy += Math.sin(now * 0.00035 + n.ph) * dt * 4;
      const dx = hole.x - n.x, dy = hole.y - n.y, d = Math.hypot(dx, dy) || 1;
      if (d < warp) {
        const k = 1 - d / warp;
        // Strong pull, gentle swirl: nodes curve in and fall, instead of piling up in orbit.
        const pull = k * k * 340 + 30;
        const swirl = k * 55;
        n.vx += (dx / d * pull - dy / d * swirl) * dt;
        n.vy += (dy / d * pull + dx / d * swirl) * dt;
        n.hot = k;
      } else n.hot = 0;
      if (mouse.on) {
        const mx = mouse.x - n.x, my = mouse.y - n.y, md = Math.hypot(mx, my);
        if (md < 170 && md > 1) { const k = (1 - md / 170) * 40; n.vx += mx / md * k * dt; n.vy += my / md * k * dt; }
      }
      const sp = Math.hypot(n.vx, n.vy), lim = 40 + n.hot * 420;
      if (sp > lim) { n.vx = n.vx / sp * lim; n.vy = n.vy / sp * lim; }
      n.x += n.vx * dt; n.y += n.vy * dt - scrollVel * dt * 0.08;
      n.vx *= .993; n.vy *= .993;
      n.trail.push(n.x, n.y);
      const tl = (mobile ? 5 : 8) + Math.round(n.hot * 4);
      while (n.trail.length > tl * 2) n.trail.splice(0, 2);
      if (d < swallow * 1.15) {
        if (events.length < 20 && Math.random() < .3) events.push({ x: n.x, y: n.y, t: now, life: 420, type: 'spark' });
        nodes.splice(i, 1); continue;
      }
      if (n.age > n.life && n.hot < .05 || n.x < -60 || n.x > W + 60 || n.y < -60 || n.y > H + 60) { nodes.splice(i, 1); continue; }
    }
    if (Math.random() < 2.2 * dt && nodes.length) {
      const b = nodes[(Math.random() * nodes.length) | 0];
      // No flashes right next to the hole: that area stays clean.
      if (events.length < 30 && Math.hypot(b.x - hole.x, b.y - hole.y) > hole.R * 4) events.push({ x: b.x, y: b.y, t: now, life: rand(500, 1100), type: Math.random() < .5 ? 'ring' : 'bolt', r: rand(20, 80) });
    }
    disk.forEach(p => { p.a += p.w * p.s * dt * 1.6; });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function diskPoint(p, tilt, rot) {
    const cx = Math.cos(p.a) * p.r, cy = Math.sin(p.a) * p.r * tilt;
    return [hole.x + cx * Math.cos(rot) - cy * Math.sin(rot), hole.y + cx * Math.sin(rot) + cy * Math.cos(rot)];
  }

  function drawDisk(front, tilt, rot) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < disk.length; i++) {
      const p = disk[i];
      const isFront = Math.sin(p.a) > 0;
      if (isFront !== front) continue;
      const [x, y] = diskPoint(p, tilt, rot);
      const prevA = p.a - 0.12 * p.s;
      const px = hole.x + (Math.cos(prevA) * p.r) * Math.cos(rot) - (Math.sin(prevA) * p.r * tilt) * Math.sin(rot);
      const py = hole.y + (Math.cos(prevA) * p.r) * Math.sin(rot) + (Math.sin(prevA) * p.r * tilt) * Math.cos(rot);
      const heat = 1 - (p.r / hole.R - 1.35) / 2.4;
      const doppler = 0.55 + 0.45 * -Math.cos(p.a);
      const alpha = clamp((0.18 + heat * 0.55) * doppler, 0.05, 0.9);
      // Hot inner disk is white-cyan; the cooler outer rim drifts toward blue-violet.
      ctx.strokeStyle = heat > .7 ? `rgba(235,252,255,${alpha})` : heat > .4 ? `rgba(140,236,250,${alpha})` : p.h > .5 ? `rgba(120,110,235,${alpha * .9})` : `rgba(70,170,220,${alpha * .9})`;
      ctx.lineWidth = .6 + heat * 1.2;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHole(now) {
    const R = hole.R, tilt = .26, rot = -0.2;
    // Outer glow
    const glow = ctx.createRadialGradient(hole.x, hole.y, R * .8, hole.x, hole.y, R * 5);
    glow.addColorStop(0, 'rgba(60,190,230,.18)'); glow.addColorStop(.35, 'rgba(25,110,160,.07)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(hole.x, hole.y, R * 5, 0, TAU); ctx.fill();
    // A deep violet haze right around the horizon gives the "light being swallowed" feel.
    const haze = ctx.createRadialGradient(hole.x, hole.y, R * .95, hole.x, hole.y, R * 2.6);
    haze.addColorStop(0, 'rgba(118,78,226,.32)'); haze.addColorStop(.45, 'rgba(70,52,170,.12)'); haze.addColorStop(1, 'rgba(30,20,80,0)');
    ctx.fillStyle = haze; ctx.beginPath(); ctx.arc(hole.x, hole.y, R * 2.6, 0, TAU); ctx.fill();
    drawDisk(false, tilt, rot);
    // Lensed back of the disk bends over the top of the shadow.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(hole.x, hole.y); ctx.rotate(rot);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(0, -R * .06, R * (1.28 + k * .1), R * (1.18 + k * .1), 0, Math.PI * 1.04, Math.PI * 1.96);
      ctx.strokeStyle = `rgba(${k === 0 ? '230,252,255' : k === 1 ? '120,225,250' : '150,110,250'},${(.42 - k * .12) * (0.85 + 0.15 * Math.sin(now * .002 + k))})`;
      ctx.lineWidth = k ? 3 : 1.6; ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, R * .1, R * 1.18, R * .9, 0, Math.PI * .12, Math.PI * .88);
    ctx.strokeStyle = 'rgba(120,225,250,.22)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
    // Event horizon
    // Event horizon: true black in the middle, deepening into indigo and violet at the rim,
    // with the darkest point slightly off-centre so it reads as a sphere, not a flat disc.
    const core = ctx.createRadialGradient(hole.x - R * .12, hole.y - R * .1, 0, hole.x, hole.y, R * 1.12);
    core.addColorStop(0, '#000000');
    core.addColorStop(.5, '#020108');
    core.addColorStop(.72, '#080418');
    core.addColorStop(.86, '#170c38');
    core.addColorStop(.94, 'rgba(52,30,112,.95)');
    core.addColorStop(1, 'rgba(20,10,50,0)');
    ctx.fillStyle = core; ctx.beginPath(); ctx.arc(hole.x, hole.y, R * 1.12, 0, TAU); ctx.fill();
    // A faint grey-blue sheen across the shadow, like starlight bent around it.
    const sheen = ctx.createLinearGradient(hole.x - R, hole.y - R, hole.x + R, hole.y + R);
    sheen.addColorStop(0, 'rgba(120,140,200,.07)'); sheen.addColorStop(.5, 'rgba(0,0,0,0)'); sheen.addColorStop(1, 'rgba(110,70,200,.06)');
    ctx.fillStyle = sheen; ctx.beginPath(); ctx.arc(hole.x, hole.y, R * .98, 0, TAU); ctx.fill();
    // Photon ring: white-cyan edge with a violet bloom.
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); ctx.arc(hole.x, hole.y, R * 1.03, 0, TAU);
    ctx.strokeStyle = `rgba(150,110,255,${.35 + .12 * Math.sin(now * .002)})`; ctx.lineWidth = 4;
    ctx.shadowColor = 'rgba(130,90,255,.9)'; ctx.shadowBlur = 22; ctx.stroke();
    ctx.beginPath(); ctx.arc(hole.x, hole.y, R * 1.02, 0, TAU);
    ctx.strokeStyle = `rgba(200,248,255,${.6 + .2 * Math.sin(now * .003)})`; ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(94,228,245,.9)'; ctx.shadowBlur = 12; ctx.stroke();
    ctx.restore();
    drawDisk(true, tilt, rot);
  }

  function render(now) {
    ctx.clearRect(0, 0, W, H);
    if (now - zonesAt > 160) {
      refreshZones(); zonesAt = now;
      // Crane and gears fade back whenever text would sit on top of them.
      [crane, gears].forEach(el => {
        const r = el.getBoundingClientRect(), area = r.width * r.height || 1;
        let hit = 0;
        zones.forEach(z => {
          if (!z[5]) return;
          const w = Math.min(r.right, z[0] + z[2]) - Math.max(r.left, z[0]);
          const h = Math.min(r.bottom, z[1] + z[3]) - Math.max(r.top, z[1]);
          if (w > 0 && h > 0) hit += w * h;
        });
        el.classList.toggle('is-dim', hit / area > 0.06);
      });
    }

    // Nodes, links and effects
    ctx.lineCap = 'round';
    const linkDist = mobile ? 90 : 120, maxLinks = mobile ? 2 : 3;
    const counts = new Uint8Array(nodes.length);
    ctx.lineWidth = .7;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        if (counts[i] >= maxLinks) break;
        if (counts[j] >= maxLinks) continue;
        const b = nodes[j], dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > linkDist || Math.abs(dy) > linkDist) continue;
        const d = Math.hypot(dx, dy);
        if (d > linkDist) continue;
        const bend = (a.hot + b.hot) * .25;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.beginPath(); ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx + (hole.x - mx) * bend, my + (hole.y - my) * bend, b.x, b.y);
        ctx.strokeStyle = `rgba(110,233,255,${(1 - d / linkDist) * .24})`; ctx.stroke();
        counts[i]++; counts[j]++;
      }
    }
    if (mouse.on) {
      nodes.forEach(n => {
        const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
        if (d < 150) { ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y); ctx.strokeStyle = `rgba(160,240,255,${(1 - d / 150) * .35})`; ctx.stroke(); }
      });
    }
    for (const n of nodes) {
      const tr = n.trail;
      if (tr.length > 3) {
        ctx.beginPath(); ctx.moveTo(tr[0], tr[1]);
        for (let k = 2; k < tr.length; k += 2) ctx.lineTo(tr[k], tr[k + 1]);
        ctx.strokeStyle = n.hot > .1 ? `rgba(150,236,255,${.2 + n.hot * .5})` : 'rgba(110,233,255,.18)';
        ctx.lineWidth = .8 + n.hot; ctx.stroke();
      }
      const fade = Math.min(1, n.age * 2) * (n.age > n.life ? Math.max(0, 1 - (n.age - n.life)) : 1);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.size * (1 + n.hot * .6), 0, TAU);
      ctx.fillStyle = `rgba(${n.hot > .3 ? '240,253,255' : '210,248,255'},${(.55 + n.hot * .4) * Math.max(.25, fade)})`; ctx.fill();
    }
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i], p = (now - e.t) / e.life;
      if (p >= 1) { events.splice(i, 1); continue; }
      const inv = 1 - p;
      ctx.lineWidth = .9;
      if (e.type === 'spark') {
        ctx.beginPath(); ctx.arc(e.x, e.y, 2 + p * 10, 0, TAU);
        ctx.strokeStyle = `rgba(230,252,255,${inv * .6})`; ctx.stroke();
      } else if (e.type === 'ring') {
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (.4 + p), 0, TAU);
        ctx.strokeStyle = `rgba(150,236,255,${inv * .22})`; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(e.x, e.y);
        for (let k = 1; k <= 6; k++) {
          const t = k / 6, j = (Math.sin(e.t * .01 + k * 1.7) + Math.cos(now * .012 + k)) * 12 * inv;
          ctx.lineTo(e.x + (hole.x - e.x) * t + j, e.y + (hole.y - e.y) * t + j * .5);
        }
        ctx.strokeStyle = `rgba(225,252,255,${inv * .28})`; ctx.stroke();
      }
    }

    // Keep particles off text and cards.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    zones.forEach(z => { roundRect(z[0], z[1], z[2], z[3], z[4]); ctx.fill(); });
    ctx.restore();

    // Stars go underneath everything already drawn; fast scrolling stretches them.
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    // Only a fast flick turns stars into short light streaks.
    const sv = Math.abs(scrollVel), streak = sv > 900 ? Math.sign(scrollVel) * Math.min(26, (sv - 900) * 0.01) : 0;
    for (const s of stars) {
      const tw = .3 + .7 * (.5 + .5 * Math.sin(now * .00065 * s.tw + s.ph));
      const a = .12 + tw * .38 * s.z;
      if (Math.abs(streak) > 2 && s.z > .55) {
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y + streak * s.z);
        ctx.strokeStyle = `rgba(190,242,255,${a})`; ctx.lineWidth = s.r; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU);
        ctx.fillStyle = `rgba(190,242,255,${a})`; ctx.fill();
      }
    }
    ctx.restore();

    // The hole dims while text sits over it and returns in the open space between blocks.
    const reach = hole.R * 3.6;
    const covered = zones.some(z => hole.x + reach > z[0] && hole.x - reach < z[0] + z[2] && hole.y + reach * .5 > z[1] && hole.y - reach * .5 < z[1] + z[3]);
    holeAlpha += ((covered ? .16 : 1) - holeAlpha) * .06;
    orbit.style.opacity = (Math.max(0, holeAlpha - .2) / .8 * .5).toFixed(3);
    ctx.save();
    ctx.globalAlpha = holeAlpha;
    drawHole(now);
    ctx.restore();
  }
  let holeAlpha = 1;

  /* ---------- Loop ---------- */
  let raf = 0, last = performance.now(), skip = false;
  function frame(now) {
    raf = 0;
    if (document.hidden) return;
    if (mobile && (skip = !skip)) { raf = requestAnimationFrame(frame); return; }
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    // Scroll speed drives star streaks, gear speed and node drift.
    const sy = scrollY, st = now;
    const raw = (sy - lastScrollY) / Math.max(.008, (st - lastScrollT) / 1000);
    lastScrollY = sy; lastScrollT = st;
    scrollVel += (raw - scrollVel) * .15;
    for (const s of stars) {
      s.y -= (raw * dt) * s.z * .12;
      if (s.y < -4) s.y += H + 8; else if (s.y > H + 4) s.y -= H + 8;
    }
    step(now, dt);
    render(now);
    updateCrane(now);
    updateGears(now, dt);
    raf = requestAnimationFrame(frame);
  }
  layout();
  if (reduced) {
    for (let i = 0; i < 60; i++) step(performance.now(), .05);
    render(performance.now()); updateCrane(4000); updateGears(0, 0);
    return;
  }
  raf = requestAnimationFrame(frame);
  let lastSize = W + 'x' + H;
  new ResizeObserver(() => {
    const size = layer.clientWidth + 'x' + layer.clientHeight;
    if (size !== lastSize) { lastSize = size; layout(); }
  }).observe(layer);
  document.addEventListener('visibilitychange', () => { last = performance.now(); lastScrollT = last; if (!document.hidden && !raf) raf = requestAnimationFrame(frame); });
  if (fine) {
    addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; } }, { passive: true });
    document.addEventListener('pointerout', e => { if (!e.relatedTarget) mouse.on = false; });
  }
})();
