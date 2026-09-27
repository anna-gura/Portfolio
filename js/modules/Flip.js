/**
 * Language change, in three movements.
 *
 *   1. A wave crosses the screen from left to right and turns the old wording
 *      away on its vertical axis, each piece in place.
 *   2. Only then do the boxes move: a button narrows to its new label, a note
 *      settles, the paragraphs below shift up.
 *   3. A second wave brings the new wording back, again in place.
 *
 * Nothing ever turns and travels at once, which is what makes this both
 * cheaper and steadier than doing it all together: text never has to be kept
 * in step with a box moving underneath it, so there is nothing left to drift.
 *
 * The rest of the decisions:
 *
 *  - Positions are read with a Range over the real text, never by splitting it
 *    into elements first. Split text lays out a fraction differently, and the
 *    last frame then fails to line up with the text that replaces it.
 *  - Timing comes from a piece's position on screen, not its index, so the
 *    wave sweeps rather than queues.
 *  - A piece is removed the moment it finishes turning, and the pieces of a
 *    movement are not built until that movement begins. Nothing invisible is
 *    left on the page.
 *  - Boxes move by transform, never by width or height: animating a size asks
 *    the browser to lay the page out on every frame.
 */
export class Flip {
  static HALF = 200;        // ms for one half-turn
  static SWEEP = 360;       // ms for a wave to cross the screen
  static BOX = 380;         // ms for the boxes to move between the two waves
  static TAIL = 80;         // ms of slack at the end
  static HANDOVER = 140;    // ms the copies take to fade off the real text
  static LOAD = 160;        // characters above which whole words turn instead

  static #ease = 'cubic-bezier(.45,0,.55,1)';

  /* Perspective belongs to each letter, not to the block. With one vanishing
     point for a whole paragraph, letters far from it are seen at an angle and
     never turn fully edge-on. */
  static #turn = deg => `perspective(520px) rotateY(${deg}deg)`;

  /* ── measuring ───────────────────────────────────────── */

  /**
   * Where each piece of text sits, read straight off the live layout.
   * @param {HTMLElement} el
   * @param {boolean} byWord  whole words rather than single letters
   */
  static #spots(el, byWord) {
    const spots = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();

