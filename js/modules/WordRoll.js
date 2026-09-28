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

  /**
   * Cut the wording into windows, one per word, keeping the lines it already
   * breaks into.
   *
   * The element must be holding this text as plain text when this is called:
   * the lines are read off it. A window is an inline-block and its width is
   * rounded up to a whole pixel, so a line that fits as plain text can be a
   * fraction too wide once it is made of windows, and its last word drops to
   * the next line — then jumps back up when the plain text returns. Keeping
   * each line in a block of its own means the breaks cannot move.
   */
  static #split(el, text, line) {
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const words = [];

    for (let node; (node = walker.nextNode());) {
      for (const m of node.data.matchAll(/\S+/g)) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const r = range.getBoundingClientRect();
        words.push({ text: m[0], top: r.width ? Math.round(r.top) : null });
      }
    }

    // nothing measurable to go on: one line, as it comes
    if (!words.length) words.push(...text.split(/\s+/).filter(Boolean).map(w => ({ text: w, top: 0 })));

    /* Built off to one side and put in once: appending forty boxes straight
       into a live element makes the browser reconsider the page forty times. */
    const tray = document.createDocumentFragment();
    const moving = [];

    /* Which words belong to the same line, judged with a tolerance of half a
       line rather than by an exact match.

       Inside anything set at an angle — a note, a print — the words of one
       line each sit a little lower than the last on screen, and compared
       exactly every one of them looks like a line of its own. The caption of
       a tilted print would come out stacked one word per row. */
    const step = parseFloat(line) || 0;
    // three quarters of a line: a real break is a whole line down, while a
    // slant or a taller glyph is a fraction of one
    const near = Math.max(4, step * 0.75);

    let lines = 1;
    for (let i = 1; i < words.length; i++) {
      if (Math.abs(words[i].top - words[i - 1].top) > near) lines++;
    }

    /* The element's own height has the last word on how many lines it has.
       Reading the words is a good guess, but a guess; a box one line tall
       cannot hold two, and splitting it into two blocks would make it so.

       Measured inside the padding, not across the whole box: a button is a
       single line of text with a generous cushion above and below, and its
       full height reads as two lines. */
    const pad = parseFloat(getComputedStyle(el).paddingTop)
              + parseFloat(getComputedStyle(el).paddingBottom);
    const inner = Math.max(0, el.clientHeight - (pad || 0));
    const rows = step ? Math.max(1, Math.round(inner / step)) : lines;

    /* A single line is left as it is: wrapping it in a block of its own would
       break an element that shares a line with something else — a lead-in
       beside a price, say — onto a line by itself. */
    const wrapped = lines > 1 && rows > 1;
    let at = null;
    let row = null;

    for (const word of words) {
      if (!wrapped) {
        if (row) tray.appendChild(document.createTextNode(' '));
        row = tray;
      } else if (!row || Math.abs(word.top - at) > near) {
        row = document.createElement('span');
        row.className = 'roll-line';
        tray.appendChild(row);
        at = word.top;
      } else {
        row.appendChild(document.createTextNode(' '));
      }

      const box = document.createElement('span');
      box.className = 'roll';
      box.style.height = line;

      const cell = document.createElement('span');
      cell.className = 'roll-in';
      cell.textContent = word.text;

      box.appendChild(cell);
      row.appendChild(box);
      moving.push(cell);
    }

    el.replaceChildren(tray);
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

      /* Layout sizes, not the rectangle on screen. A note pinned at a slant
         reports a bounding box wider and taller than itself, and pinning that
         back onto it makes it grow every time. */
      live.push({
        el, text, from,
        line: getComputedStyle(el).lineHeight,
        h0: el.offsetHeight,
        w0: el.offsetWidth
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
          wasW: el.offsetWidth,
          // objects lie at an angle of their own; writing `transform` outright
          // would straighten them out for the length of the animation
          base: own === 'none' ? '' : ` ${own}`
        };
      })
      .filter(b => b.was.height && b.was.bottom > -80 && b.was.top < innerHeight + 80);

    const held = [...document.querySelectorAll(WordRoll.HOLD || WordRoll.BOXES)]
      .map(el => ({ el, h: el.offsetHeight, was: el.style.height }))
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
      it.last = 0;
      for (const word of it.words) {
        const wait = Math.random() * WordRoll.SPREAD;
        it.last = Math.max(it.last, wait + WordRoll.OUT);

        word.animate(
          [{ transform: 'none', opacity: 1 },
           { transform: 'translateY(110%)', opacity: 0 }],
          {
            duration: WordRoll.OUT,
            delay: wait,
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
      /* The old wording is lifted out of the flow rather than thrown away.

         Its words are still leaving, and each of them was laid out for the
         shape the old text had. Removed here, the ones still in flight would
         vanish mid-stride; left in the flow, they would decide the shape the
         new wording has to fit into. Held aside, each language animates
         within its own layout, and the old markup goes when its last word
         has gone. */
      for (const it of live) {
        it.past = document.createDocumentFragment();
        it.past.append(...it.el.childNodes);

        it.el.textContent = it.text;
        it.el.style.height = '';
        it.el.style.width = '';
      }
      for (const box of held) box.el.style.height = box.was;

      for (const box of boxes) {
        box.now = box.el.getBoundingClientRect();
        box.nowW = box.el.offsetWidth;
      }
      for (const it of live) {
        it.h1 = it.el.offsetHeight;
        it.w1 = it.el.offsetWidth;
      }
      for (const box of held) box.final = box.el.offsetHeight;

      /* Pinned to the shape the new wording will have, so the words arrive
         into their own layout rather than into the old one and shuffle. */
      for (const it of live) {
        it.el.style.height = `${it.h1}px`;
        it.el.style.width = `${it.w1}px`;
      }
      /* Every box is pinned, including the ones whose height is unchanged:
         unchanged means unchanged as plain text, and it is windows that make
         a container grow. Skipping those was enough to let the summary swell
         by a line in the middle of the roll. */
      for (const box of held) box.el.style.height = `${box.final}px`;
      /* The new wording is cut into windows here, while the element is
         holding it as plain text and its line breaks can be read — then it is
         set aside. Each text keeps its old markup until its own last word has
         finished leaving, and takes the new one at that moment. Handing over
         on a shared clock instead means a text whose words left early waits,
         and one whose words left late shows both at once. */
      for (const it of live) {
        it.cells = WordRoll.#split(it.el, it.text, it.line);
        it.fresh = document.createDocumentFragment();
        it.fresh.append(...it.el.childNodes);
        it.el.append(...it.past.childNodes);       // the old wording, still leaving
      }

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

        const grew = Math.abs(box.wasW - box.nowW) > 0.5;

        /* A box that is growing into a new width moves sideways on its own:
           it starts the animation at its old width, so the layout puts it
           where it used to be and carries it across as it grows. Adding a
           sideways transform on top of that sends it the same distance twice
           — out to one side first, then back. */
        if (grew) dx = 0;

        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && !grew) continue;
        moving.push({ el: box.el, dx, dy });

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          box.el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)${box.base}` },
             { transform: box.base.trim() || 'none' }],
            { duration: WordRoll.SHIFT, easing: WordRoll.#glide, fill: 'backwards' }
          );
        }

        /* A box as wide as its label grows into its new width.

           This works only because the words inside are held on one line and
           anchored to the left edge for the duration (see `.wr-hold` in the
           stylesheet). Left to wrap, they would be set into a box still too
           narrow for them and snap into place once it caught up — which is
           the jump this is here to avoid. */
        if (grew) {
          box.el.animate(
            [{ width: `${box.wasW}px` }, { width: `${box.nowW}px` }],
            { duration: WordRoll.SHIFT, easing: WordRoll.#glide, fill: 'backwards' }
          );
        }
      }

      /* Texts that share a line change together.

         A heading made of two spans is two texts here, and letting each take
         its new wording on its own clock leaves the line reading half in one
         language and half in the other — long enough to break onto a second
         line and back. Grouped by the block they sit in, they wait for the
         last word of the whole line. */
      const lines = new Map();
      for (const it of live) {
        const host = it.el.parentElement ?? it.el;
        if (!lines.has(host)) lines.set(host, []);
        lines.get(host).push(it);
      }

      for (const group of lines.values()) {
        const ready = Math.max(...group.map(it => it.last));
        const handover = () => {
          for (const it of group) {
            it.el.replaceChildren(it.fresh);
            WordRoll.#arrive(it.cells);
          }
        };
        const left = ready - (WordRoll.OUT + WordRoll.SPREAD * 0.5);
        left > 4 ? setTimeout(handover, left) : handover();
      }

      /* Back to plain text. The holds are lifted onto a layout that already
         matches them, so this changes nothing anybody can see. */
      setTimeout(() => {
        for (const it of live) {
          it.el.textContent = it.text;
          it.el.style.height = '';
          it.el.style.width = '';
        }
        for (const box of held) box.el.style.height = box.was;
      }, WordRoll.SPREAD + WordRoll.IN + WordRoll.SPREAD + 60);
    }, WordRoll.OUT + WordRoll.SPREAD * 0.5);
  }

  /** Bring one text's words in, each with a small delay of its own. */
  static #arrive(cells) {
    for (const word of cells) {
      /* The starting position is written into the element before the
         animation is made. Relying on the animation's own backwards fill
         leaves a window — a frame can be painted before the fill is applied,
         and the word flashes in its final place first. */
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

  /** How long a change takes, end to end. */
  static duration() {
    return WordRoll.OUT + WordRoll.IN + WordRoll.SPREAD * 1.5 + 120;
  }
}
