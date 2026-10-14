// Glass folder — dependency-free port of glass-folder-cards.
// Usage: GlassFolder.mount(element, { label, meta, tone, art, seed, files:[{name, meta, href, art}] })
(function () {
  'use strict';

  /* ---------- art ---------- */
  var PRESETS = {
    aurora: { style: 'streak', colors: ['#f4efe9', '#e9c2b8', '#c2433f', '#2a1e2a', '#22395e', '#6f97c2', '#e5edf4'], scale: 0.7, warp: 1.4, angle: -0.62, gloss: 0.18, veins: 0 },
    ember: { style: 'marble', colors: ['#07090c', '#16252c', '#3d5f68', '#1a1416', '#a3201a', '#ef4a2b', '#ff8a5c'], scale: 0.62, warp: 3.2, angle: -0.5, gloss: 0.55, veins: 0.6 },
    dusk: { style: 'marble', colors: ['#120c18', '#3e2850', '#8f6c9c', '#2b1a24', '#b3502f', '#eab08a', '#fbe7d2'], scale: 0.75, warp: 3.6, angle: 0.8, gloss: 0.5, veins: 0.5 },
    glacier: { style: 'streak', colors: ['#f7f8fa', '#d9e2ea', '#9fb4c7', '#e8edf2', '#bccbd8', '#ffffff'], scale: 0.7, warp: 1.6, angle: 0.35, gloss: 0.25, veins: 0 },
    verdant: { style: 'marble', colors: ['#070b08', '#173024', '#4f7a5a', '#141812', '#a7843a', '#e9cf87', '#fbf3d6'], scale: 0.7, warp: 3.4, angle: 2.1, gloss: 0.5, veins: 0.5 },
    // Monetayz: navy ink folding through ledger green
    ledger: { style: 'marble', colors: ['#050a18', '#0f1d44', '#27487f', '#0b1429', '#1f6f5c', '#4fb89e', '#cfeee4'], scale: 0.66, warp: 3.3, angle: -0.4, gloss: 0.5, veins: 0.55 },
    // Monetayz: paper-and-brass counterpart
    brass: { style: 'streak', colors: ['#0b1222', '#172554', '#3a4f8a', '#1a1a2e', '#9c7a3a', '#e6c98a', '#f6ecd3'], scale: 0.7, warp: 1.6, angle: 0.5, gloss: 0.3, veins: 0 }
  };

  function hexToRgb(hex) {
    var h = String(hex).trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function makeFbm(seed) {
    var r = rng(seed);
    var perm = new Uint8Array(512);
    var grad = new Float32Array(512);
    var p = [], i, j, t;
    for (i = 0; i < 256; i++) p.push(i);
    for (i = 255; i > 0; i--) { j = Math.floor(r() * (i + 1)); t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (i = 0; i < 256; i++) {
      var a = r() * Math.PI * 2;
      grad[i * 2] = Math.cos(a);
      grad[i * 2 + 1] = Math.sin(a);
    }
    function noise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var X = xi & 255, Y = yi & 255;
      var h00 = perm[X + perm[Y]] * 2;
      var h10 = perm[X + 1 + perm[Y]] * 2;
      var h01 = perm[X + perm[Y + 1]] * 2;
      var h11 = perm[X + 1 + perm[Y + 1]] * 2;
      var d00 = grad[h00] * xf + grad[h00 + 1] * yf;
      var d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
      var d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1);
      var d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
      var u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
      var v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00));
    }
    return function (x, y, octaves) {
      var sum = 0, amp = 0.5;
      for (var k = 0; k < octaves; k++) {
        sum += amp * noise(x, y);
        var nx = 1.6 * x + 1.2 * y + 7.1;
        y = -1.2 * x + 1.6 * y + 3.3;
        x = nx;
        amp *= 0.5;
      }
      return sum;
    };
  }

  function createArtJob(width, height, recipe, seed) {
    var w = Math.max(1, Math.round(width));
    var h = Math.max(1, Math.round(height));
    var colors = recipe.colors.length >= 2 ? recipe.colors : ['#111111', '#eeeeee'];
    var stops = colors.map(function (c, i) { return { t: i / (colors.length - 1), c: hexToRgb(c) }; });
    var scale = recipe.scale != null ? recipe.scale : 0.7;
    var warp = recipe.warp != null ? recipe.warp : 3;
    var gloss = recipe.gloss != null ? recipe.gloss : 0.4;
    var veins = recipe.veins || 0;
    var streak = recipe.style === 'streak';
    var fbm = makeFbm(seed * 977 + 13);
    var r = rng(seed + 1);
    var ox = r() * 50, oy = r() * 50;
    var angle = (recipe.angle || 0) + (r() - 0.5) * 0.5;
    var ca = Math.cos(angle), sa = Math.sin(angle);
    var m = Math.min(w, h);
    var gw = Math.ceil(w / 2) + 3;
    var gh = Math.ceil(h / 2) + 3;
    var G = new Float32Array(gw * gh);
    var GQ = new Float32Array(gw * gh);
    var F = new Float32Array(w * h);
    var Q = new Float32Array(w * h);
    var pixels = new Uint8ClampedArray(w * h * 4);
    var row = 0;

    function field(gy) {
      for (var gx = 0; gx < gw; gx++) {
        var u = ((gx - 1) * 2 - w / 2) / m;
        var v = ((gy - 1) * 2 - h / 2) / m;
        var px = (u * ca - v * sa) * scale;
        var py = (u * sa + v * ca) * scale;
        if (streak) { px *= 0.14; py *= 2.2; }
        px += ox; py += oy;
        var qx = fbm(px, py, 3);
        var qy = fbm(px + 5.2, py + 1.3, 3);
        var rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3);
        var ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3);
        G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4);
        GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
      }
    }

    function cr(a, b, c, d) { return (-a + 9 * b + 9 * c - d) / 16; }

    function upsample() {
      var T = new Float32Array(w * gh);
      var gy, x, y, c;
      for (gy = 0; gy < gh; gy++) {
        var rr = gy * gw;
        for (x = 0; x < w; x++) {
          c = (x >> 1) + 1;
          T[gy * w + x] = x & 1 ? cr(G[rr + c - 1], G[rr + c], G[rr + c + 1], G[rr + c + 2]) : G[rr + c];
        }
      }
      for (y = 0; y < h; y++) {
        c = (y >> 1) + 1;
        for (x = 0; x < w; x++) {
          F[y * w + x] = y & 1 ? cr(T[(c - 1) * w + x], T[c * w + x], T[(c + 1) * w + x], T[(c + 2) * w + x]) : T[c * w + x];
          var gx = (x >> 1) + 1;
          var q0 = GQ[c * gw + gx];
          var qx = x & 1 ? (q0 + GQ[c * gw + gx + 1]) / 2 : q0;
          var q1 = y & 1 ? (x & 1 ? (GQ[(c + 1) * gw + gx] + GQ[(c + 1) * gw + gx + 1]) / 2 : GQ[(c + 1) * gw + gx]) : qx;
          Q[y * w + x] = (qx + q1) / 2;
        }
      }
    }

    function colorize() {
      var sample = [];
      var stride = Math.max(1, Math.floor(F.length / 4096));
      for (var s = 0; s < F.length; s += stride) sample.push(F[s]);
      sample.sort(function (a, b) { return a - b; });
      var lo = sample[Math.floor(sample.length * 0.02)];
      var hi = sample[Math.floor(sample.length * 0.98)];
      var k = 1 / (hi - lo || 1);
      var lx = -0.55, ly = -0.65, lz = 0.52;
      var slope = k * m * 0.012;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var i = y * w + x;
          var t = (F[i] - lo) * k;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          var j = 1;
          while (j < stops.length - 1 && stops[j].t < t) j++;
          var a = stops[j - 1], b = stops[j];
          var f = (t - a.t) / (b.t - a.t || 1);
          f = f < 0 ? 0 : f > 1 ? 1 : f;
          f = f * f * (3 - 2 * f);
          var gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope;
          var gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope;
          var nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
          var spec = Math.pow(nd > 0 ? nd : 0, 24) * gloss * 255;
          var silk = 1 + 0.035 * Math.sin(t * 150 + Q[i] * 24);
          var vein = veins * Math.max(0, 1 - Math.abs(Q[i] - 0.42) * 14) * 0.6;
          var lit = (0.82 + 0.28 * nd) * silk * (1 - vein);
          pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * lit + spec;
          pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * lit + spec;
          pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * lit + spec;
          pixels[i * 4 + 3] = 255;
        }
      }
    }

    function step(rows) {
      if (row >= gh) return true;
      var end = Math.min(gh, row + Math.max(1, rows));
      while (row < end) field(row++);
      if (row < gh) return false;
      upsample();
      colorize();
      return true;
    }

    return { width: w, height: h, pixels: pixels, step: step };
  }

  /* ---------- shared painter: a few ms per frame, cached per recipe ---------- */
  var cache = {};
  var queue = [];
  var pumping = false;

  function pump() {
    if (pumping) return;
    pumping = true;
    (function tick() {
      var until = performance.now() + 7;
      while (queue.length && performance.now() < until) {
        var head = queue[0];
        if (head.job.step(4)) {
          queue.shift();
          var c = document.createElement('canvas');
          c.width = head.job.width;
          c.height = head.job.height;
          c.getContext('2d').putImageData(new ImageData(head.job.pixels, c.width, c.height), 0, 0);
          head.done(c);
        }
      }
      if (queue.length) requestAnimationFrame(tick);
      else pumping = false;
    })();
  }

  function paint(recipe, seed, w, h, priority) {
    var key = JSON.stringify([recipe, seed, w, h]);
    if (!cache[key]) {
      cache[key] = new Promise(function (done) {
        var at = queue.length;
        while (at > 1 && queue[at - 1].priority > priority) at--;
        queue.splice(at, 0, { job: createArtJob(w, h, recipe, seed), priority: priority, done: done });
        pump();
      });
    }
    return cache[key];
  }

  function artCanvas(cls, art, seed, w, h, density, priority) {
    var recipe = typeof art === 'string' ? PRESETS[art] : art;
    var c = document.createElement('canvas');
    c.className = cls;
    c.setAttribute('aria-hidden', 'true');
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    c.style.maxWidth = 'none';
    paint(recipe, seed, Math.round(w * density), Math.round(h * density), priority).then(function (src) {
      c.width = src.width;
      c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      c.setAttribute('data-ready', '');
    });
    return c;
  }

  /* ---------- geometry (folder units: 340 x 272) ---------- */
  var W = 340, H = 272, HEADROOM = 54, FRONT_TOP = 74, FRONT_H = H - FRONT_TOP;
  var BACK_PATH = 'M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z';
  var FRONT_PATH = 'M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ' + (FRONT_H - 22) +
    'A22 22 0 0 1 318 ' + FRONT_H + 'L22 ' + FRONT_H + 'A22 22 0 0 1 0 ' + (FRONT_H - 22) + 'Z';
  var NS = 'http://www.w3.org/2000/svg';
  var uidCounter = 0;

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function mount(host, opts) {
    opts = opts || {};
    var label = opts.label || 'My Files';
    var files = opts.files || [];
    var tone = opts.tone || 'dark';
    var art = opts.art || 'aurora';
    var seed = opts.seed != null ? opts.seed : 3;
    var maxWidth = opts.width || 340;
    var uid = 'gf' + (++uidCounter);
    var metaLine = opts.meta || files.length + (files.length === 1 ? ' item' : ' items');

    var root = el('div', 'gf-root', { 'data-tone': tone, 'data-place': 'bottom-left' });
    var stage = el('div', 'gf-stage');
    var tilt = el('div', 'gf-tilt');
    stage.appendChild(tilt);
    root.appendChild(stage);

    tilt.appendChild(el('div', 'gf-shadow', { 'aria-hidden': 'true' }));

    // back panel + art
    var back = el('div', 'gf-back', { 'aria-hidden': 'true' });
    back.style.clipPath = "path('" + BACK_PATH + "')";
    var density = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1)) * (maxWidth / W);
    if (art !== 'none') back.appendChild(artCanvas('gf-art', art, seed, W + 24, H + 24, density, 0));
    back.appendChild(el('div', 'gf-back-sheen'));
    tilt.appendChild(back);

    var backRim = document.createElementNS(NS, 'svg');
    backRim.setAttribute('class', 'gf-rim gf-back-rim');
    backRim.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    backRim.setAttribute('aria-hidden', 'true');
    var bp = document.createElementNS(NS, 'path');
    bp.setAttribute('d', BACK_PATH);
    backRim.appendChild(bp);
    tilt.appendChild(backRim);

    // front glass
    var front = el('div', 'gf-front');
    front.style.clipPath = "path('" + FRONT_PATH + "')";
    front.appendChild(el('div', 'gf-tint', { 'aria-hidden': 'true' }));
    front.appendChild(el('div', 'gf-spec', { 'aria-hidden': 'true' }));
    var frontRim = document.createElementNS(NS, 'svg');
    frontRim.setAttribute('class', 'gf-rim gf-front-rim');
    frontRim.setAttribute('viewBox', '0 0 ' + W + ' ' + FRONT_H);
    frontRim.setAttribute('aria-hidden', 'true');
    frontRim.innerHTML =
      '<defs><linearGradient id="' + uid + '-rim" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#fff" stop-opacity="0.95"/>' +
      '<stop offset="0.35" stop-color="#fff" stop-opacity="0.35"/>' +
      '<stop offset="1" stop-color="#fff" stop-opacity="0.12"/></linearGradient></defs>' +
      '<path d="' + FRONT_PATH + '" stroke="url(#' + uid + '-rim)"/>';
    front.appendChild(frontRim);

    var hit = el('button', 'gf-hit', { type: 'button', 'aria-expanded': 'false' });
    hit.setAttribute('aria-label', 'Open ' + label + ', ' + metaLine);
    front.appendChild(hit);

    var lab = el('div', 'gf-label');
    var title = el('span', 'gf-title'); title.textContent = label;
    var meta = el('span', 'gf-meta'); meta.textContent = metaLine;
    lab.appendChild(title); lab.appendChild(meta);
    front.appendChild(lab);

    // files (between the panels, after the glass in tab order)
    var filesEl = el('div', 'gf-files', { role: 'list', 'aria-label': label + ' contents' });
    filesEl.setAttribute('inert', '');
    var MAX_VISIBLE = 4;
    var visible = files.slice(Math.max(0, files.length - MAX_VISIBLE));
    visible.forEach(function (file, v) {
      var slot = visible.length <= 1 ? 0 : (v / (visible.length - 1)) * 2 - 1;
      var jitter = rng(hashString(file.name) + v);
      var picture = !!file.art;
      var s = el(file.href ? 'a' : 'button', 'gf-sheet' + (picture ? ' gf-sheet--art' : ''));
      if (file.href) s.href = file.href; else s.type = 'button';
      s.style.setProperty('--gf-slot', slot);
      s.style.setProperty('--gf-depth', visible.length - 1 - v);
      s.style.setProperty('--gf-jx', ((jitter() - 0.5) * 10).toFixed(2) + 'px');
      s.style.setProperty('--gf-jr', ((jitter() - 0.5) * 3.2).toFixed(2) + 'deg');
      s.style.zIndex = v + 1;
      if (picture) {
        s.appendChild(artCanvas('gf-sheet-art', file.art, hashString(file.name) % 997, 272, 184, Math.min(density, 1.25), 1));
      } else {
        var lines = el('span', 'gf-lines', { 'aria-hidden': 'true' });
        ['86%', '92%', '64%', '88%', '42%'].forEach(function (wd) {
          var i = document.createElement('i'); i.style.width = wd; lines.appendChild(i);
        });
        s.appendChild(lines);
      }
      var head = el('span', 'gf-sheet-head');
      var nm = el('span', 'gf-sheet-name'); nm.textContent = file.name; head.appendChild(nm);
      if (file.meta) { var mt = el('span', 'gf-sheet-meta'); mt.textContent = file.meta; head.appendChild(mt); }
      s.appendChild(head);
      var li = el('div', null, { role: 'listitem' });
      li.style.display = 'contents';
      li.appendChild(s);
      filesEl.appendChild(li);
    });

    // z-order is handled in CSS; DOM order puts files after the glass for tab order
    tilt.appendChild(front);
    tilt.appendChild(filesEl);

    host.innerHTML = '';
    host.appendChild(root);

    /* sizing: scale the 340-wide stage to the available width */
    function size() {
      var avail = host.clientWidth || maxWidth;
      var width = Math.max(220, Math.min(maxWidth, avail));
      var k = width / W;
      root.style.width = width + 'px';
      root.style.height = (H + HEADROOM) * k + 'px';
      stage.style.transform = 'translateY(' + HEADROOM * k + 'px) scale(' + k + ')';
    }
    size();
    window.addEventListener('resize', size);

    /* open / close */
    var open = !!opts.defaultOpen;
    function setOpen(next) {
      open = next;
      root.toggleAttribute('data-open', open);
      hit.setAttribute('aria-expanded', String(open));
      hit.setAttribute('aria-label', (open ? 'Close ' : 'Open ') + label + ', ' + metaLine);
      filesEl.toggleAttribute('inert', !open);
    }
    setOpen(open);
    hit.addEventListener('click', function () { setOpen(!open); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) { setOpen(false); hit.focus(); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (open && !root.contains(e.target)) setOpen(false);
    });

    /* pointer parallax without re-rendering */
    var raf = 0, px = 0, py = 0;
    function write() {
      raf = 0;
      root.style.setProperty('--gf-px', px.toFixed(3));
      root.style.setProperty('--gf-py', py.toFixed(3));
    }
    root.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = root.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(write);
    });
    root.addEventListener('pointerleave', function () {
      px = 0; py = 0;
      if (!raf) raf = requestAnimationFrame(write);
    });

    /* entrance: assemble the first time it is on screen */
    function enter() { setTimeout(function () { root.setAttribute('data-entered', ''); }, opts.appearDelay || 0); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { io.disconnect(); enter(); }
      }, { threshold: 0.25 });
      io.observe(root);
    } else {
      root.setAttribute('data-entered', '');
    }

    return { open: function () { setOpen(true); }, close: function () { setOpen(false); } };
  }

  window.GlassFolder = { mount: mount, PRESETS: PRESETS };
})();
