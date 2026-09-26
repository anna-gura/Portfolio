import { Dissolve } from './Dissolve.js';

/**
 * Language switch: letters deform and reshuffle rather than being replaced.
 *
 * Each cell runs through a short burst of random glyphs from the alphabet it
 * is heading towards, settling left to right. Length differences are handled
 * by padding, so the line never jumps.
 */
export class Scramble {
  static POOL = {
    uk: 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя',
    ru: 'абвгдежзийклмнопрстуфхцчшщъыьэюя',
    en: 'abcdefghijklmnopqrstuvwxyz'
  };

  static STEP = 34;      // ms between glyph changes
  static SETTLE = 26;    // ms of extra delay per character

  /**
   * @param {HTMLElement} el
   * @param {string} next  text to arrive at
   * @param {string} lang  alphabet to draw the noise from
   */
  static run(el, next, lang) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = next;
      return;
    }

    Dissolve.flatten(el);
    const pool = Scramble.POOL[lang] ?? Scramble.POOL.en;
    const from = el.textContent;
    const length = Math.max(from.length, next.length);
    const done = new Array(length).fill(false);

    clearInterval(el._scramble);
    let tick = 0;

    el._scramble = setInterval(() => {
      let out = '';
      let settled = 0;

      for (let i = 0; i < length; i++) {
        const target = next[i] ?? '';
        if (done[i]) { out += target; settled++; continue; }

        if (tick * Scramble.STEP > i * Scramble.SETTLE + 90) {
          done[i] = true;
          out += target;
          settled++;
          continue;
        }
        // spaces and punctuation stay put: only letters churn
        out += /[\s.,—–:;!?()"'$₴€]/.test(target) && target
          ? target
          : pool[Math.floor(Math.random() * pool.length)];
      }

      el.textContent = out;
      tick++;

      if (settled === length) {
        clearInterval(el._scramble);
        el.textContent = next;
        el.dataset.raw = next;
      }
    }, Scramble.STEP);
  }
}
