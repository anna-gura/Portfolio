import { Prefs } from './Prefs.js';

/**
 * Swaps the text of every `[data-i]` element.
 *
 * The default language is read out of the markup on first run, so the HTML
 * remains the source of truth for it and cannot fall out of sync.
 * The choice is remembered and shared by every page.
 */
export class I18n {
  /**
   * @param {object} o
   * @param {object} o.dictionaries  keyed by language code
   * @param {string} o.fallback      language that lives in the markup
   * @param {HTMLElement} o.switcher
   * @param {(lang:string)=>void} [o.onChange]
   * @param {(el:HTMLElement,text:string)=>void} [o.onSwap]  animates the change
   */
  constructor({ dictionaries, fallback, switcher, onChange, onSwap }) {
    this.onSwap = onSwap;
    this.dict = dictionaries;
    this.fallback = fallback;
    this.lang = fallback;
    this.switcher = switcher;
    this.onChange = onChange;

    for (const el of document.querySelectorAll('[data-i]')) {
      this.dict[fallback][el.dataset.i] = el.textContent;
    }

    switcher?.addEventListener('click', e => {
      const button = e.target.closest('button[data-lang]');
      if (button) this.use(button.dataset.lang);
    });

    const saved = Prefs.lang;
    if (saved && saved !== fallback) this.use(saved, false);
    else this.#markActive();
  }

  /**
   * @param {string} lang
   * @param {boolean} [animate]  false on start-up: the page must already be
   *   in the right language before the first paint, not switch into it
   */
  use(lang, animate = true) {
    const table = this.dict[lang];
    if (!table) return;

    for (const el of document.querySelectorAll('[data-i]')) {
      const value = table[el.dataset.i];
      if (value === undefined) continue;
      // the animator owns the text from here on; it also records data-raw,
      // so interrupting a switch never leaves a line in the old language
      if (this.onSwap && animate) this.onSwap(el, value);
      else { el.textContent = value; el.dataset.raw = value; }
    }

    this.lang = lang;
    Prefs.lang = lang;
    document.documentElement.lang = lang;
    this.#markActive();
    this.onChange?.(lang);
  }

  #markActive() {
    for (const button of this.switcher?.querySelectorAll('button[data-lang]') ?? []) {
      button.setAttribute('aria-pressed', String(button.dataset.lang === this.lang));
    }
  }
}
