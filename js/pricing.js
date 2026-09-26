/** Entry point for the pricing page. */
import { Theme } from './modules/Theme.js';
import { I18n } from './modules/I18n.js';
import { Prefs } from './modules/Prefs.js';
import { PricingConfigurator } from './modules/PricingConfigurator.js';
import { PRICING_COPY } from './i18n/pricing.js';
import { Dissolve } from './modules/Dissolve.js';
import { ParticleSwap } from './modules/ParticleSwap.js';
import { Flip } from './modules/Flip.js';

new Theme(document.getElementById('theme'));

const pending = [];

/* The configurator is built in the stored language straight away, so the page
   never appears in Ukrainian and then switches. */
const configurator = new PricingConfigurator(
  document.querySelector('.wrap'), Prefs.lang ?? 'uk');

/* Static page copy travels through the same mechanism as the album. */
const staticCopy = Object.fromEntries(
  Object.entries(PRICING_COPY).map(([lang, table]) => [lang, { ...table.ui }])
);

new I18n({
  dictionaries: staticCopy,
  fallback: 'uk',
  switcher: document.getElementById('langs'),
  onSwap: (el, text) => pending.push({ el, text }),

  onChange: lang => {
    Flip.batch(pending);
    pending.length = 0;
    configurator.setLanguage(lang);
  }
});

document.querySelectorAll('[data-dust]').forEach(el => Dissolve.in(el));

