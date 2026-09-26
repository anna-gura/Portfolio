/**
 * Objects lying on the paper — prints and the sticky note — are screwed up
 * into a ball when a page turns, and open back out of it when one arrives.
 *
 * Real crumpling needs a mesh, which is far too much for a page turn. What
 * sells it instead is two cheap things happening together:
 *
 *  - the outline stops being a rectangle. A twelve-point clip-path is pulled
 *    inwards unevenly, so the edges go jagged the way folded paper does,
 *    rather than simply shrinking;
 *  - creases appear. A pair of hard-edged gradients at odd angles, multiplied
 *    over the object, read as folds catching the light.
 *
 * The base angle is read from the element, since every object already lies
 * slightly askew; hard-coding it would snap the first frame to zero.
 */
export class Crumple {
  static DURATION = 720;
  static STAGGER = 90;
  static EASING = 'cubic-bezier(.5,0,.3,1)';

  /* Twelve points around the edge: four along the top and bottom, two down
     each side. Fewer than this and the crumple looks like a polygon; more and
     it stops reading as paper at all. */
  static #EDGE = [
    [0, 0], [33, 0], [66, 0], [100, 0],
    [100, 33], [100, 66],
    [100, 100], [66, 100], [33, 100], [0, 100],
    [0, 66], [0, 33]
  ];

  static get calm() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  static #angle(el) {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    try {
      const m = new DOMMatrixReadOnly(t);
      return Math.atan2(m.b, m.a) * 180 / Math.PI;
    } catch { return 0; }
  }

  /**
   * Outline pulled `tight` of the way towards the middle, with `rough` per
   * cent of unevenness so no two folds land alike.
   */
  static #outline(tight, rough) {
    const points = Crumple.#EDGE.map(([x, y]) => {
      const jx = (Math.random() - 0.5) * rough;
      const jy = (Math.random() - 0.5) * rough;
      const cx = 50 + (x - 50) * (1 - tight) + jx * (1 - tight);
      const cy = 50 + (y - 50) * (1 - tight) + jy * (1 - tight);
      return `${cx.toFixed(1)}% ${cy.toFixed(1)}%`;
    });
    return `polygon(${points.join(',')})`;
  }

  /** The sheet of creases that fades in as the object folds. */
  static #creases(el) {
    const skin = document.createElement('i');
    skin.className = 'crease';
    skin.style.setProperty('--a', `${(Math.random() * 70 + 20).toFixed(0)}deg`);
    skin.style.setProperty('--b', `${(-Math.random() * 60 - 10).toFixed(0)}deg`);
    el.appendChild(skin);
    return skin;
  }

  static #play(els, reverse, delay = 0) {
    if (Crumple.calm) return;

    els.forEach((el, i) => {
      el._crumple?.cancel();
      el._crease?.remove();

      const a = Crumple.#angle(el);
      const skin = Crumple.#creases(el);
      el._crease = skin;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

      /* Only transform and opacity are animated: those the browser can hand
         to the compositor. Morphing a clip-path every frame, with blended
         creases on top, locks the main thread for seconds. */
      /* Paper being screwed up is wrung, not shrunk: it is twisted one way,
         then back, squeezed unevenly on each turn, and only then goes to
         nothing. The scales differ on the two axes for exactly that reason —
         a hand never closes evenly. */
      const frames = [
        { transform: `rotate(${a}deg) scale(1,1) skew(0deg,0deg)`,
          opacity: 1, offset: 0 },
        { transform: `rotate(${a - 11}deg) scale(.88,.78) skew(6deg,-4deg)`,
          opacity: 1, offset: .18 },
        { transform: `rotate(${a + 21}deg) scale(.58,.66) skew(-11deg,7deg)`,
          opacity: 1, offset: .38 },
        { transform: `rotate(${a - 17}deg) scale(.38,.28) skew(9deg,-9deg)`,
          opacity: .96, offset: .58 },
        { transform: `rotate(${a + 52}deg) scale(.16,.2) skew(-7deg,5deg)`,
          opacity: .8, offset: .78 },
        { transform: `rotate(${a + 96}deg) scale(0,0) skew(0deg,0deg)`,
          opacity: 0, offset: 1 }
      ];

      /* The silhouette tightens in a few discrete steps instead of being
         rasterised every frame: folded, then balled up, then a knot. */
      const steps = [
        Crumple.#outline(.10, 20),
        Crumple.#outline(.26, 32),
        Crumple.#outline(.44, 38)
      ];

      const options = {
        duration: Crumple.DURATION,
        delay: delay + i * Crumple.STAGGER,
        easing: Crumple.EASING,
        fill: 'both',
        direction: reverse ? 'reverse' : 'normal'
      };

      const anim = el.animate(frames, options);

      const start = options.delay;
      const marks = [.2, .45, .68];

      if (reverse) {
        el.style.clipPath = steps[2];
        marks.forEach((m, k) => setTimeout(
          () => { el.style.clipPath = steps[2 - k - 1] ?? ''; },
          start + Crumple.DURATION * (1 - m)));
      } else {
        marks.forEach((m, k) => setTimeout(
          () => { el.style.clipPath = steps[k]; },
          start + Crumple.DURATION * m));
      }
      const folds = skin.animate(
        [{ opacity: 0, transform: 'scale(1)', offset: 0 },
         { opacity: .5, transform: 'scale(1.1)', offset: .3 },
         { opacity: 1, transform: 'scale(1.5)', offset: .65 },
         { opacity: 1, transform: 'scale(2.2)', offset: 1 }],
        options
      );
      el._crumple = anim;

      const clean = () => {
        skin.remove();
        el.style.position = '';
        el.style.clipPath = '';
        el._crease = null;
      };

      if (reverse) {
        // hand the element back to the stylesheet, so hover still works
        anim.finished.then(() => { anim.cancel(); folds.cancel(); clean(); el._crumple = null; })
          .catch(() => { /* replaced by a newer turn */ });
      } else {
        // the ball stays gone; only the creases go, once the page has
        setTimeout(clean, options.delay + Crumple.DURATION + 300);
      }
    });
  }

  /** @param {HTMLElement[]} els */
  static out(els, delay = 0) { Crumple.#play(els, false, delay); }

  /** @param {HTMLElement[]} els */
  static in(els, delay = 0) { Crumple.#play(els, true, delay); }
}
