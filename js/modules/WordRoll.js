/**
 * Language change on the pricing page: the wording rolls over the way the
 * price does. Old words leave downwards, new ones come down from above.
 *
 * The arriving half does not wait for the last straggler. It starts once about
 * half the leavers are done — the page is never empty for long, and the small
 * overlap is what makes it look like something happening rather than a
 * sequence being played out.
 *
 * Whole words, not letters. A page of options runs to thousands of characters,
 * and at a glance the eye reads the movement rather than the glyphs; words are
 * a fifth of the work. Every word gets a small delay of its own so the line
 * moves as a body rather than snapping over as one block.
 *
 * Anything scrolled out of sight is swapped without animation: there is nobody
 * to see it, and on a long page that is most of the text.
 */
export class WordRoll {
  /* Elements with an outline of their own. A longer translation pushes
     everything below it down, and a border or a button jumping there is far
     more noticeable than the words themselves moving. None of these sits
     inside another, so their transforms cannot compound. */
  /* Elements with an outline of their own, chosen so that none of them
     contains another. Nested boxes would each carry a transform and the two
     would add up, which sends the inner one past the place it is heading
     for. */
  static BOXES = '.wrap > h1, .wrap > .lede, ' +
    '.builder > h2, .builder > .hint, .builder > .note, ' +
    '.row, .step, .group-head, .tabs, .panel, .summary-inner > *';
  /* Boxes whose height is held while the words move. This list may nest
     freely — holding a height is not a transform, so nothing compounds — and
     it should reach every container that could breathe when its text is
     briefly made of inline-blocks. Empty means: the same as BOXES. */
  static HOLD = '';

  static SHIFT = 420;    // ms for a box to travel to its new place

  static OUT = 200;      // ms for a word to leave
  static IN = 260;       // ms for one to arrive
  static SPREAD = 120;   // ms the starts are scattered over

  static #glide = 'cubic-bezier(.2,.7,.2,1)';
  static #leave = 'cubic-bezier(.5,0,.85,.3)';
  static #enter = 'cubic-bezier(.2,.7,.2,1)';

