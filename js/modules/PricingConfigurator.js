import { BASES, COUNTERS, MOTION, EXTRAS, SUPPORT, INSTALMENT, CORRIDOR }
  from '../data/pricing.js';
import { PRICING_COPY } from '../i18n/pricing.js';
import { Odometer } from './Odometer.js';
import { Flip } from './Flip.js';

/**
 * Lets a visitor assemble a project and watch what it costs.
 *
 * The point is not the final number but the breakdown: every line shows what
 * it adds, so someone whose budget does not fit can see for themselves which
 * compromise is cheaper than they feared.
 *
 * Picking a starting point rewrites the whole configuration — pages, motion
 * level and pre-selected options — because a "base" here is a preset, not a
 * sealed package. Everything can then be unticked and the total follows.
 */
export class PricingConfigurator {
  constructor(root, lang = 'uk') {
    this.root = root;
    this.lang = lang;
    this.state = {
      base: 'one',
      pages: 0, langs: 0, rounds: 0,
      motion: 'calm',
      extras: new Set(),
      support: false,
      instalment: false
    };

    this.el = {
      bases:  root.querySelector('#bases'),
      counts: root.querySelector('#counts'),
      motion: root.querySelector('#motion'),
      extras: root.querySelector('#extras'),
      after:  root.querySelector('#after'),
      total:  root.querySelector('#big'),
      addon:  root.querySelector('#addon'),
      range:  root.querySelector('#rangeLine'),
      picked: root.querySelector('#picked'),
      order:  root.querySelector('#order')
    };

    this.odometer = new Odometer(this.el.total);
    this.applyBase('one');
    this.build();
    this.#bind();
  }

  get copy() { return PRICING_COPY[this.lang] ?? PRICING_COPY.uk; }

  /* ── formatting ──────────────────────────────────────── */

  static money(n) {
    return '$' + Math.round(n).toLocaleString('uk-UA').replace(/\u00A0/g, ' ');
  }

  static round50(n) { return Math.round(n / 50) * 50; }

  /** Slavic plural rules; English tables simply repeat the same word. */
  static plural(n, forms) {
    const hundred = n % 100;
    const ten = n % 10;
    if (hundred > 10 && hundred < 20) return forms[2];
    if (ten === 1) return forms[0];
    if (ten >= 2 && ten <= 4) return forms[1];
    return forms[2];
  }

  /* ── presets ─────────────────────────────────────────── */

  /** @param {string} id */
  applyBase(id) {
    const base = BASES.find(b => b.id === id);
    if (!base) return;

    this.state.base = id;
    this.state.motion = base.motion;
    this.state.extras = new Set(
      base.includes === '*' ? EXTRAS.map(e => e.id) : base.includes
    );
  }

  /* ── markup ──────────────────────────────────────────── */

