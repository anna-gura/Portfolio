import { Prefs } from './Prefs.js';
import { ThemeWash } from './ThemeWash.js';

/**
 * Light / dark switch.
 *
 * Both themes are the same paper: one warm and light, one charcoal. The change
 * is flooded on with watercolour from the switch itself, and the choice is
 * remembered and shared by every page.
 */
export class Theme {
  /** @param {HTMLElement} button */
  constructor(button) {
    this.root = document.documentElement;
    this.button = button;

    const saved = Prefs.theme;
    if (saved) this.root.dataset.theme = saved;

    this.button?.addEventListener('click', () => this.toggle());
  }

  toggle() {
    const next = this.root.dataset.theme === 'light' ? 'dark' : 'light';
    ThemeWash.run(this.button, () => {
      this.root.dataset.theme = next;
      Prefs.theme = next;
    });
  }
}
