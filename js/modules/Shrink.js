/**
 * Objects lying on the paper — prints and the sticky note — shrink into their
 * own centre and are gone. Arriving, they grow back out of it: the same
 * motion played in reverse.
 *
 * Each object already lies at a slight angle, so the base rotation is read
 * from the element and kept; hard-coding it would snap the first frame
 * straight.
 */
export class Shrink {
  static DURATION = 520;
  static STAGGER = 80;
  static EASING = 'cubic-bezier(.5,0,.3,1)';

  static get calm() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** The angle an object is already lying at, in degrees. */
  static #angle(el) {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    try {
      const m = new DOMMatrixReadOnly(t);
      return Math.atan2(m.b, m.a) * 180 / Math.PI;
    } catch { return 0; }
  }

  static #play(els, reverse, delay = 0) {
    if (Shrink.calm) return;

    els.forEach((el, i) => {
      el._shrink?.cancel();
      const a = Shrink.#angle(el);

      const anim = el.animate(
        [
          { transform: `rotate(${a}deg) scale(1)`, opacity: 1, offset: 0 },
          { transform: `rotate(${a}deg) scale(.5)`, opacity: 1, offset: .55 },
          { transform: `rotate(${a}deg) scale(0)`, opacity: 0, offset: 1 }
        ],
        {
          duration: Shrink.DURATION,
          delay: delay + i * Shrink.STAGGER,
          easing: Shrink.EASING,
          fill: 'both',
          direction: reverse ? 'reverse' : 'normal'
        }
      );
      el._shrink = anim;

      if (reverse) {
        // hand the element back to the stylesheet, so hover still works
        anim.finished.then(() => { anim.cancel(); el._shrink = null; })
          .catch(() => { /* replaced by a newer turn */ });
      }
    });
  }

  /** @param {HTMLElement[]} els */
  static out(els, delay = 0) { Shrink.#play(els, false, delay); }

  /** @param {HTMLElement[]} els */
  static in(els, delay = 0) { Shrink.#play(els, true, delay); }
}
