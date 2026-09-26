/**
 * Left-hand navigation.
 *
 * Items before the current page hug the top corner, items after it hug the
 * bottom one, and the current page is shown as a single dot in the middle.
 *
 * The active item keeps its place in the flow and is only made invisible.
 * Taking it out entirely (display:none) makes the bottom group jump by one
 * row on every page turn, which is visible and ugly. For the same reason it
 * always counts as part of the top group: the top group then only ever grows
 * downwards and the bottom one only shrinks from above, so no visible label
 * ever changes position.
 */
export class Rail {
  /**
   * @param {object} o
   * @param {HTMLElement} o.root      rail container
   * @param {HTMLElement} o.top       top zone
   * @param {HTMLElement} o.bottom    bottom zone
   * @param {HTMLElement} o.dot       centre dot
   * @param {string[]}    o.titles    labels in page order
   * @param {(n:number)=>void} o.onSelect
   */
  constructor({ root, top, bottom, dot, titles, onSelect }) {
    this.root = root;
    this.zoneTop = top;
    this.zoneBottom = bottom;
    this.dot = dot;
    this.ticks = titles.map((title, n) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tick';
      button.dataset.dot = String(n);
      button.textContent = title;
      button.addEventListener('click', () => onSelect(n));
      return button;
    });
  }

  /** @returns {HTMLElement} the menu item for page `n` */
  tick(n) {
    return this.ticks[n];
  }

  /** Redistribute the items around page `index`. */
  layout(index) {
    this.zoneTop.replaceChildren();
    this.zoneBottom.replaceChildren();

    this.ticks.forEach((tick, n) => {
      tick.classList.toggle('hidden', n === index);
      tick.setAttribute('aria-current', String(n === index));
      (n <= index ? this.zoneTop : this.zoneBottom).appendChild(tick);
    });
  }

  /** Short bounce of the centre dot on every page turn. */
  pulse() {
    this.dot.classList.add('pulse');
    clearTimeout(this._pulse);
    this._pulse = setTimeout(() => this.dot.classList.remove('pulse'), 460);
  }

  /** @param {string[]} titles */
  setTitles(titles) {
    this.ticks.forEach((tick, n) => { tick.textContent = titles[n]; });
  }
}
