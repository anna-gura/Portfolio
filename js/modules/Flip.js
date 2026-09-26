/**
 * Language change: a wave crosses the text from left to right, turning every
 * character on its vertical axis. Behind the wave the old wording has turned
 * away; in front of it the new wording turns into view.
 *
 * Three decisions matter here.
 *
 * Timing is taken from a character's position on screen, not from its index.
 * A letter at the start of the second line would otherwise wait for the whole
 * first line, and the wave would look like a queue instead of a sweep.
 *
 * The old letters are lifted onto a fixed overlay at the coordinates they
 * already occupy, and the new wording is laid into the element underneath
 * them straight away. Each set is therefore pinned to its own positions: the
 * old text cannot be dragged along when a different translation re-wraps the
 * paragraph.
 *
 * The element's height is animated from the old one to the new one across the
 * sweep, so whatever sits below drifts into place instead of jumping.
 */
export class Flip {
  static HALF = 220;      // ms for one half-turn
  static SWEEP = 520;     // ms for the wave to cross the whole width
  static TAIL = 90;       // ms of slack before the plain text is restored

  static #ease = 'cubic-bezier(.45,0,.55,1)';

  /* Perspective belongs to each letter, not to the block.
     With one vanishing point for the whole paragraph, letters far from it are
     seen at an angle and never turn fully edge-on — at ninety degrees they
     still show a slanted face instead of disappearing. */
  static #turn = deg => `perspective(520px) rotateY(${deg}deg)`;

  /**
   * Split into the pieces that will turn.
   *
   * Every piece costs an element and an animation, and a page of copy runs to
   * many hundreds of letters — enough to drop frames on a phone. So a short
   * line turns letter by letter, which is the nicer effect, and a long one
   * turns word by word, which is a fifth of the work and reads almost the
   * same at arm's length.
   *
   * Letters are grouped into words either way: loose inline-blocks let the
   * browser break a line in the middle of a word.
   */
  static #cells(el, text, byWord) {
    el.textContent = '';
    const cells = [];
    let word = null;

    const push = (parent, content) => {
      const cell = document.createElement('span');
      cell.className = 'flip';
      cell.textContent = content;
      parent.appendChild(cell);
      cells.push(cell);
      return cell;
    };

    if (byWord) {
      for (const part of text.split(/(\s)/)) {
        if (!part) continue;
        if (/\s/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }
        const holder = document.createElement('span');
        holder.className = 'word';
        el.appendChild(holder);
        push(holder, part);
      }
      return cells;
    }

