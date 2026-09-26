/**
 * A button does not disappear with one page and reappear with the next: it
 * travels, changing shape and colour on the way.
 *
 * A copy does the travelling, so neither original has to be moved. The copy
 * carries both labels stacked on top of each other — the old one fading out,
 * the new one fading in — because the two rarely have the same width and
 * swapping the text outright would make the box stutter.
 *
 * The destination has to be measured in its final place, which means briefly
 * putting the arriving page where it will be, without a transition.
 */
export class ButtonFlight {
  static DURATION = 900;
  static GROW = 660;     // ms for a button to draw itself out of a dot
  static #token = 0;

  /** Geometry and look of a button, enough to clone it. */
  static #read(el) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      left: r.left, top: r.top, width: r.width, height: r.height,
      background: cs.backgroundColor,
      color: cs.color,
      border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
      radius: cs.borderTopLeftRadius,
      font: cs.font,
      letterSpacing: cs.letterSpacing,
      shadow: cs.boxShadow,
      label: el.textContent.trim()
    };
  }

  /**
   * The same, but where the button will be once its screen is in place.
   *
   * The cover is parked exactly one viewport above, so its final position is
   * arithmetic — no need to touch it. Putting it down for a measurement and
   * back again cancels the slide it is about to make.
   */
  static #readFinal(el) {
    const cover = el.closest('.hero');
    if (cover) {
      const shot = ButtonFlight.#read(el);
      if (cover.classList.contains('up')) shot.top += innerHeight;
      return shot;
    }

    const page = el.closest('.page');
    if (!page) return ButtonFlight.#read(el);

    const className = page.className;
    const visibility = page.style.visibility;
    page.style.transition = 'none';
    page.style.visibility = 'visible';
    page.classList.remove('past');
    page.classList.add('current');

    const shot = ButtonFlight.#read(el);

    page.className = className;
    page.style.visibility = visibility;
    void page.offsetWidth;
    page.style.transition = '';
    return shot;
  }

  /** Ghost shaped like the button, ready to be animated. */
  static #ghost(shot, label) {
    const ghost = document.createElement('div');
    ghost.className = 'btn-flight';
    ghost.innerHTML = `<span class="now">${label}</span>`;
    Object.assign(ghost.style, {
      left: `${shot.left}px`, top: `${shot.top}px`,
      width: `${shot.width}px`, height: `${shot.height}px`,
      background: shot.background, color: shot.color,
      border: shot.border, borderRadius: shot.radius,
      font: shot.font, letterSpacing: shot.letterSpacing,
      boxShadow: shot.shadow, transition: 'none'
    });
    document.body.appendChild(ghost);
    return ghost;
  }

  /**
   * Keyframes of a button drawing itself: a dot swells into a circle as tall
   * as the button, then the circle opens out sideways into the full shape.
   * Reversed, it is the same thing closing.
   */
  static #draw(shot) {
    const middle = shot.left + shot.width / 2;
    const d = shot.height;                       // the circle is as tall as the button
    return {
      box: [
        { left: `${middle - d / 2}px`, width: `${d}px`,
          borderRadius: '999px', transform: 'scale(.14)', opacity: 0, offset: 0 },
        { left: `${middle - d / 2}px`, width: `${d}px`,
          borderRadius: '999px', transform: 'scale(1)', opacity: 1, offset: .36 },
        { left: `${shot.left}px`, width: `${shot.width}px`,
          borderRadius: shot.radius, transform: 'scale(1)', opacity: 1, offset: 1 }
      ],
      label: [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: .55 },
        { opacity: 1, offset: 1 }
      ]
    };
  }

  /** The button on the arriving page has no counterpart: it draws itself in. */
  static appear(to, delay = 0) {
    if (!to || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const token = ++ButtonFlight.#token;
    const shot = ButtonFlight.#readFinal(to);
    const frames = ButtonFlight.#draw(shot);

    to.style.visibility = 'hidden';
    const ghost = ButtonFlight.#ghost(shot, shot.label);
    const options = {
      duration: ButtonFlight.GROW, delay,
      easing: 'cubic-bezier(.62,0,.14,1)', fill: 'both'
    };

    ghost.animate(frames.box, options);
    ghost.querySelector('.now').animate(frames.label, options);

    setTimeout(() => {
      if (ButtonFlight.#token !== token) return;
      to.style.visibility = '';
      ghost.remove();
    }, delay + ButtonFlight.GROW);
  }

  /** Nothing on the next page to travel to: the button closes back to a dot. */
  static vanish(from) {
    if (!from || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const token = ++ButtonFlight.#token;
    const shot = ButtonFlight.#read(from);
    const frames = ButtonFlight.#draw(shot);

    from.style.visibility = 'hidden';
    const ghost = ButtonFlight.#ghost(shot, shot.label);
    const options = {
      duration: ButtonFlight.GROW, easing: 'cubic-bezier(.62,0,.14,1)',
      fill: 'both', direction: 'reverse'
    };

    ghost.animate(frames.box, options);
    ghost.querySelector('.now').animate(frames.label, options);

    setTimeout(() => {
      if (ButtonFlight.#token !== token) return;
      from.style.visibility = '';
      ghost.remove();
    }, ButtonFlight.GROW);
  }

  /**
   * @param {HTMLElement|null} from  button leaving
   * @param {HTMLElement|null} to    button arriving
   */
  static run(from, to) {
    if (!from || !to || from === to) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const token = ++ButtonFlight.#token;
    const a = ButtonFlight.#read(from);
    const b = ButtonFlight.#readFinal(to);

    from.style.visibility = 'hidden';
    to.style.visibility = 'hidden';

    /* The two faces are clones of the real buttons rather than labels built
       from their text. Rebuilt text sits a fraction off — word spacing and
       padding are not the same once it is centred by hand — and that shows as
       a nudge on the first and last frame. A clone cannot be off. */
    const ghost = document.createElement('div');
    ghost.className = 'btn-flight';

    const face = (source, role) => {
      const clone = source.cloneNode(true);
      // keep the button's own classes: its padding and type are what put the
      // label exactly where it sits in the real thing
      clone.classList.add('flight-face', role);
      clone.removeAttribute('href');
      clone.removeAttribute('id');
      clone.style.cssText =
        'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'margin:0;visibility:visible;';
      return clone;
    };

    ghost.append(face(from, 'was'), face(to, 'now'));

    const put = s => Object.assign(ghost.style, {
      left: `${s.left}px`, top: `${s.top}px`,
      width: `${s.width}px`, height: `${s.height}px`,
      background: s.background, color: s.color,
      border: s.border, borderRadius: s.radius,
      font: s.font, letterSpacing: s.letterSpacing,
      boxShadow: s.shadow
    });

    put(a);
    document.body.appendChild(ghost);
    void ghost.offsetWidth;            // commit the starting frame
    put(b);
    ghost.classList.add('arrived');    // cross-fades the two labels

    setTimeout(() => {
      if (ButtonFlight.#token !== token) return;
      to.style.visibility = '';
      from.style.visibility = '';
      ghost.remove();
    }, ButtonFlight.DURATION);
  }
}
