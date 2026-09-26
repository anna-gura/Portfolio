/**
 * Splits a line into characters and gives each one a small random offset,
 * tilt and opacity, the way a mechanical typewriter never strikes twice
 * the same way. Purely cosmetic: transforms do not affect layout.
 */
export class Typewriter {
  /** @param {HTMLElement} el element whose text should be re-struck */
  static apply(el) {
    const text = el.textContent;
    el.textContent = '';

    for (const ch of text) {
      const span = document.createElement('span');
      span.textContent = ch;
      span.style.transform =
        `translateY(${((Math.random() - 0.5) * 1.7).toFixed(2)}px) ` +
        `rotate(${((Math.random() - 0.5) * 1.4).toFixed(2)}deg)`;
      span.style.opacity = (0.84 + Math.random() * 0.16).toFixed(2);
      el.appendChild(span);
    }
  }
}