    for (const ch of text) {
      if (ch === ' ') { word = null; push(el, ch); continue; }
      if (!word) {
        word = document.createElement('span');
        word.className = 'word';
        el.appendChild(word);
      }
      push(word, ch);
    }
    return cells;
  }

  /**
   * The boxes that may move when the wording changes: the screen the text
   * lives on, and everything laid out inside it. Buttons are marked as
   * scalable — their width follows their label, and since the label is
   * invisible while it turns, stretching the box is not noticeable.
   */
  static #boxes(items) {
    const roots = new Set();
    for (const it of items) roots.add(it.el.closest('.page, .hero, .wrap') ?? document.body);

    const found = [];
    for (const root of roots) {
      // document order, so an outer box is always seen before what is in it
      for (const el of root.querySelectorAll('p, h1, h2, a, figure, button, div, span')) {
        if (el.classList.contains('flip') || el.classList.contains('word')) continue;
        if (found.length > 90) break;
        const was = el.getBoundingClientRect();
        if (!was.width || !was.height) continue;
        const own = getComputedStyle(el).transform;
        found.push({
          el, was,
          // objects lie at an angle of their own; an animation that writes
          // `transform` outright would straighten them out for its duration
          base: own === 'none' ? '' : ` ${own}`,
          // boxes whose size follows their label. Their lettering is invisible
          // while it turns, so stretching them cannot be seen
          scalable: el.matches('.btn, .sticker-wrap, .polaroid')
        });
      }
    }
    return found;
  }

  /** Letters while the page is short enough to afford them. */
  static #granularity(items) {
    const load = items.reduce((n, it) => n + it.from.length + it.text.length, 0);
    // one and the same budget on every screen: a desktop is not always the
    // faster machine, and the two should not look like different animations
    return load > 160;
  }

  /**
   * Change several elements at once.
   *
   * They are measured together: every new wording is put in place, the whole
   * layout is read, and only then is everything put back. Measuring one
   * element while its neighbour is still in the old language gives positions
   * that never come true, and the text jumps a line when it finally settles.
   *
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
        el, text, from, token, style,
        // read now: the element's own colour is about to be made transparent
        colour: style.color,
        font: style.font,
        tracking: style.letterSpacing
      });
    }
    if (!items.length) return;

    // 0 — width of the wording as one run of text. Split into inline-block
    //     letters it measures a fraction differently — enough for a centred
    //     button to shift sideways at the first and last frame.
    const byWord = Flip.#granularity(items);

    /* Everything on the screen that may shift when the wording changes.
       Their positions are taken now, while the old text is still in place. */
    const boxes = Flip.#boxes(items);

    for (const it of items) it.was = it.el.getBoundingClientRect();

    // 1 — read where the old pieces are, then get them out of the flow
    for (const it of items) it.oldCells = Flip.#cells(it.el, it.from, byWord);
    for (const it of items) {
      it.oldSpots = it.oldCells.map(c => {
        const r = c.getBoundingClientRect();
        return { ch: c.textContent, x: r.left, y: r.top, h: r.height };
      });
    }

    // 2 — the new wording everywhere at once, read, then left in place as
    //     plain text and simply hidden
    for (const it of items) it.newCells = Flip.#cells(it.el, it.text, byWord);
    for (const it of items) {
      it.newSpots = it.newCells.map(c => {
        const r = c.getBoundingClientRect();
        return { ch: c.textContent, x: r.left, y: r.top, h: r.height };
      });
    }
    /* Nothing split stays in the container. Hundreds of inline-blocks make
       every single layout expensive, and a height transition asks for one on
       every frame — that alone was most of the cost of a switch. */
    for (const it of items) it.el.textContent = it.text;

    /* Only the lettering goes: hiding the element itself would take a
       button's background and border with it. */
    for (const it of items) it.now = it.el.getBoundingClientRect();
    for (const it of items) it.el.style.color = 'transparent';

    // 3 — boxes travel by transform, never by width or height.
    //     Animating a size asks the browser to lay the page out on every
    //     frame; a transform costs it nothing. The final layout is already in
    //     place, so this only replays the move that has just happened.
    //
    //     Transforms of nested elements add up, and a box inside a box that
    //     is also moving would travel twice as far. So each one is measured
    //     against the nearest ancestor that is moving, and only what it does
    //     on its own is animated.
    /* Every final position is read first, in one pass. Reading one while an
       earlier box is already animating measures it through that transform,
       and the number comes out as the exact opposite of the truth. */
    for (const box of boxes) box.now = box.el.getBoundingClientRect();

    const moving = [];

    const centre = r => [r.left + r.width / 2, r.top + r.height / 2];

    for (const box of boxes) {
      // centres, not corners: a box that is also being scaled keeps its
      // middle in place, and its corner would give the wrong offset
      const [wx, wy] = centre(box.was);
      const [nx, ny] = centre(box.now);
      let dx = wx - nx;
      let dy = wy - ny;

      /* Transforms of nested elements add up, and a box may sit several
         levels deep. Everything its ancestors already carry is taken off, so
         only what it does on its own is left.

         Inside an ancestor that is being scaled there is nothing left to do:
         the scale already carries its children, corners and all. Animating
         them again tears them off the box they belong to. */
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
      box.el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})${box.base}` },
          { transform: box.base.trim() || 'none' }
        ],
        { duration: Flip.SWEEP + Flip.HALF, easing: Flip.#ease, fill: 'backwards' }
      );
    }

    // 4 — one wave for the whole page, timed by position on screen
    const xs = items.flatMap(it => [...it.oldSpots, ...it.newSpots].map(s => s.x))
      .filter(Number.isFinite);
    const left = Math.min(...xs);
    const span = Math.max(1, Math.max(...xs) - left);
    const at = x => ((Number.isFinite(x) ? x : left) - left) / span * Flip.SWEEP;

    const layer = document.createElement('div');
    layer.className = 'flip-layer';
    document.body.appendChild(layer);

    /* Each set of letters lives in a wrapper of its own, anchored to where
       that line of text sits — before the change for the old letters, after
       it for the new ones — and the wrapper travels the same path its text
       does. Pinned to the screen instead, the letters stay put while the box
       they belong to moves out from under them: a button ends up with its
       label hanging off one corner. */
    const ride = (it, rect, dx, dy, back) => {
      const wrap = document.createElement('div');
      wrap.className = 'flip-ride';
      wrap.style.left = `${rect.left}px`;
      wrap.style.top = `${rect.top}px`;
      layer.appendChild(wrap);

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        wrap.animate(
          back
            ? [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }]
            : [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px)` }],
          { duration: Flip.SWEEP + Flip.HALF, easing: Flip.#ease, fill: 'both' }
        );
      }
      return wrap;
    };

    const letter = (it, wrap, rect, spot, from) => {
      if (!spot.ch.trim()) return;
      const to = from ? 0 : 90;
      const cell = document.createElement('span');
      cell.className = 'flip';
      cell.textContent = spot.ch;
      cell.style.cssText =
        `position:absolute;left:${spot.x - rect.left}px;top:${spot.y - rect.top}px;` +
        `font:${it.font};color:${it.colour};` +
        `letter-spacing:${it.tracking};line-height:${spot.h}px;` +
        `transform:${Flip.#turn(to)};`;
      wrap.appendChild(cell);

      cell.animate(
        [{ transform: Flip.#turn(from) }, { transform: Flip.#turn(to) }],
        {
          duration: Flip.HALF,
          delay: at(spot.x) + (from ? Flip.HALF : 0),
          easing: Flip.#ease,
          fill: 'backwards'
        }
      );
    };

    for (const it of items) {
      const dx = it.now.left - it.was.left;
      const dy = it.now.top - it.was.top;

      const goes = ride(it, it.was, dx, dy, false);       // old text, on its way
      const comes = ride(it, it.now, -dx, -dy, true);     // new text, arriving

      for (const spot of it.oldSpots) letter(it, goes, it.was, spot, 0);
      for (const spot of it.newSpots) letter(it, comes, it.now, spot, -90);
    }

    setTimeout(() => {
      // the layer already stands where the real text will be, so the swap
      // cannot be seen
      for (const it of items) {
        if (it.el._flip !== it.token) continue;
        it.el.dataset.raw = it.text;
        it.el.style.color = '';
      }
      layer.remove();
    }, Flip.SWEEP + Flip.HALF * 2 + Flip.TAIL);
  }

  /** One element on its own. */
  static run(el, text) {
    Flip.batch([{ el, text }]);
  }

  /** How long a change takes, for anything that has to wait for it. */
  static duration() {
    return Flip.SWEEP + Flip.HALF * 2 + Flip.TAIL + 40;
  }
}
