/**
 * The trailing half of a heading ("Tools" + " are free").
 *
 * Characters are pre-split at start-up so nothing flashes as plain text
 * before its first animation. Each one drifts in from a blurred, scattered
 * position with its own delay, which reads as condensing out of mist
 * rather than a block sliding into place.
 */
export class MistText {
  static OUT = 430;   // ms the old wording needs to disperse

  /** @param {HTMLElement|null} el */
  constructor(el) {
    this.el = el;
    this.calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.spans = [];
    if (el) this.prepare();
  }

  /** Rebuild the character spans in their scattered, invisible state. */
  prepare() {
    const el = this.el;
    if (!el) return;

    const text = el.dataset.raw !== undefined ? el.dataset.raw : el.textContent;
    el.dataset.raw = text;
    el.textContent = '';
    el.classList.add('ready');
    this.spans = [];
    if (!text) return;

    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'pt';
      span.textContent = ch;
      span.style.setProperty('--dx', `${(Math.random() * 48 + 12).toFixed(1)}px`);
      span.style.setProperty('--dy', `${((Math.random() - 0.5) * 36).toFixed(1)}px`);
      span.style.setProperty('--rot', `${((Math.random() - 0.5) * 28).toFixed(1)}deg`);
      span.style.transitionDelay = `${(Math.random() * 280).toFixed(0)}ms`;
      this.spans.push(span);
      el.appendChild(span);
    }
  }

  /** Gather the characters into place. */
  show() {
    if (!this.el) return;
    this.el.classList.remove('leaving');
    this.prepare();
    if (!this.spans.length) return;
    if (this.calm) {
      this.spans.forEach(s => s.classList.add('on'));
      return;
    }
    void this.el.offsetWidth;   // start the transition from the scattered state
    this.spans.forEach(s => s.classList.add('on'));
  }

  /** Scatter them back — the arrival played backwards. */
  hide() {
    if (!this.el) return;

    /* Anything that rewrites the element leaves plain text behind: a language
       change, say. The particles are rebuilt here rather than straight after
       that, where the rebuild would play as a second arrival. */
    if (!this.el.querySelector('.pt')) {
      MistText.settle(this.el);
      void this.el.offsetWidth;
    }
    this.el.classList.add('leaving');
    for (const span of this.el.querySelectorAll('.pt')) {
      span.style.transitionDelay = `${(Math.random() * 110).toFixed(0)}ms`;
      span.classList.remove('on');
    }
  }

  /**
   * Replace the text of any element with the same effect: the old wording
   * scatters into blur, the new one condenses out of it.
   *
   * This is the animation used for every language switch on the site.
   */
  static swap(el, text) {
    if (!el) return;
    const token = (el._mist ?? 0) + 1;
    el._mist = token;

    const mist = new MistText(el);
    mist.hide();

    setTimeout(() => {
      if (el._mist !== token) return;    // a newer switch took over
      delete el.dataset.raw;
      el.textContent = text;
      const fresh = new MistText(el);
      fresh.show();
    }, MistText.OUT);
  }

  /**
   * Rebuild the particles in their gathered state, without animating.
   *
   * Needed after anything that replaces the element's contents with plain
   * text — a language switch, say. Without it the element has nothing to
   * scatter, and the next page turn takes the words away with no animation
   * at all.
   */
  static settle(el) {
    if (!el) return;
    const mist = new MistText(el);
    el.classList.remove('leaving');
    // straight to the gathered state: with the transition live this would
    // play the arrival a second time
    for (const span of mist.spans) {
      span.style.transition = 'none';
      span.classList.add('on');
    }
    requestAnimationFrame(() => {
      for (const span of mist.spans) span.style.transition = '';
    });
  }

  /** Forget the cached source text, e.g. after a language switch. */
  reset() {
    if (!this.el) return;
    delete this.el.dataset.raw;
    this.el.classList.remove('ready');
    this.prepare();
  }
}
