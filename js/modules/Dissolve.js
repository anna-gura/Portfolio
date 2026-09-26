/**
 * Text falls apart into particles on the spot and is gathered back from the
 * same particles — it never travels. Movement would read as sliding, which is
 * exactly what this replaces.
 *
 * Splitting is idempotent: every call rebuilds the particles from the stored
 * plain text, so an interrupted animation can never leave an element in a
 * state where the next one silently does nothing.
 */
export class Dissolve {
  static OUT = 620;      // ms for the old text to disperse
  static IN = 760;       // ms for the new one to gather

  static get calm() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Plain text of an element, whatever state it is in. */
  static textOf(el) {
    return el.dataset.raw ?? el.textContent;
  }

  /**
   * Rebuild the particles. Always safe to call.
   *
   * Characters are grouped into words. Loose inline-block letters let the
   * browser break a line anywhere at all — in the middle of a word, or with
   * nothing but a full stop left on the last line.
   */
  static split(el) {
    const text = Dissolve.textOf(el);
    el.dataset.raw = text;
    el.textContent = '';

    const chars = [...text];
    let word = null;

    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'dust';
      span.textContent = ch;
      // A ripple runs through the line rather than every glyph going at once,
      // with a little noise so the front is not a straight edge. Nothing moves
      // sideways: only blur, swelling and timing.
      const wave = (i / Math.max(1, chars.length - 1)) * 260;
      span.style.setProperty('--s', (1.1 + Math.random() * 0.22).toFixed(2));
      span.style.setProperty('--d', `${(wave + Math.random() * 90).toFixed(0)}ms`);

      if (ch === ' ') {
        word = null;
        el.appendChild(span);           // spaces are where lines may break
        return;
      }
      if (!word) {
        word = document.createElement('span');
        word.className = 'word';
        el.appendChild(word);
      }
      word.appendChild(span);
    });
  }

  /**
   * Put the plain text back.
   *
   * Split text is hundreds of extra elements, and every one of them has to be
   * restyled whenever anything document-wide changes — a theme switch, say.
   * Left split, a page costs three times as much to recolour as it should.
   */
  static flatten(el) {
    if (!el) return;
    const text = el.dataset.raw;
    if (text !== undefined && el.querySelector('.dust')) el.textContent = text;
  }

  /** Scatter. */
  static out(el) {
    if (!el) return;
    Dissolve.split(el);
    el.classList.remove('gathered');
    void el.offsetWidth;
    el.classList.add('scattered');
  }

  /** Gather, optionally as different text. */
  static in(el, text) {
    if (!el) return;
    if (text !== undefined) el.dataset.raw = text;
    Dissolve.split(el);

    if (Dissolve.calm) {
      el.classList.add('gathered');
      el.classList.remove('scattered');
      return;
    }
    el.classList.add('scattered');
    el.classList.remove('gathered');
    void el.offsetWidth;
    // two frames: the first lets the browser lay the particles out, the second
    // gives the transition a committed value to move away from. With one frame
    // the very first gather on a page silently snaps into place.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.classList.remove('scattered');
      el.classList.add('gathered');
    }));

    clearTimeout(el._flatten);
    el._flatten = setTimeout(() => Dissolve.flatten(el), Dissolve.IN + 400);
  }


  static pageIn(page) {
    page?.querySelectorAll('[data-dust]').forEach(el => Dissolve.in(el));
  }

}
