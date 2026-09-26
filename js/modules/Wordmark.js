/**
 * Keeps the studio name on one line per row, whatever the viewport.
 *
 * `scrollWidth` is useless here: with `overflow: visible` it equals
 * `clientWidth`, so the text is measured at `width: max-content` instead.
 * Re-runs once the web font has loaded, because a fallback monospace is
 * wider and would otherwise decide the size.
 */
export class Wordmark {
  /** @param {HTMLElement} el */
  constructor(el) {
    this.el = el;
    this.secondLine = el.querySelector('.wm-2');

    this.fit();
    addEventListener('resize', () => this.fit());
    if (document.fonts?.ready) document.fonts.ready.then(() => this.fit());
  }

  /** @param {string} tracking letter-spacing to try */
  #measure(tracking) {
    const { el } = this;
    el.style.letterSpacing = tracking;
    el.style.textIndent = tracking;
    if (this.secondLine) {
      this.secondLine.style.letterSpacing = '';
      this.secondLine.style.textIndent = '';
    }

    const limit = Math.min(
      el.parentElement.clientWidth,
      document.documentElement.clientWidth - 48
    );

    el.style.width = 'max-content';
    let size = Wordmark.MAX_SIZE;
    el.style.fontSize = `${size}px`;
    while (el.offsetWidth > limit && size > Wordmark.MIN_SIZE) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
    el.style.width = '';
    return size;
  }

  fit() {
    if (!this.el.parentElement?.clientWidth) return;
    // Tight tracking is the fallback: better than a microscopic wordmark.
    if (this.#measure('.3em') < 15) this.#measure('.16em');
  }
}

Wordmark.MAX_SIZE = 27;
Wordmark.MIN_SIZE = 7;