  build() {
    const m = PricingConfigurator.money;
    const c = this.copy;

    this.el.bases.innerHTML = BASES.map(b => `
      <label class="row" data-base="${b.id}">
        <span class="check radio">
          <input type="radio" name="base" value="${b.id}" ${b.id === this.state.base ? 'checked' : ''}>
          <span></span>
        </span>
        <span class="txt"><b>${c.bases[b.id].name}</b><small>${c.bases[b.id].desc}</small></span>
        <span class="cost">${c.ui.from} ${m(b.price)}</span>
      </label>`).join('');

    this.el.counts.innerHTML = COUNTERS.map(x => `
      <div class="row" data-count="${x.id}">
        <span class="txt"><b>${c.counters[x.id].name}</b><small>${c.counters[x.id].desc}</small></span>
        <span class="cost">${m(x.unit)} ${c.ui.per}</span>
        <span class="stepper">
          <button type="button" data-step="-1" data-for="${x.id}" aria-label="−">−</button>
          <output id="out-${x.id}">${this.state[x.id]}</output>
          <button type="button" data-step="1" data-for="${x.id}" aria-label="+">+</button>
        </span>
      </div>`).join('');

    // Motion is presented as steps, not options: the visitor should see the
    // distance between a tidy site and a built scene before asking a price.
    this.el.motion.innerHTML = MOTION.map((step, i) => `
      <label class="step ${step.id === 'scene' ? 'step-top' : ''}" data-motion="${step.id}">
        <input type="radio" name="motion" value="${step.id}" ${step.id === this.state.motion ? 'checked' : ''}>
        <span class="step-body">
          <span class="step-head">
            <span class="step-n">${String(i + 1).padStart(2, '0')}</span>
            <span class="step-tick" aria-hidden="true"></span>
            <b>${c.motion[step.id].name}</b>
            <span class="cost">${step.price ? '+' + m(step.price) : c.ui.included}</span>
          </span>
          <small>${c.motion[step.id].desc}</small>
          ${step.showcase
            ? `<a class="showcase" href="${step.showcase}" target="_blank" rel="noopener">${c.ui.showcase}</a>`
            : ''}
        </span>
      </label>`).join('');

    this.el.extras.innerHTML = EXTRAS.map(e => `
      <label class="row" data-extra="${e.id}">
        <span class="check"><input type="checkbox" value="${e.id}" ${this.state.extras.has(e.id) ? 'checked' : ''}><span></span></span>
        <span class="txt"><b>${c.extras[e.id].name}</b><small>${c.extras[e.id].desc}</small></span>
        <span class="cost">+${m(e.price)}</span>
      </label>`).join('');

    this.el.after.innerHTML = `
      <label class="row" data-after="support">
        <span class="check"><input type="checkbox" id="support" ${this.state.support ? 'checked' : ''}><span></span></span>
        <span class="txt"><b>${c.ui.support}</b><small>${c.ui.supportDesc}</small></span>
        <span class="cost" id="supCost"></span>
      </label>
      <label class="row" data-after="instalment">
        <span class="check"><input type="checkbox" id="instalment" ${this.state.instalment ? 'checked' : ''}><span></span></span>
        <span class="txt"><b>${c.ui.instalment}</b><small>${c.ui.instalmentDesc}</small></span>
        <span class="cost" id="splitCost"></span>
      </label>`;

    this.el.supCost = this.root.querySelector('#supCost');
    this.el.splitCost = this.root.querySelector('#splitCost');

    this.#syncSteppers();
    this.render();
  }

  /* ── events ──────────────────────────────────────────── */

  #bind() {
    this.el.bases.addEventListener('change', e => {
      this.applyBase(e.target.value);
      this.build();           // a preset rewrites motion and options too
    });

    this.el.motion.addEventListener('change', e => {
      this.state.motion = e.target.value;
      this.render();
    });

    this.el.extras.addEventListener('change', e => {
      const id = e.target.value;
      e.target.checked ? this.state.extras.add(id) : this.state.extras.delete(id);
      this.render();
    });

    this.el.after.addEventListener('change', e => {
      if (e.target.id === 'support') this.state.support = e.target.checked;
      if (e.target.id === 'instalment') this.state.instalment = e.target.checked;
      this.render();
    });

