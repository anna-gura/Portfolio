# Painted Fox Studio

Portfolio site for my web studio. An album you leaf through: a cover, then
four pages that change one at a time. Everything sits on one sheet of paper,
and the paper behaves like paper — it has grain, it takes light from one
direction, and things lying on it cast shadows the same way.

Vanilla HTML, CSS and ES modules. No framework, no build step, no
dependencies, nothing to compile.

**Live:** paintedfox.studio · **Pricing configurator:** /pricing.html

---

## Running it

ES modules will not load over `file://`, so serve the folder:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Deploy by copying the folder to any static host — Cloudflare Pages, GitHub
Pages, Netlify. There is no build output because there is no build.

---

## Structure

```
index.html            the album
pricing.html          budget configurator

assets/logo/          mark, favicon, badge — single-path SVG, currentColor
assets/shots/         project screenshots, 640×400, shown inside the prints

css/
  tokens.css          colours and type scale for both themes
  base.css            reset, paper and cloth surfaces, typewriter lettering
  album.css           cover, pages, the fox
  components.css      header, buttons, prints, sticky note, page layouts
  rail.css            left-hand navigation and the animated text bits
  responsive.css      every breakpoint, in one place
  pricing.css         the configurator

js/
  main.js             wires the album together
  pricing.js          wires the configurator
  data/pricing.js     every price in the project — numbers only
  i18n/               all copy, keyed by data-i
  modules/            one class per job
```

---

## How the album works

`Book` owns the page index and turns pages on wheel, swipe or keyboard. Every
gesture moves exactly one page, however hard it was made, and input is locked
for the length of the animation so fast scrolling cannot queue up turns.

Pages do not slide. A turn is a change of text and objects on a surface that
never moves:

- `ParticleSwap` rasterises the copy of both pages to an offscreen canvas,
  samples it on a grid, and flies the fragments from one wording to the other.
  Frames go straight into an ImageData buffer and are blitted in one call.
- `TitleFlight` sends the page title between the heading and the menu, and
  `MistText` gathers the trailing words out of a blur.
- `ButtonFlight` carries a button to its counterpart on the next page,
  morphing size and colour on the way. With nothing to travel to, the button
  closes into a dot; on a page that had none, it draws itself out of one.
- `Shrink` takes the prints and the sticky note down into their own centre.

`Rail` draws the navigation on the left: pages before the current one hug the
top corner, pages after it hug the bottom, and the current page is a dot in
the middle. The active item keeps its place in the flow and is only made
invisible — removing it would shift every neighbouring label by a row.

`WordRoll` handles a change of language on both pages: old words leave
downwards, new ones come down from above, each with a small delay of its own.
Whole words rather than letters — at a glance the eye reads the movement, not
the glyphs, and a page of copy is thousands of characters. The arriving half
starts once about half the leavers are done, so the page is never empty for
long. Anything scrolled out of sight is swapped without animation.

---

## Pricing model

A base is a preset, not a sealed package: it sets the structural price, the
page count, the level of motion and which options start ticked. Everything can
then be unticked and the total follows, so a visitor sees what each decision
costs instead of comparing three fixed columns.

Motion is a ladder of three named steps rather than a checkbox. With one
"animations" line a visitor reasonably reads it as a fully animated site for
$260, and the conversation starts from the wrong number.

Prices are shown as a corridor, never a single figure, and the corridor is
asymmetric: cheaper than estimated almost never happens, dearer sometimes
does.

---

## Conventions

- Ukrainian copy lives in the markup and is harvested on start-up, so the HTML
  reads as a document and the default language cannot fall out of sync. Other
  languages live in `js/i18n/`, keyed by `data-i`.
- Prices live in `js/data/pricing.js` and nowhere else. The words for those
  same items live in `js/i18n/pricing.js`, keyed by id.
- No inline styles and no inline logic. The one exception is a single line in
  `<head>` that marks the document as scripted; it has to run before the first
  paint, and without it split text would flash before it is animated.
- Light and dark are the same paper, one warm and one charcoal. The dark theme
  is not a filtered copy: its grain lightens instead of darkening, because on
  dark card stock the fibres catch the light.
- Every shadow falls the same way. Directional lighting is what separates
  paper from a flat rectangle.
- Animation runs on transform and opacity wherever possible. Anything that
  makes the browser re-rasterise every frame — morphing clip paths, blend
  modes on moving layers — has already cost me a frozen page once.
- `prefers-reduced-motion` is honoured throughout: every effect has a path
  that simply shows the result.

---

## Still to do

- Pages for individual case studies, the full works list and the tools page.
- Self-host the fonts with Cyrillic subsets instead of loading them from
  Google Fonts.
- Replace `assets/shots/*` when the sites change: 640×400, JPEG, quality ~75.
  Wide screenshots are cropped from the sides, never padded.
