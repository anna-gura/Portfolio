/**
 * Numbers only. Every word lives in `js/i18n/pricing.js`, keyed by the same id.
 *
 * Current figures are portfolio rates: deliberately low while the studio is
 * building its first cases, and expected to rise. Changing a price must never
 * require touching markup, logic or copy.
 */

/**
 * Starting points. A base is a preset, not a package: it sets the structural
 * price, the number of pages, which options come pre-selected and which level
 * of motion is assumed. Everything can then be unticked, and the total follows.
 */
export const BASES = [
  { id: 'tpl',   price: 500,  pages: 1, includes: [],     motion: 'calm' },
  { id: 'one',   price: 950,  pages: 1, includes: [],     motion: 'calm' },
  { id: 'multi', price: 1500, pages: 3, includes: ['seo'], motion: 'flow' },
  { id: 'full',  price: 1900, pages: 7, includes: '*',    motion: 'scene' }
];

/** Things measured in units rather than switched on and off. */
export const COUNTERS = [
  { id: 'pages',  unit: 170, max: 12 },
  { id: 'langs',  unit: 220, max: 4 },
  { id: 'rounds', unit: 110, max: 4 }
];

/**
 * Motion is a ladder, not a checkbox.
 *
 * With a single "animations" line a visitor reasonably reads it as "a fully
 * animated site for $260" and the conversation starts from a wrong number.
 * Three named steps make the distance between a tidy site and a built scene
 * visible before anyone asks.
 */
export const MOTION = [
  { id: 'calm',  price: 0 },
  { id: 'flow',  price: 290 },
  { id: 'scene', price: 1200, showcase: 'https://anna-gura.github.io/Transition-Point' }
];

export const EXTRAS = [
  { id: 'dark',   price: 180 },
  { id: 'seo',    price: 250 },
  { id: 'forms',  price: 340 },
  { id: 'cms',    price: 560 },
  { id: 'mail',   price: 130 },
  { id: 'brand',  price: 320 }
];

/** Support is not flat: what can break is what has to be looked after. */
export const SUPPORT = {
  base: 45,
  surcharge: { cms: 20, forms: 15 },
  motion: { calm: 0, flow: 10, scene: 25 }
};

/** Paying in instalments costs more. */
export const INSTALMENT = { months: 12, markup: 1.15 };

/**
 * A quote is a corridor, never a single number. Cheaper than estimated almost
 * never happens, dearer sometimes does — hence the asymmetry.
 */
export const CORRIDOR = { low: 0.94, high: 1.08 };