    this.el.counts.addEventListener('click', e => {
      const button = e.target.closest('button[data-step]');
      if (!button) return;
      const id = button.dataset.for;
      const config = COUNTERS.find(x => x.id === id);
      this.state[id] = Math.max(0,
        Math.min(config.max, this.state[id] + Number(button.dataset.step)));
      this.root.querySelector(`#out-${id}`).textContent = this.state[id];
      this.#syncSteppers();
      this.render();
    });
  }

  /** A dead button is more annoying than a disabled one. */
  #syncSteppers() {
    for (const config of COUNTERS) {
      for (const b of this.el.counts.querySelectorAll(`button[data-for="${config.id}"]`)) {
        const step = Number(b.dataset.step);
        b.disabled = (step === -1 && this.state[config.id] === 0)
                  || (step === 1 && this.state[config.id] === config.max);
      }
    }
  }

  /** Redraw every generated label after a language switch. */
  setLanguage(lang) {
    // the old DOM is thrown away by build(), so keep the text, not the nodes
    const before = this.#labels().map(el => el.textContent);
    this.lang = lang;
    this.build();
    const after = this.#labels();

    // pair old and new text of the same cell, so each one dissolves in place
    after.forEach((el, i) => {
      const was = before[i];
      if (was !== undefined && was !== el.textContent) {
        const to = el.textContent;
        el.dataset.raw = was;
        el.textContent = was;
        Flip.run(el, to);
      }
    });
  }

  #labels() {
    return [...this.root.querySelectorAll(
      '.row .txt b, .row .txt small, .row .cost, .step-head b, .step small, .showcase')];
  }

  /* ── maths ───────────────────────────────────────────── */

  calculate() {
    const { state } = this;
    const base = BASES.find(b => b.id === state.base);
    const motion = MOTION.find(m => m.id === state.motion);

    let total = base.price + motion.price;
    for (const counter of COUNTERS) total += state[counter.id] * counter.unit;
    for (const extra of EXTRAS) if (state.extras.has(extra.id)) total += extra.price;

    let support = SUPPORT.base + (SUPPORT.motion[state.motion] ?? 0);
    for (const [id, add] of Object.entries(SUPPORT.surcharge)) {
      if (state.extras.has(id)) support += add;
    }

    const rounded = PricingConfigurator.round50(total);

    return {
      total, rounded, support,
      monthly: rounded * INSTALMENT.markup / INSTALMENT.months,
      low: Math.floor(total * CORRIDOR.low / 50) * 50,
      high: Math.ceil(total * CORRIDOR.high / 50) * 50,
      pages: base.pages + state.pages
    };
  }

  /** The note beside the price changes with the same effect as the copy. */
  #setAddon(text) {
    const el = this.el.addon;
    const current = el.dataset.raw ?? el.textContent;
    if (current === text) return;
    Flip.run(el, text);
  }

  /* ── output ──────────────────────────────────────────── */

  render() {
    const m = PricingConfigurator.money;
    const c = this.copy;
    const q = this.calculate();
    const { state, el } = this;

    this.odometer.set(state.instalment
      ? `≈ ${m(Math.round(q.monthly / 5) * 5)}${c.ui.month}`
      : `≈ ${m(q.rounded)}`);
    this.#setAddon(state.instalment ? c.ui.months : '');

    if (state.support) {
      this.#setAddon(el.addon.dataset.raw ??
        `${state.instalment ? '  ·  ' : ''}+ ${m(q.support)}${c.ui.month} ${c.ui.supportShort}`);
    }

    el.range.innerHTML =
      `${c.ui.corridor} <em>${m(q.low)} – ${m(q.high)}</em>. ${c.ui.afterBrief}`;

    const bits = [
      `${q.pages} ${PricingConfigurator.plural(q.pages, c.ui.pageWord)}`,
      c.motion[state.motion].name.toLowerCase()
    ];
    if (state.langs) bits.push(`${state.langs + 1} ${c.ui.langWord}`);
    if (state.rounds) bits.push(`${2 + state.rounds} ${c.ui.roundWord}`);
    const chosen = EXTRAS.filter(e => state.extras.has(e.id))
      .map(e => c.extras[e.id].name.toLowerCase());
    el.picked.textContent = bits.join(', ') + (chosen.length ? `  ·  ${chosen.join(', ')}` : '');

    el.supCost.textContent = `+${m(q.support)}${c.ui.month}`;
    el.splitCost.textContent = `≈ ${m(Math.round(q.monthly / 5) * 5)}${c.ui.month}`;

    for (const row of this.root.querySelectorAll('.row')) {
      const counter = row.dataset.count;
      const input = row.querySelector('input');
      row.classList.toggle('active',
        counter ? this.state[counter] > 0 : Boolean(input?.checked));
    }
    for (const step of this.root.querySelectorAll('.step')) {
      step.classList.toggle('active', step.dataset.motion === state.motion);
    }
  }
}