    for (let node; (node = walker.nextNode());) {
      const text = node.data;
      if (byWord) {
        for (const m of text.matchAll(/\S+/g)) {
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const r = range.getBoundingClientRect();
          if (r.width) spots.push({ ch: m[0], x: r.left, y: r.top, h: r.height });
        }
        continue;
      }
      for (let i = 0; i < text.length; i++) {
        if (!text[i].trim()) continue;
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width) spots.push({ ch: text[i], x: r.left, y: r.top, h: r.height });
      }
    }
    return spots;
  }

  /**
   * The angle a line of text lies at, counting every ancestor. A note pinned
   * at a slant rotates its text with it.
   */
  static #tilt(el) {
    let m = new DOMMatrix();
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const own = getComputedStyle(node).transform;
      if (own && own !== 'none') m = new DOMMatrix(own).multiply(m);
    }
    return Math.atan2(m.b, m.a);
  }

  /** Containers with a visible surface of their own. */
  static BOXED = '.btn, .sticker-wrap, .polaroid';

  /**
   * The only boxes worth animating are the ones you can see: a button, a note,
   * a print. Paragraphs and headings carry no surface, and the moment the page
   * re-flows every piece of text on it is turned edge-on and invisible — so
   * their shift is not there to be seen, and nothing has to be spent on it.
   */
  static #boxes(items) {
    const roots = new Set();
    for (const it of items) roots.add(it.el.closest('.page, .hero, .wrap') ?? document.body);

    const found = [];
    for (const root of roots) {
      for (const el of root.querySelectorAll(Flip.BOXED)) {
        const was = el.getBoundingClientRect();
        if (!was.width || !was.height) continue;
        const own = getComputedStyle(el).transform;
        found.push({
          el, was,
          // objects lie at an angle of their own; writing `transform` outright
          // would straighten them out for the length of the animation
          base: own === 'none' ? '' : ` ${own}`,
          scalable: true
        });
      }
    }
    return found;
  }

  /* ── the change ──────────────────────────────────────── */

  /** A short-lived layer for one wave of turning text. */
  static #layer() {
    const layer = document.createElement('div');
    layer.className = 'flip-layer';
    document.body.appendChild(layer);
    return layer;
  }

  /**
   * One wave. Builds the pieces, turns them, and takes each away as it
   * finishes.
   *
   * @param {object[]} items
   * @param {HTMLElement} layer
   * @param {boolean} byWord
   * @param {boolean} arriving  false turns the old text away, true brings the
   *                            new text back
   */
  static #wave(items, layer, byWord, arriving) {
    const all = items.map(it => ({ it, spots: Flip.#spots(it.el, byWord) }));

    for (const { it, spots } of all) {
      if (!spots.length) continue;

      /* The wave is measured across this block alone, not across the page.
         Timed globally, a heading in the left column would always be a long
         way ahead of the paragraph beside it; every block should start the
         moment the switch is pressed and sweep within itself. */
      const xs = spots.map(s => s.x);
      const left = Math.min(...xs);
      const span = Math.max(1, Math.max(...xs) - left);
      const at = x => ((x - left) / span) * Flip.SWEEP;

      const rect = it.el.getBoundingClientRect();
      const wrap = document.createElement('div');
      wrap.className = 'flip-ride';
      wrap.style.left = `${rect.left}px`;
      wrap.style.top = `${rect.top}px`;
      // a note pinned at a slant turns its text with it
      if (it.tilt) wrap.style.transform = `rotate(${(it.tilt * 180 / Math.PI).toFixed(2)}deg)`;
      layer.appendChild(wrap);

      const cos = Math.cos(-it.tilt);
      const sin = Math.sin(-it.tilt);
      const from = arriving ? -90 : 0;
      const to = arriving ? 0 : 90;

      for (const spot of spots) {
        /* Measured on screen, where the line is already tilted; the wrapper
           is tilted too, so the offsets are turned back by the same angle. */
        const ox = spot.x - rect.left;
        const oy = spot.y - rect.top;

        const cell = document.createElement('span');
        cell.className = 'flip';
        cell.textContent = spot.ch;
        cell.style.cssText =
          `position:absolute;left:${(ox * cos - oy * sin).toFixed(2)}px;` +
          `top:${(ox * sin + oy * cos).toFixed(2)}px;` +
          `font:${it.font};color:${it.colour};` +
          `letter-spacing:${it.tracking};line-height:${spot.h}px;` +
          `transform:${Flip.#turn(to)};`;
        wrap.appendChild(cell);

        const anim = cell.animate(
          [{ transform: Flip.#turn(from) }, { transform: Flip.#turn(to) }],
          { duration: Flip.HALF, delay: at(spot.x), easing: Flip.#ease, fill: 'backwards' }
        );

        /* A piece turning away is gone the moment it is edge-on — there is
           nothing left to see and no reason to keep it.

           A piece turning back has to stay. It is the only visible text until
           the real one is uncovered at the end of the wave; taken away as
           soon as it lands, it leaves a hole where the word should be. */
        if (!arriving) anim.onfinish = () => cell.remove();
      }

    }
  }

  /**
   * @param {{el:HTMLElement,text:string}[]} pairs
   */
  static batch(pairs) {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const items = [];
    for (const { el, text } of pairs) {
      const from = el.dataset.raw ?? el.textContent;
      const token = (el._flip ?? 0) + 1;
      el._flip = token;

      if (calm || from === text) {
        el.textContent = text;
        el.dataset.raw = text;
        continue;
      }
      const style = getComputedStyle(el);
      items.push({
        el, text, from, token,
        tilt: Flip.#tilt(el),
        /* Text written straight on the paper has no box to wait for: only
           labels that live inside something with edges of its own — a button,
           a note, a print — hold back until that thing has finished moving. */
        boxed: Boolean(el.closest('.btn, .sticker-wrap, .polaroid')),
        // read now: the element's own colour is about to be made transparent
        colour: style.color,
        font: style.font,
        tracking: style.letterSpacing
      });
    }
    if (!items.length) return;

    const load = items.reduce((n, it) => n + it.from.length + it.text.length, 0);
    const byWord = load > Flip.LOAD;
    const alive = () => items.filter(it => it.el._flip === it.token);

    /* ── one: the old wording turns away where it stands ── */
    const leaving = Flip.#layer();
    Flip.#wave(items, leaving, byWord, false);
    for (const it of items) it.el.style.color = 'transparent';

    setTimeout(() => {
      leaving.remove();
      if (!alive().length) return;

      /* ── two: now the boxes move ── */
      const boxes = Flip.#boxes(items);
      for (const it of items) it.el.textContent = it.text;
      for (const box of boxes) box.now = box.el.getBoundingClientRect();

      const centre = r => [r.left + r.width / 2, r.top + r.height / 2];
      const moving = [];
      const running = [];

      for (const box of boxes) {
        const [wx, wy] = centre(box.was);
        const [nx, ny] = centre(box.now);
        let dx = wx - nx;
        let dy = wy - ny;

        /* Transforms of nested elements add up. Everything an ancestor
           already carries is taken off; inside one that is being scaled there
           is nothing left to do, since the scale carries its children. */
        let inherited = false;
        for (const m of moving) {
          if (m.el === box.el || !m.el.contains(box.el)) continue;
          if (m.scaled) { inherited = true; break; }
          dx -= m.dx;
          dy -= m.dy;
        }
        if (inherited) continue;

        const sx = box.scalable && box.now.width > 1 ? box.was.width / box.now.width : 1;
        const sy = box.scalable && box.now.height > 1 ? box.was.height / box.now.height : 1;
        const resized = Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && !resized) continue;

        moving.push({ el: box.el, dx, dy, scaled: resized });
        running.push(box.el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})${box.base}` },
            { transform: box.base.trim() || 'none' }
          ],
          { duration: Flip.BOX, easing: Flip.#ease, fill: 'backwards' }
        ));
      }

      /* ── three: the new wording turns back into view ── */
      const arrive = (group, wait) => {
        if (!group.length) return;
        setTimeout(() => {
          const still = group.filter(it => it.el._flip === it.token);
          if (!still.length) return;

          const layer = Flip.#layer();
          Flip.#wave(still, layer, byWord, true);

          setTimeout(() => {
            layer.remove();
            for (const it of still) {
              if (it.el._flip !== it.token) continue;
              it.el.dataset.raw = it.text;
              it.el.style.color = '';
            }
          }, Flip.SWEEP + Flip.HALF + Flip.TAIL);
        }, wait);
      };

      const here = alive();
      arrive(here.filter(it => !it.boxed), 0);          // paper text, at once
      arrive(here.filter(it => it.boxed), Flip.BOX);    // labels, once settled
    }, Flip.SWEEP + Flip.HALF);
  }

  /** Bring a group back into view. */
  static #arrive(items, byWord) {
    const still = items.filter(it => it.el._flip === it.token);
    if (!still.length) return;

    const layer = Flip.#layer();
    Flip.#wave(still, layer, byWord, true);

    setTimeout(() => {
      /* The copies sit at their own fractional coordinates; the real text is
         laid out with kerning. Swapping one for the other outright moves every
         letter by a fraction of a pixel at once, which reads as a twitch. So
         the real text is uncovered underneath and the copies fade off it. */
      for (const it of still) {
        if (it.el._flip !== it.token) continue;
        it.el.dataset.raw = it.text;
        it.el.style.color = '';
      }

      layer
        .animate([{ opacity: 1 }, { opacity: 0 }], { duration: Flip.HANDOVER, easing: 'linear' })
        .finished.then(() => layer.remove(), () => layer.remove());
    }, Flip.SWEEP + Flip.HALF + Flip.TAIL);
  }

  /** One element on its own. */
  static run(el, text) {
    Flip.batch([{ el, text }]);
  }

  /** How long a change takes, for anything that has to wait for it. */
  static duration() {
    return (Flip.SWEEP + Flip.HALF) * 2 + Flip.BOX + Flip.TAIL + Flip.HANDOVER + 60;
  }
}