  static get calm() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Wrap each word in a window of its own and return the parts that move. */
  static #split(el, text, line) {
    el.textContent = '';
    const moving = [];

    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }

      const box = document.createElement('span');
      box.className = 'roll';
      box.style.height = line;

      const word = document.createElement('span');
      word.className = 'roll-in';
      word.textContent = part;

      box.appendChild(word);
      el.appendChild(box);
      moving.push(word);
    }
    return moving;
  }

  /** @param {{el:HTMLElement,text:string}[]} pairs */
  static batch(pairs) {
    const live = [];

    for (const { el, text } of pairs) {
      const from = el.dataset.raw ?? el.textContent;
      el.dataset.raw = text;

      if (WordRoll.calm) { el.textContent = text; continue; }

      /* Rolled even when the wording is identical — a price of "+$180" reads
         the same in every language. Leaving those few lines still while
         everything around them turns over looks like something failed. */

      const r = el.getBoundingClientRect();
      const onScreen = r.width && r.bottom > -60 && r.top < innerHeight + 60;
      if (!onScreen) { el.textContent = text; continue; }

      live.push({
        el, text, from,
        line: getComputedStyle(el).lineHeight,
        h0: r.height,
        w0: r.width
      });
    }
    if (!live.length) return;

    /* Where the furniture stands before the words change — in document
       order, so an outer box is always seen before what sits inside it. */
    const boxes = [...document.querySelectorAll(WordRoll.BOXES)]
      .map(el => {
        const own = getComputedStyle(el).transform;
        return {
          el,
          was: el.getBoundingClientRect(),
          // objects lie at an angle of their own; writing `transform` outright
          // would straighten them out for the length of the animation
          base: own === 'none' ? '' : ` ${own}`
        };
      })
      .filter(b => b.was.height && b.was.bottom > -80 && b.was.top < innerHeight + 80);

    const held = [...document.querySelectorAll(WordRoll.HOLD || WordRoll.BOXES)]
      .map(el => ({ el, h: el.getBoundingClientRect().height, was: el.style.height }))
      .filter(x => x.h);

    // out — downwards
    for (const it of live) it.words = WordRoll.#split(it.el, it.from, it.line);

    /* Hold every line, and every box around it, at the height it had.

       A row of windows does not occupy exactly the same line box as the plain
       text it stands in for: they are inline-blocks with a height of their
       own, and inside a heading of mixed sizes the line comes out a pixel or
       several different. Holding the words alone is not enough — their
       container still breathes, and everything below it drifts and then
       springs back when the hold is lifted. */
    /* Width as well as height. A line of windows does not break where the
       plain text does, so left free the wording rewraps mid-animation and the
       block changes shape under the words. */
    for (const it of live) {
      it.el.style.height = `${it.h0}px`;
      it.el.style.width = `${it.w0}px`;
    }
    for (const box of held) box.el.style.height = `${box.h}px`;
    for (const it of live) {
      for (const word of it.words) {
        word.animate(
          [{ transform: 'none', opacity: 1 },
           { transform: 'translateY(110%)', opacity: 0 }],
          {
            duration: WordRoll.OUT,
            delay: Math.random() * WordRoll.SPREAD,
            easing: WordRoll.#leave,
            fill: 'forwards'
          }
        );
      }
    }

    // in — from above, once roughly half the leavers have gone
    setTimeout(() => {
      /* The new wording is put in as plain text first, so the layout that is
         measured is the one the page will actually settle into. Only then are
         the words cut into windows again, with every box pinned to its final
         height — windows are inline-blocks and would otherwise make their
         containers a few pixels taller, which shows up as everything drifting
         during the roll and snapping back at the end. */
      for (const it of live) {
        it.el.textContent = it.text;
        it.el.style.height = '';
        it.el.style.width = '';
      }
      for (const box of held) box.el.style.height = box.was;

      for (const box of boxes) box.now = box.el.getBoundingClientRect();
      for (const it of live) {
        const r = it.el.getBoundingClientRect();
        it.h1 = r.height;
        it.w1 = r.width;
      }
      for (const box of held) box.final = box.el.getBoundingClientRect().height;

      /* Pinned to the shape the new wording will have, so the words arrive
         into their own layout rather than into the old one and shuffle. */
      for (const it of live) {
        it.el.style.height = `${it.h1}px`;
        it.el.style.width = `${it.w1}px`;
      }
      for (const box of held) box.el.style.height = `${box.final}px`;
      for (const it of live) WordRoll.#split(it.el, it.text, it.line);

      /* The boxes replay the move they have just made. Transform only:
         animating a height would ask the browser to lay the page out on
         every frame. */
      const moving = [];
      for (const box of boxes) {
        let dx = box.was.left - box.now.left;
        let dy = box.was.top - box.now.top;

        // transforms of nested boxes add up; take off what an ancestor carries
        for (const m of moving) {
          if (m.el === box.el || !m.el.contains(box.el)) continue;
          dx -= m.dx;
          dy -= m.dy;
        }

        const grew = Math.abs(box.was.width - box.now.width) > 0.5;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && !grew) continue;
        moving.push({ el: box.el, dx, dy });

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          box.el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)${box.base}` },
             { transform: box.base.trim() || 'none' }],
            { duration: WordRoll.SHIFT, easing: WordRoll.#glide, fill: 'backwards' }
          );
        }

        /* A button is as wide as its label. Its width cannot be carried by a
           transform without squashing the pill, so that one is animated
           outright — it is a single element, and a button whose edge snaps
           while its words roll is the thing that looks broken. */
        if (grew && box.el.matches('.btn')) {
          box.el.animate(
            [{ width: `${box.was.width}px` }, { width: `${box.now.width}px` }],
            { duration: WordRoll.SHIFT, easing: WordRoll.#glide, fill: 'backwards' }
          );
        }
      }

      for (const it of live) {
        for (const word of it.el.querySelectorAll('.roll-in')) {
          /* The starting position is written into the element before the
             animation is made. Relying on the animation's own backwards fill
             leaves a window — a frame can be painted before the fill is
             applied, and the word flashes in its final place first. */
          word.style.transform = 'translateY(-110%)';
          word.style.opacity = '0';

          const arrive = word.animate(
            [{ transform: 'translateY(-110%)', opacity: 0 },
             { transform: 'none', opacity: 1 }],
            {
              duration: WordRoll.IN,
              delay: Math.random() * WordRoll.SPREAD,
              easing: WordRoll.#enter,
              fill: 'both'
            }
          );
          arrive.finished
            .then(() => { word.style.transform = ''; word.style.opacity = ''; arrive.cancel(); })
            .catch(() => { word.style.transform = ''; word.style.opacity = ''; });
        }
      }

      // back to plain text: the windows are only needed while something moves
      setTimeout(() => {
        // holds are lifted onto a layout that already matches them, so this
        // changes nothing anybody can see
        for (const it of live) {
          it.el.textContent = it.text;
          it.el.style.height = '';
          it.el.style.width = '';
        }
        for (const box of held) box.el.style.height = box.was;
      }, WordRoll.IN + WordRoll.SPREAD + 60);
    }, WordRoll.OUT + WordRoll.SPREAD * 0.5);
  }

  /** How long a change takes, end to end. */
  static duration() {
    return WordRoll.OUT + WordRoll.IN + WordRoll.SPREAD * 1.5 + 120;
  }
}
