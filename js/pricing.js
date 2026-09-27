/** Entry point for the pricing page. */
import { Theme } from './modules/Theme.js';
import { I18n } from './modules/I18n.js';
import { Prefs } from './modules/Prefs.js';
import { PricingConfigurator } from './modules/PricingConfigurator.js';
import { PRICING_COPY } from './i18n/pricing.js';
import { Dissolve } from './modules/Dissolve.js';
import { WordRoll } from './modules/WordRoll.js';

new Theme(document.getElementById('theme'));

const pending = [];

/* Held so that nothing breathes while the words are windows; the travelling
   set is chosen separately, since transforms of nested boxes would add up. */
WordRoll.HOLD = '.builder, .summary-inner, .group, .tabs, .panel, ' +
  '.row, .step, #bases, #counts, #extras, #after, .steps';


/* The configurator is built in the stored language straight away, so the page
   never appears in Ukrainian and then switches. */
const configurator = new PricingConfigurator(
  document.querySelector('.wrap'), Prefs.lang ?? 'uk');

/* Static page copy travels through the same mechanism as the album. */
const staticCopy = Object.fromEntries(
  Object.entries(PRICING_COPY).map(([lang, table]) => [lang, { ...table.ui }])
);

/* Choosing the language that is already on does nothing. Registered before
   the switcher's own handler, so it can stop the click going any further. */
document.getElementById('langs').addEventListener('click', e => {
  const button = e.target.closest('button[data-lang]');
  if (button && button.dataset.lang === document.documentElement.lang) {
    e.stopImmediatePropagation();
  }
});

new I18n({
  dictionaries: staticCopy,
  fallback: 'uk',
  switcher: document.getElementById('langs'),
  onSwap: (el, text) => {
    // the way back is furniture, not content: it should sit still
    if (el.classList.contains('back')) { el.textContent = text; el.dataset.raw = text; return; }
    pending.push({ el, text });
  },

  onChange: lang => {
    // one wave for the whole page: the static copy and every label the
    // configurator has just regenerated, measured and animated together
    const generated = configurator.setLanguage(lang);
    WordRoll.batch([...pending, ...generated]);
    pending.length = 0;
  }
});

document.querySelectorAll('[data-dust]').forEach(el => Dissolve.in(el));

/* Tells the guard in <head> that the scripts are running. */
document.documentElement.dataset.booted = 'true';
