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

  static #glyph(ch) {
    if (ch === undefined || ch === '' || ch === ' ') return '\u00A0';
    return ch;
  }

  #cell(from, to) {
    const cell = document.createElement('span');
    cell.className = 'odo-cell';
    const strip = document.createElement('span');
    strip.className = 'odo-strip';

    const a = document.createElement('span');
    const b = document.createElement('span');
    a.textContent = Odometer.#glyph(from);
    b.textContent = Odometer.#glyph(to);
    strip.append(a, b);
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

    const cells = chars.map((ch, i) => {
      if (existing[i] && existing[i].dataset.ch === ch) return existing[i];
      const { cell, strip } = this.#cell(old[i], ch);
      rolling.push({ strip, delay: i * Odometer.STAGGER });
      return cell;
    });

    this.el.replaceChildren(...cells);

    // two frames: one for the browser to lay the new cells out, one for the
    // transition to have a starting value to move away from
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (this._run !== run) return;
      for (const { strip, delay } of rolling) {
        strip.style.transitionDelay = `${delay}ms`;
        strip.classList.add('roll');

        setTimeout(() => {
          // a newer value took over, or this cell was thrown away: leave it be
          if (this._run !== run || !strip.isConnected) return;
          // settle without animating: the window now holds only the new glyph
          const shown = strip.lastElementChild.textContent;
          strip.classList.add('settled');
          strip.classList.remove('roll');
          strip.firstElementChild.textContent = shown;
          strip.lastElementChild.textContent = shown;
          requestAnimationFrame(() => strip.classList.remove('settled'));
        }, Odometer.DURATION + delay + 30);
      }
    }));
  }
}
