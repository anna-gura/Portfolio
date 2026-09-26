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

  /** Build word-grouped cells. Loose letters would let a line break mid-word. */
  static #cells(el, text) {
    el.textContent = '';
    const cells = [];
    let word = null;

    for (const ch of text) {
      const cell = document.createElement('span');
      cell.className = 'flip';
      cell.textContent = ch;
      cells.push(cell);

      if (ch === ' ') { word = null; el.appendChild(cell); continue; }
      if (!word) {
        word = document.createElement('span');
        word.className = 'word';
        el.appendChild(word);
      }
      word.appendChild(cell);
    }
    return cells;
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

    // 1 — the old wording, split where it already stands
    for (const it of items) {
      // Only true blocks get their height held. Doing it to an inline-block
      // span changes the line box it sits in, which shifts the whole line.
      it.blockish = ['block', 'flex', 'grid', 'list-item'].includes(it.style.display);

      it.oldCells = Flip.#cells(it.el, it.from);
    }
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      it.height0 = r.height;
      it.width0 = r.width;
      it.oldX = it.oldCells.map(c => c.getBoundingClientRect().left);
      it.kept = [...it.el.childNodes];
    }

    // 2 — the new wording everywhere at once, read, then withdrawn
    for (const it of items) it.probe = Flip.#cells(it.el, it.text);
    for (const it of items) {
      it.newSpots = it.probe.map(c => {
        const r = c.getBoundingClientRect();
        return { ch: c.textContent, x: r.left, y: r.top, h: r.height };
      });
      const r = it.el.getBoundingClientRect();
      it.height1 = r.height;
      it.width1 = r.width;
    }
    for (const it of items) it.el.replaceChildren(...it.kept);

    // 3 — carry the boxes across, so that whatever follows drifts rather
    //     than jumping: paragraphs by height, buttons by width
    const travel = `${Flip.SWEEP + Flip.HALF}ms ${Flip.#ease}`;

    for (const it of items) {
      if (it.blockish && it.height0 && it.height1 && it.height0 !== it.height1) {
        it.el.style.height = `${it.height0}px`;
        void it.el.offsetHeight;
        it.el.style.transition = `height ${travel}`;
        it.el.style.height = `${it.height1}px`;
      }

      // A button is as wide as its label, so its box travels too. No test of
      // display here: inside a flex container the browser turns inline-block
      // into block, and a width that actually changes is the honest signal.
      if (it.width0 && it.width1 && it.width0 !== it.width1) {
        // the label must not re-wrap while the box is still narrowing
        it.el.style.whiteSpace = 'nowrap';
        it.el.style.overflow = 'hidden';
        it.el.style.width = `${it.width0}px`;
        void it.el.offsetWidth;
        it.el.style.transition = `width ${travel}`;
        it.el.style.width = `${it.width1}px`;
      }
    }

    // 4 — one wave for the whole page, timed by position on screen
    const xs = items.flatMap(it => [...it.oldX, ...it.newSpots.map(s => s.x)])
      .filter(Number.isFinite);
    const left = Math.min(...xs);
    const span = Math.max(1, Math.max(...xs) - left);
    const at = x => ((Number.isFinite(x) ? x : left) - left) / span * Flip.SWEEP;

    const layer = document.createElement('div');
    layer.className = 'flip-layer';
    document.body.appendChild(layer);

    for (const it of items) {
      // old letters turn away in place
      it.oldCells.forEach((cell, i) => {
        cell.animate(
          [{ transform: Flip.#turn(0) }, { transform: Flip.#turn(90) }],
          { duration: Flip.HALF, delay: at(it.oldX[i]), easing: Flip.#ease, fill: 'forwards' }
        );
      });

      // new letters turn in on the layer, each pinned to its final place
      for (const spot of it.newSpots) {
        if (!spot.ch.trim()) continue;
        const ghost = document.createElement('span');
        ghost.className = 'flip';
        ghost.textContent = spot.ch;
        ghost.style.cssText =
          `position:absolute;left:${spot.x}px;top:${spot.y}px;` +
          `font:${it.style.font};color:${it.style.color};` +
          `letter-spacing:${it.style.letterSpacing};line-height:${spot.h}px;` +
          `transform:${Flip.#turn(-90)};`;
        layer.appendChild(ghost);

        ghost.animate(
          [{ transform: Flip.#turn(-90) }, { transform: Flip.#turn(0) }],
          {
            duration: Flip.HALF,
            delay: at(spot.x) + Flip.HALF,
            easing: Flip.#ease,
            fill: 'forwards'
          }
        );
      }
    }

    setTimeout(() => {
      // the layer already stands where the real text will be, so the swap
      // cannot be seen
      for (const it of items) {
        if (it.el._flip !== it.token) continue;
        it.el.textContent = it.text;
        it.el.dataset.raw = it.text;
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
