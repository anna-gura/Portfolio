/**
 * Text breaks into drifting fragments and the same fragments gather into the
 * next wording.
 *
 * How it works, and why this way:
 *
 *  - The text is drawn once to an offscreen canvas, glyph by glyph, using the
 *    rectangles of the characters that are already in the DOM. That
 *    reproduces real line breaking exactly, with no layout maths.
 *  - The canvas is read once and sampled on a grid. Every opaque pixel on the
 *    grid becomes a fragment and keeps that pixel's colour. The fragment is
 *    drawn as a block the size of the grid, so at rest the pieces close up
 *    into solid letters again.
 *  - Each fragment travels along a quadratic curve whose control point is
 *    pushed off to one side, so it swings outward before settling. That makes
 *    a cloud rather than a slide, and costs one interpolation per fragment
 *    instead of a physics step.
 *  - Frames are written straight into an ImageData buffer and blitted in one
 *    call — thousands of separate draw calls would cost far more.
 *
 * The loop runs only for the length of a transition; nothing is left running.
 */
export class ParticleSwap {
  static DURATION = 1150;
  static STEP_MIN = 3;        // sampling grid in px, and the fragment size
  static BUDGET = 2300;       // fragments; a coarser grid keeps us under it
  static SPREAD = 110;        // how far the cloud swings off course, px
  static HANDOVER = 0.82;     // when the real text starts taking over

  static get calm() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ── overlapping runs ────────────────────────────────── */

  /**
   * Only one cloud may be in the air. A second one — a language switch during
   * a page turn, say — would hide text that the first one is still expecting
   * to bring back, and the copy would stay invisible for good.
   */
  static #token = 0;
  static #hidden = new Set();

  /** Cancel whatever is running and put back anything it hid. */
  static #begin() {
    for (const el of ParticleSwap.#hidden) ParticleSwap.#restore(el);
    ParticleSwap.#hidden.clear();
    for (const canvas of document.querySelectorAll('canvas.particles')) canvas.remove();
    return ++ParticleSwap.#token;
  }

