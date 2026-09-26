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

  /** Letters while the page is short enough to afford them. */
  static #granularity(items) {
    const load = items.reduce((n, it) => n + it.from.length + it.text.length, 0);
    const budget = innerWidth < 760 ? 160 : 280;
    return load > budget;
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
      items.push({ el, text, from, token, style: getComputedStyle(el) });
    }
    if (!items.length) return;

    // 0 — width of the wording as one run of text. Split into inline-block
    //     letters it measures a fraction differently — enough for a centred
    //     button to shift sideways at the first and last frame.
    for (const it of items) it.plain0 = it.el.getBoundingClientRect().width;

    const byWord = Flip.#granularity(items);

    // 1 — read where the old pieces are, then get them out of the flow
    for (const it of items) it.oldCells = Flip.#cells(it.el, it.from, byWord);
    for (const it of items) {
      it.height0 = it.el.getBoundingClientRect().height;
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
    for (const it of items) {
      /* Nothing split stays in the container. Hundreds of inline-blocks make
         every single layout expensive, and a height transition asks for one
         on every frame — that alone was most of the cost of a switch. */
      it.el.textContent = it.text;
      it.plain1 = it.el.getBoundingClientRect().width;
      it.height1 = it.el.getBoundingClientRect().height;
      it.el.style.visibility = 'hidden';
    }

    // 3 — carry the boxes across, so that whatever follows drifts rather
    //     than jumping: paragraphs by height, buttons by width
    const travel = `${Flip.SWEEP + Flip.HALF}ms ${Flip.#ease}`;

    for (const it of items) {
      const parts = [];
      if (it.blockish && it.height0 && it.height1 && it.height0 !== it.height1) {
        it.el.style.height = `${it.height0}px`;
        parts.push(`height ${travel}`);
      }
      if (it.plain0 && it.plain1 && it.plain0 !== it.plain1) {
        it.el.style.whiteSpace = 'nowrap';
        it.el.style.overflow = 'hidden';
        it.el.style.width = `${it.plain0}px`;
        parts.push(`width ${travel}`);
      }
      if (!parts.length) continue;

      void it.el.offsetWidth;
      it.el.style.transition = parts.join(', ');
      if (it.height1) it.el.style.height = it.height1 !== it.height0 ? `${it.height1}px` : it.el.style.height;
      if (it.plain1 !== it.plain0) it.el.style.width = `${it.plain1}px`;
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

    /* The resting position is written inline and the animation only supplies
       the frames before it, with `backwards` fill. An animation left filling
       forwards stays active on its element, and with a page of letters that
       is hundreds of live animations asking for style work every frame. */
    const letter = (it, spot, from) => {
      if (!spot.ch.trim()) return;
      const to = from ? 0 : 90;
      const cell = document.createElement('span');
      cell.className = 'flip';
      cell.textContent = spot.ch;
      cell.style.cssText =
        `position:absolute;left:${spot.x}px;top:${spot.y}px;` +
        `font:${it.style.font};color:${it.style.color};` +
        `letter-spacing:${it.style.letterSpacing};line-height:${spot.h}px;` +
        `transform:${Flip.#turn(to)};`;
      layer.appendChild(cell);

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
      for (const spot of it.oldSpots) letter(it, spot, 0);    // turns away
      for (const spot of it.newSpots) letter(it, spot, -90);  // turns in
    }

    setTimeout(() => {
      // the layer already stands where the real text will be, so the swap
      // cannot be seen
      for (const it of items) {
        if (it.el._flip !== it.token) continue;
        it.el.dataset.raw = it.text;
        it.el.style.visibility = '';
        it.el.style.height = '';
        it.el.style.width = '';
        it.el.style.whiteSpace = '';
        it.el.style.overflow = '';
        it.el.style.transition = '';
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
