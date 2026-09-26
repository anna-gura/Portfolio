/**
 * Entry point: builds the parts and wires them together.
 * Nothing here holds behaviour of its own.
 */
import { MENU_TITLES, TRANSLATIONS } from './i18n/translations.js';
import { Theme }       from './modules/Theme.js';
import { I18n }        from './modules/I18n.js';
import { Typewriter }  from './modules/Typewriter.js';
import { Dissolve }    from './modules/Dissolve.js';
import { ParticleSwap } from './modules/ParticleSwap.js';
import { FoxBlink }    from './modules/FoxBlink.js';
import { Wordmark }    from './modules/Wordmark.js';
import { MistText }    from './modules/MistText.js';
import { Flip }        from './modules/Flip.js';
import { Rail }        from './modules/Rail.js';
import { Book }        from './modules/Book.js';
import { TitleFlight } from './modules/TitleFlight.js';
import { ButtonFlight } from './modules/ButtonFlight.js';
import { Shrink }      from './modules/Shrink.js';

const $ = id => document.getElementById(id);

/* Cover lettering. */
document.querySelectorAll('[data-tw]').forEach(el => Typewriter.apply(el));
const wordmark = new Wordmark(document.querySelector('.wordmark'));

ParticleSwap.flatten = els => els.forEach(el => Dissolve.flatten(el));

new Theme($('theme'));
new FoxBlink($('fox'));

/* Trailing words of each heading, one instance per page. */
const mists = new Map();
document.querySelectorAll('.page').forEach(page => {
  mists.set(Number(page.dataset.page), new MistText(page.querySelector('.hx')));
});

const headingOf = n => document.querySelector(`.page[data-page="${n}"] .hb`);
const pageEl = n => n === 0
  ? document.getElementById('cover')
  : document.querySelector(`.page[data-page="${n}"]`);

/** Body copy of a page — everything that takes part in the particle swap. */
const dustOf = n => [...(pageEl(n)?.querySelectorAll('[data-dust]') ?? [])];
const mistOf = n => mists.get(n) ?? null;

let language = 'uk';
const pending = [];

const rail = new Rail({
  root: $('rail'),
  top: $('zoneTop'),
  bottom: $('zoneBottom'),
  dot: $('railDot'),
  titles: MENU_TITLES.uk,
  onSelect: n => book.goto(n)
});

const flight = new TitleFlight({
  rail,
  headingOf,
  mistOf,
  titles: () => MENU_TITLES[language]
});

const book = new Book({
  root: $('book'),
  cover: $('cover'),
  pages: [...document.querySelectorAll('.page')],
  onTurn: (from, to) => {
    flight.run(from, to);
    rail.pulse();
    // Both sides must be split into characters before they can be sampled:
    // the particle capture reads the rectangle of every glyph rather than
    // working out line breaking for itself.
    const leaving = dustOf(from);
    const arriving = dustOf(to);
    for (const el of [...leaving, ...arriving]) {
      Dissolve.split(el);
      el.classList.add('gathered');
      el.classList.remove('scattered');
    }
    // The cover is still parked above the screen at this point: measured as
    // it stands, its text would be sampled off-screen and the fragments would
    // have nowhere to gather. Put it in place for the measurement only.
    const cover = pageEl(0);
    const parked = to === 0 && cover.classList.contains('up');
    if (parked) {
      cover.style.transition = 'none';
      cover.classList.remove('up');
    }

    ParticleSwap.run(leaving, arriving);

    // A button does not disappear with its page. If the next page has one
    // too, it travels there; if not, it closes back into a dot — and draws
    // itself out of one when it turns up on a page that had none.
    const btnFrom = pageEl(from)?.querySelector('.btn');
    const btnTo = pageEl(to)?.querySelector('.btn');

    // prints and the sticky note shrink into their centre and grow back
    const objects = n => [...(pageEl(n)?.querySelectorAll('.polaroid, .sticker-wrap') ?? [])];
    Shrink.out(objects(from));
    Shrink.in(objects(to), 300);

    // Arriving at the cover, the button waits for the curtain to come down
    // before it draws itself: growing while the screen is still travelling
    // reads as a second copy sliding onto the first.
    const wait = to === 0 ? 520 : 0;

    if (btnFrom && btnTo) ButtonFlight.run(btnFrom, btnTo);
    else if (btnFrom) ButtonFlight.vanish(btnFrom);
    else if (btnTo) ButtonFlight.appear(btnTo, wait);

    if (parked) {
      cover.classList.add('up');
      void cover.offsetWidth;
      cover.style.transition = '';
    }
  }
});

const i18n = new I18n({
  dictionaries: TRANSLATIONS,
  fallback: 'uk',
  switcher: $('langs'),
  onSwap: (el, text) => {
    // Every page is stacked at the same coordinates, so copy from pages that
    // are not on screen must not animate — it would be measured and shown
    // where the visible page has nothing at all.
    const onScreen = el.closest('.page, .hero') === pageEl(book.index);

    if (!onScreen) {
      el.dataset.raw = text;
      el.textContent = text;
      el.classList.remove('ready');     // .hx rebuilds itself when shown
      return;
    }

    pending.push({ el, text });
  },

  onChange: lang => {
    // one wave for the whole page: measured together, they cannot land in
    // positions that another element is about to invalidate
    Flip.batch(pending);
    pending.length = 0;

    language = lang;
    rail.setTitles(MENU_TITLES[lang]);

    wordmark.fit();
  }
});

/* Buttons that jump to a page of this album. */
document.addEventListener('click', e => {
  const target = e.target.closest('[data-go]');
  if (target) book.goto(Number(target.dataset.go));
});

/* A language restored from storage must also reach the rail labels. */
language = i18n.lang;
rail.setTitles(MENU_TITLES[language]);

rail.layout(book.index);
book.render();
Dissolve.pageIn(pageEl(book.index));

/* Tells the guard in <head> that the scripts are running. */
document.documentElement.dataset.booted = 'true';