  static #hide(el) {
    el.style.visibility = 'hidden';
    ParticleSwap.#hidden.add(el);
  }

  static #restore(el) {
    el.style.visibility = '';
    el.classList.add('gathered');
    el.classList.remove('scattered');
  }

  /* ── capture ─────────────────────────────────────────── */

  static #sample(elements, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    for (const el of elements) {
      const cs = getComputedStyle(el);
      ctx.fillStyle = cs.color;
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.textBaseline = 'alphabetic';

      const m = ctx.measureText('Hg');
      const size = parseFloat(cs.fontSize);
      const ascent = m.actualBoundingBoxAscent || size * 0.8;
      const descent = m.actualBoundingBoxDescent || size * 0.2;

      for (const span of el.querySelectorAll('.dust')) {
        const ch = span.textContent;
        if (!ch.trim()) continue;
        const r = span.getBoundingClientRect();
        if (r.bottom < 0 || r.top > h) continue;
        const lead = (r.height - (ascent + descent)) / 2;
        ctx.fillText(ch, r.left, r.top + lead + ascent);
      }
    }

    const data = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer);

    let step = ParticleSwap.STEP_MIN;
    let count = ParticleSwap.#count(data, w, h, step);
    while (count > ParticleSwap.BUDGET && step < 9) {
      step += 1;
      count = ParticleSwap.#count(data, w, h, step);
    }

    const x = new Float32Array(count);
    const y = new Float32Array(count);
    const c = new Uint32Array(count);
    let i = 0;

    for (let py = 0; py < h; py += step) {
      const row = py * w;
      for (let px = 0; px < w; px += step) {
        const pixel = data[row + px];
        if ((pixel >>> 24) > 140 && i < count) {
          x[i] = px; y[i] = py; c[i] = pixel; i++;
        }
      }
    }
    return { x, y, c, n: i, step };
  }

  static #count(data, w, h, step) {
    let n = 0;
    for (let py = 0; py < h; py += step) {
      const row = py * w;
      for (let px = 0; px < w; px += step) {
        if ((data[row + px] >>> 24) > 140) n++;
      }
    }
    return n;
  }

  /* ── the flight ──────────────────────────────────────── */

  /**
   * @param {object} a  fragments of the old text
   * @param {object} b  fragments of the new text
   * @param {() => void} reveal  brings the real text back, mid-fade
   */
  static #play(a, b, w, h, reveal, token) {
    const n = Math.max(a.n, b.n);
    if (!n) { reveal(); return; }

    const sx = new Float32Array(n), sy = new Float32Array(n);
    const tx = new Float32Array(n), ty = new Float32Array(n);
    const cx = new Float32Array(n), cy = new Float32Array(n);
    const col = new Uint32Array(n), dl = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const hasA = i < a.n;
      const hasB = i < b.n;
      const jx = (Math.random() - 0.5) * ParticleSwap.SPREAD * 2;
      const jy = (Math.random() - 0.5) * ParticleSwap.SPREAD;

      // a fragment with no counterpart drifts in or out of the cloud
      sx[i] = hasA ? a.x[i] : (hasB ? b.x[i] + jx : w / 2);
      sy[i] = hasA ? a.y[i] : (hasB ? b.y[i] + jy : h / 2);
      tx[i] = hasB ? b.x[i] : sx[i] + jx;
      ty[i] = hasB ? b.y[i] : sy[i] + jy;

      const angle = Math.random() * Math.PI * 2;
      const reach = ParticleSwap.SPREAD * (0.35 + Math.random() * 0.8);
      cx[i] = (sx[i] + tx[i]) / 2 + Math.cos(angle) * reach;
      cy[i] = (sy[i] + ty[i]) / 2 + Math.sin(angle) * reach * 0.7;

      col[i] = hasB ? b.c[i] : a.c[i];
      dl[i] = Math.random() * 0.28;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'particles';
    canvas.width = w;
    canvas.height = h;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const frame = ctx.createImageData(w, h);
    const buffer = new Uint32Array(frame.data.buffer);

    const size = Math.max(a.step ?? 3, b.step ?? 3);
    const start = performance.now();
    let handedOver = false;

    const tick = now => {
      if (ParticleSwap.#token !== token) { canvas.remove(); return; }
      const life = Math.min(1, (now - start) / ParticleSwap.DURATION);
      buffer.fill(0);

      // The last stretch is a hand-over: the real text fades up underneath
      // while the fragments fade out on top, so nothing appears from nowhere.
      const handover = life < ParticleSwap.HANDOVER
        ? 1
        : 1 - (life - ParticleSwap.HANDOVER) / (1 - ParticleSwap.HANDOVER);

      if (!handedOver && life >= ParticleSwap.HANDOVER) {
        handedOver = true;
        reveal();
      }

      for (let i = 0; i < n; i++) {
        let t = (life - dl[i]) / (1 - dl[i]);
        if (t <= 0) continue;
        const e = t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;

        const u = 1 - e;
        const px = (u * u * sx[i] + 2 * u * e * cx[i] + e * e * tx[i]) | 0;
        const py = (u * u * sy[i] + 2 * u * e * cy[i] + e * e * ty[i]) | 0;
        if (px <= -size || py <= -size || px >= w || py >= h) continue;

        // dimmest halfway, where it is a cloud
        const fade = (1 - 0.55 * Math.sin(Math.PI * e)) * handover;
        const c = col[i];
        const pixel = ((((c >>> 24) * fade) | 0) << 24) | (c & 0x00ffffff);

        for (let oy = 0; oy < size; oy++) {
          const yy = py + oy;
          if (yy < 0 || yy >= h) continue;
          const row = yy * w;
          for (let ox = 0; ox < size; ox++) {
            const xx = px + ox;
            if (xx < 0 || xx >= w) continue;
            buffer[row + xx] = pixel;
          }
        }
      }

      ctx.putImageData(frame, 0, 0);

      if (life < 1) requestAnimationFrame(tick);
      else { canvas.remove(); reveal(); }
    };

    requestAnimationFrame(tick);
  }

  /** Hook the caller sets, so this module need not know about the splitter. */
  static flatten = null;

  /* ── page to page ────────────────────────────────────── */

  /**
   * @param {HTMLElement[]} fromEls text leaving
   * @param {HTMLElement[]} toEls   text arriving
   */
  static run(fromEls, toEls) {
    const token = ParticleSwap.#begin();

    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      for (const el of toEls) {
        ParticleSwap.#restore(el);
        ParticleSwap.#hidden.delete(el);
        el.classList.add('settling');
        setTimeout(() => el.classList.remove('settling'), 440);
      }
      for (const el of fromEls) ParticleSwap.#hidden.delete(el);
    };

    if (ParticleSwap.calm) { reveal(); return; }

    const w = Math.floor(innerWidth);
    const h = Math.floor(innerHeight);

    const a = ParticleSwap.#sample(fromEls, w, h);
    for (const el of toEls) ParticleSwap.#hide(el);
    const b = ParticleSwap.#sample(toEls, w, h);
    for (const el of fromEls) ParticleSwap.#hide(el);

    // The split characters were only needed to read the glyph rectangles.
    // Leaving them in the document triples the cost of restyling the page.
    ParticleSwap.flatten?.([...fromEls, ...toEls]);

    ParticleSwap.#play(a, b, w, h, reveal, token);
  }

  /* ── same elements, new wording ──────────────────────── */

  /**
   * @param {{el:HTMLElement,text:string}[]} pairs
   * @param {(el:HTMLElement)=>void} split  rebuilds the character spans
   */
  static retext(pairs, split) {
    const els = pairs.map(p => p.el);
    if (!els.length) return;

    const apply = () => {
      for (const { el, text } of pairs) { el.dataset.raw = text; split(el); }
    };

    if (ParticleSwap.calm) { apply(); return; }

    const token = ParticleSwap.#begin();
    const w = Math.floor(innerWidth);
    const h = Math.floor(innerHeight);

    const a = ParticleSwap.#sample(els, w, h);
    apply();
    for (const el of els) ParticleSwap.#hide(el);
    const b = ParticleSwap.#sample(els, w, h);

    let shown = false;
    const reveal = () => {
      if (shown) return;
      shown = true;
      for (const el of els) {
        ParticleSwap.#restore(el);
        ParticleSwap.#hidden.delete(el);
        el.classList.add('settling');
        setTimeout(() => el.classList.remove('settling'), 440);
      }
    };

    ParticleSwap.#play(a, b, w, h, reveal, token);
  }
}
