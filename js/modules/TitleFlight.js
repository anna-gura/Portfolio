/**
 * Moves a page title between the menu and the page heading.
 *
 * Going forward, the menu label lifts out of the rail and becomes the
 * heading; the heading being left behind travels back into the rail. A copy
 * ("ghost") does the travelling so that neither original has to be moved.
 *
 * Two details matter and both cost a whole evening if missed:
 *  - the ghost copies the padding of whatever it is imitating, otherwise the
 *    text jumps a couple of pixels at the moment of the swap;
 *  - the destination heading must be measured in its final position, which
 *    means briefly forcing the incoming page into place without a transition.
 */
export class TitleFlight {
  static DURATION = 1080;   // ms, matches the CSS transition on .ghost
  static MIST_LEAD = 400;   // the trailing words gather while the title is
                            // still on its way, not once it has landed

  /**
   * @param {object} o
   * @param {Rail} o.rail
   * @param {(n:number)=>HTMLElement|null} o.headingOf  base word of page n
   * @param {(n:number)=>MistText|null}    o.mistOf     trailing words of page n
   * @param {() => string[]} o.titles  current labels, language aware
   */
  constructor({ rail, headingOf, mistOf, titles }) {
    this.rail = rail;
    this.headingOf = headingOf;
    this.mistOf = mistOf;
    this.titles = titles;
  }

  /** Geometry and text styling of an element, enough to clone its look. */
  static #styleOf(el) {
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      left: rect.left,
      top: rect.top,
      size: cs.fontSize,
      ls: cs.letterSpacing,
      color: cs.color,
      weight: cs.fontWeight,
      family: cs.fontFamily,
      lh: cs.lineHeight,
      tt: cs.textTransform,
      pad: cs.padding,
      opacity: cs.opacity
    };
  }

  /** Where the heading of page `n` will sit once that page is in place. */
  #finalStyleOf(n) {
    const heading = this.headingOf(n);
    if (!heading) return null;

    const page = document.querySelector(`.page[data-page="${n}"]`);
    if (!page) return TitleFlight.#styleOf(heading);

    const wasArriving = heading.classList.contains('arriving');
    heading.classList.remove('arriving');       // opacity:0 would be copied

    const className = page.className;
    page.style.transition = 'none';
    page.style.visibility = 'visible';
    page.classList.remove('past');
    page.classList.add('current');

    const style = TitleFlight.#styleOf(heading);

    page.className = className;
    page.style.visibility = '';
    if (wasArriving) heading.classList.add('arriving');
    void page.offsetWidth;
    page.style.transition = '';
    return style;
  }

  /** Send a copy of `text` from one style/position to another. */
  static #fly(text, from, to, onArrive) {
    const ghost = document.createElement('span');
    ghost.className = 'title-ghost';
    ghost.textContent = text;

    const put = st => Object.assign(ghost.style, {
      left: `${st.left}px`,
      top: `${st.top}px`,
      fontSize: st.size,
      letterSpacing: st.ls,
      color: st.color,
      fontWeight: st.weight,
      fontFamily: st.family,
      lineHeight: st.lh,
      textTransform: st.tt,
      padding: st.pad,
      opacity: st.opacity
    });

    put(from);
    document.body.appendChild(ghost);
    void ghost.offsetWidth;      // commit the starting frame
    put(to);

    setTimeout(() => {
      // Reveal first, remove second: both happen in one frame, so the
      // substitution is invisible.
      onArrive?.();
      ghost.remove();
    }, TitleFlight.DURATION);
  }

  /** Hide a menu item without animating its opacity. */
  static #snap(el, value) {
    el.style.transition = 'none';
    el.style.opacity = value;
    void el.offsetWidth;
    el.style.transition = '';
  }

  /**
   * @param {number} from page being left
   * @param {number} to   page being opened
   */
  run(from, to) {
    const titles = this.titles();
    const outHeading = this.headingOf(from);
    const inHeading = this.headingOf(to);
    const outMist = this.mistOf(from);
    const inMist = this.mistOf(to);
    const outTick = this.rail.tick(from);
    const inTick = this.rail.tick(to);

    outMist?.hide();

    // Measure everything before the rail is rebuilt.
    const outHeadingStyle = outHeading ? TitleFlight.#styleOf(outHeading) : null;
    const inTickStyle = TitleFlight.#styleOf(inTick);

    inHeading?.classList.add('arriving');
    if (outHeading) outHeading.style.visibility = 'hidden';

    this.rail.layout(to);

    const outTickStyle = TitleFlight.#styleOf(outTick);

    // Heading → menu item.
    if (outHeadingStyle) {
      TitleFlight.#snap(outTick, '0');
      TitleFlight.#fly(titles[from], outHeadingStyle, outTickStyle,
        () => TitleFlight.#snap(outTick, ''));
      // restored only once the old page is gone: bringing it back while the
      // page is still on screen leaves a copy beside the one that flew
      setTimeout(() => { outHeading.style.visibility = ''; },
        TitleFlight.DURATION + 320);
    }

    // Menu item → heading, then the trailing words gather.
    if (inHeading) {
      const target = this.#finalStyleOf(to);
      target.opacity = '1';
      setTimeout(() => inMist?.show(), TitleFlight.MIST_LEAD);
      TitleFlight.#fly(titles[to], inTickStyle, target,
        () => inHeading.classList.remove('arriving'));
    }
  }
}
