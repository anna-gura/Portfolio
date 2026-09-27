/**
 * Price readout that behaves like a counter: the old glyph rolls up out of a
 * fixed window while the new one arrives from below. Characters that did not
 * change stay put, so $950 → $970 rolls one digit rather than redrawing the
 * whole line.
 *
 * Every cell keeps the same markup before, during and after the roll. Letting
 * a finished cell collapse to a bare character changes its metrics slightly,
 * and with thousands separators in play that shows up as digits hopping
 * sideways.
 */
export class Odometer {
  static DURATION = 440;
  static STAGGER = 26;

  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    this.value = '';
    this.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.el.classList.add('odo');
  }

  /** Roll the same value again, for when the words around it change. */
  replay() {
    const value = this.value;
    // cells are reused when the glyph is unchanged, and on a replay every
    // glyph is unchanged — so they are cleared out first
    this.el.replaceChildren();
    this.value = '';
    this.set(value);
  }

  static #glyph(ch) {
    if (ch === undefined || ch === '' || ch === ' ') return '\u00A0';
    return ch;
  }

  #cell(from, to) {
    const cell = document.createElement('span');
    cell.className = 'odo-cell';
    const strip = document.createElement('span');
    strip.className = 'odo-strip';

    /* The arriving glyph is the one in flow, so the cell is exactly as wide
       as it will be when this is over. The leaving glyph hangs above it out
       of flow: were both in flow the cell would be as wide as the wider of
       the two and would narrow the moment the old one goes — every cell at
       its own moment, which is what makes the number jitter. */
    const arriving = document.createElement('span');
    const leaving = document.createElement('span');
    arriving.textContent = Odometer.#glyph(to);
    leaving.textContent = Odometer.#glyph(from);
    leaving.className = 'odo-past';
    strip.append(arriving, leaving);
    cell.appendChild(strip);
    cell.dataset.ch = to ?? '';
    return { cell, strip };
  }

  /** @param {string} next */
  set(next) {
    if (next === this.value) return;
    const run = (this._run ?? 0) + 1;
    this._run = run;
    const prev = this.value;
    this.value = next;

    if (this.calm) { this.el.textContent = next; return; }

    const chars = [...next];
    const old = [...prev];
    const existing = [...this.el.children];
    const rolling = [];

    /* Only the part that actually changed is rebuilt.

       "від $850" becoming "від $1 500" keeps its opening words and its last
       digits; just the middle is new. Matching the strings from one end alone
       shifts every position and re-rolls the whole line, which is far more
       movement than the change deserves. */
    let head = 0;
    while (head < chars.length && head < old.length && chars[head] === old[head]) head++;

    let tail = 0;
    while (tail < chars.length - head && tail < old.length - head
           && chars[chars.length - 1 - tail] === old[old.length - 1 - tail]) tail++;

    const cells = chars.map((ch, i) => {
      const fromTail = i >= chars.length - tail;
      const j = i < head ? i : (fromTail ? old.length - (chars.length - i) : -1);

      if (j >= 0 && existing[j] && existing[j].dataset.ch === ch) return existing[j];

      const { cell, strip } = this.#cell(old[i], ch);
      // a cell with nothing behind it is a new place in the line, not a
      // changed glyph: it opens up rather than appearing at full width
      rolling.push({ cell, strip, delay: (i - head) * Odometer.STAGGER, fresh: old[i] === undefined });
      return cell;
    });

    this.el.replaceChildren(...cells);

    // two frames: one for the browser to lay the new cells out, one for the
    // transition to have a starting value to move away from
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this._run !== run) return;

      /* Widths of the new places, read in one pass before anything animates. */
      for (const item of rolling) {
        if (item.fresh) item.width = item.cell.getBoundingClientRect().width;
      }

      for (const { cell, strip, delay, fresh, width } of rolling) {
        if (fresh && width) {
          cell.animate(
            [{ width: '0px' }, { width: `${width}px` }],
            { duration: Odometer.DURATION, delay, easing: 'cubic-bezier(.32,0,.2,1)', fill: 'backwards' }
          );
        }
        strip.style.transitionDelay = `${delay}ms`;
        strip.classList.add('odo-rolling');

        setTimeout(() => {
          // a newer value took over, or this cell was thrown away: leave it be
          if (this._run !== run || !strip.isConnected) return;
          /* Settle without animating, and drop the glyph that has rolled
             away. Left in place it is invisible but still text: the line
             copies out as "$$775500" and a screen reader says it twice. */
          strip.querySelector('.odo-past')?.remove();
        }, Odometer.DURATION + delay + 30);
      }
    }));
  }
}
