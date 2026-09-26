/**
 * The fox blinks now and then. Long, irregular gaps: a mark that blinks on a
 * timer reads as a broken animation, one that blinks rarely reads as alive.
 */
export class FoxBlink {
  static MIN = 3000;
  static MAX = 6000;

  /** @param {SVGElement} svg */
  constructor(svg) {
    this.svg = svg;
    if (!svg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.#schedule();
  }

  #schedule() {
    const wait = FoxBlink.MIN + Math.random() * (FoxBlink.MAX - FoxBlink.MIN);
    setTimeout(() => {
      if (!document.hidden) this.#blink();
      this.#schedule();
    }, wait);
  }

  #blink() {
    this.svg.classList.add('blink');
    setTimeout(() => this.svg.classList.remove('blink'), 300);
    // once in a while a double blink, which is what actually happens
    if (Math.random() < 0.28) {
      setTimeout(() => {
        this.svg.classList.add('blink');
        setTimeout(() => this.svg.classList.remove('blink'), 300);
      }, 380);
    }
  }
}
