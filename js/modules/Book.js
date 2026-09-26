/**
 * The album itself: a cover plus a stack of pages that turn one at a time.
 *
 * Every gesture advances exactly one page regardless of how hard it was
 * made, so the motion always reads the same. Input is locked for the length
 * of the animation to keep fast scrolling from queueing up page turns.
 */
export class Book {
  static TURN_MS = 1150;
  static WHEEL_THRESHOLD = 28;
  static SWIPE_THRESHOLD = 48;

  /**
   * @param {object} o
   * @param {HTMLElement} o.root   scroll surface
   * @param {HTMLElement} o.cover
   * @param {HTMLElement[]} o.pages
   * @param {(from:number,to:number)=>void} o.onTurn  runs before the classes change
   */
  constructor({ root, cover, pages, onTurn }) {
    this.root = root;
    this.cover = cover;
    this.pages = pages;
    this.onTurn = onTurn;

    this.index = 0;                 // 0 is the cover, 1..N are pages
    this.last = pages.length;
    this.locked = false;
    this.wait = matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 30 : Book.TURN_MS;

    this.#bindWheel();
    this.#bindTouch();
    this.#bindKeys();
  }

  /** @param {number} n */
  goto(n) {
    const target = Math.max(0, Math.min(this.last, n));
    if (this.locked || target === this.index) return;

    this.locked = true;
    const from = this.index;
    this.index = target;

    this.onTurn?.(from, target);
    this.render();

    setTimeout(() => { this.locked = false; }, this.wait);
  }

  next() { this.goto(this.index + 1); }
  prev() { this.goto(this.index - 1); }

  render() {
    this.cover.classList.toggle('up', this.index > 0);
    this.pages.forEach((page, i) => {
      const n = i + 1;
      page.classList.toggle('current', n === this.index);
      page.classList.toggle('past', n < this.index);
    });
  }

  #bindWheel() {
    let delta = 0;
    let timer;
    this.root.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.locked) return;
      delta += e.deltaY;
      clearTimeout(timer);
      timer = setTimeout(() => { delta = 0; }, 160);
      if (Math.abs(delta) > Book.WHEEL_THRESHOLD) {
        this.goto(this.index + Math.sign(delta));
        delta = 0;
      }
    }, { passive: false });
  }

  #bindTouch() {
    let startY = null;
    this.root.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
    }, { passive: true });

    this.root.addEventListener('touchend', e => {
      if (startY === null) return;
      const dy = startY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > Book.SWIPE_THRESHOLD) this.goto(this.index + Math.sign(dy));
      startY = null;
    }, { passive: true });
  }

  #bindKeys() {
    addEventListener('keydown', e => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); this.next(); }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); this.prev(); }
      if (e.key === 'Home') this.goto(0);
      if (e.key === 'End') this.goto(this.last);
    });
  }
}
