/**
 * Numbers only. Every word lives in `js/i18n/pricing.js`, keyed by the same id.
 *
 * Two rules run through the whole model.
 *
 * `open: true` marks a price that is a floor, not a figure — anything whose
 * scope can change by an order of magnitude between two clients. The page
 * shows those as "from", and a quote that contains one is a starting point
 * rather than an estimate.
 *
 * Anything that is genuinely a different job gets its own line rather than a
 * shared one. Booking is not payments; an extra language is not a translation;
 * a basic analytics tag is not conversion tracking. One line for two jobs
 * always prices one of them wrongly.
 */

/** Starting points, by how much of the design is drawn for this client. */
export const BASES = [
  { id: 'ready',   price: 500,  open: true },
  { id: 'custom',  price: 850,  open: true },
  { id: 'concept', price: 1500, open: true },
  { id: 'free',    price: 1900, open: true }
];

/**
 * Things measured in units.
 *
 * `min` is what a project already comes with, and it is what the counter
 * starts at — a visitor should read "Pages: 1", not "Extra pages: 0". Only
 * what is above the minimum is charged for.
 *
 * `first` prices the opening unit where the work is front-loaded: translating
 * or writing the first five hundred words costs more than the next five
 * hundred.
 *
 * `needs` keeps a line out of the way until it means anything. Translation is
 * nothing to decide about until there is a second language.
 */
export const COUNTERS = [
  { id: 'pages',  unit: 170, min: 1, max: 12 },
  { id: 'langs',  unit: 220, min: 1, max: 5 },
  { id: 'words',  unit: 80,  min: 0, max: 10, first: 90, needs: 'langs', sub: true },
  { id: 'rounds', unit: 110, min: 2, max: 6 },
  { id: 'copy',   unit: 100, min: 0, max: 10, first: 150 }
];

/**
 * Motion is a ladder, not a checkbox.
 *
 * With a single "animations" line a visitor reasonably reads it as "a fully
 * animated site for $290" and the conversation starts from a wrong number.
 */
export const MOTION = [
  { id: 'calm',  price: 0 },
  { id: 'flow',  price: 290 },
  { id: 'scene', price: 1200, open: true,
    showcase: 'https://anna-gura.github.io/Transition-Point' }
];

/**
 * Jobs with four steps between "not needed" and "built from scratch", shown
 * as a slider. Four points on one line say more than four radio buttons: the
 * distance between an embedded calendar and a booking system of your own is
 * the whole point, and a slider puts it in front of the eye.
 */
export const GROUPS = [
  {
    id: 'forms',
    levels: [
      { id: 'none',     price: 0 },
      { id: 'basic',    price: 120 },
      { id: 'advanced', price: 280 },
      { id: 'custom',   price: 650, open: true }
    ]
  },
  {
    id: 'booking',
    levels: [
      { id: 'none',   price: 0 },
      { id: 'embed',  price: 220 },
      { id: 'setup',  price: 600, open: true },
      { id: 'deep',   price: 2000, open: true }
    ]
  },
];

/** Plain switches: either the work is in the project or it is not. */
export const EXTRAS = [
  { id: 'dark',  price: 180 },
  { id: 'seo',   price: 250, open: true },
  { id: 'pay',   price: 340, open: true },
  { id: 'edit',  price: 560, open: true },
  { id: 'brand', price: 320, open: true },
  { id: 'stats', price: 130 }
];

/** Support is not flat: what can break is what has to be looked after. */
export const SUPPORT = {
  base: 45,
  groups: { forms: 15, booking: 20 },
  extras: { pay: 20, edit: 20 },
  motion: { calm: 0, flow: 10, scene: 25 }
};

/** Paying in instalments costs more. */
export const INSTALMENT = { months: 12, markup: 1.15 };

/**
 * A quote is a corridor, never a single number. Cheaper than estimated almost
 * never happens, dearer sometimes does — hence the asymmetry. An open-ended
 * item widens the top of the corridor, because that is exactly where the
 * uncertainty lives.
 */
export const CORRIDOR = { low: 0.94, high: 1.08, openHigh: 1.35 };
