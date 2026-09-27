import { BASES, COUNTERS, MOTION, GROUPS, EXTRAS, SUPPORT, INSTALMENT, CORRIDOR }
  from '../data/pricing.js';
import { PRICING_COPY } from '../i18n/pricing.js';
import { Odometer } from './Odometer.js';

/**
 * Lets a visitor assemble a project and watch what it costs.
 *
 * The point is not the final number but the breakdown: every line shows what
 * it adds, so someone whose budget does not fit can see for themselves which
 * compromise is cheaper than they feared.
 *
 * Anything whose scope can change by an order of magnitude — a built scene, a
 * booking system, an identity — is marked open-ended in the data and shown as
 * "from". Pick one and the whole quote is labelled a starting figure, because
 * that is what it is. A calculator that hides this produces a number the
 * studio then has to argue its way out of.
 */
export class PricingConfigurator {
  constructor(root, lang = 'uk') {
    this.root = root;
    this.lang = lang;

    this.state = {
      base: 'custom',
      counts: Object.fromEntries(COUNTERS.map(c => [c.id, c.min])),
      motion: 'calm',
      groups: Object.fromEntries(GROUPS.map(g => [g.id, 'none'])),
      extras: new Set(),
      support: false,
      instalment: false
    };

    this.el = {
      bases:  root.querySelector('#bases'),
      counts: root.querySelector('#counts'),
      motion: root.querySelector('#motion'),
      groups: root.querySelector('#groups'),
      extras: root.querySelector('#extras'),
      after:  root.querySelector('#after'),
      total:  root.querySelector('#big'),
      addon:  root.querySelector('#addon'),
      rangeLead: root.querySelector('#rangeLead'),
      rangeNums: root.querySelector('#rangeNums'),
      rangeTail: root.querySelector('#rangeTail'),
      open:   root.querySelector('#openNote')
    };

    this.odometer = new Odometer(this.el.total);
    this.range = new Odometer(this.el.rangeNums);
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

  /** "+$290" or "from +$1 200", depending on how firm the figure is. */
  #tag(price, open) {
    if (!price) return this.copy.ui.included;
    const sum = PricingConfigurator.money(price);
    return open ? `${this.copy.ui.from} +${sum}` : `+${sum}`;
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
      <div class="row ${x.sub ? 'sub' : ''}" data-count="${x.id}">
        <span class="txt"><b>${c.counters[x.id].name}</b><small>${c.counters[x.id].desc}</small></span>
        <span class="cost">${x.first ? `${c.ui.from} +${m(x.first)}` : `${m(x.unit)} ${c.ui.per}`}</span>
        <span class="stepper">
          <button type="button" data-step="-1" data-for="${x.id}" aria-label="−">−</button>
          <output id="out-${x.id}">${this.state.counts[x.id]}</output>
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
            <span class="cost">${this.#tag(step.price, step.open)}</span>
          </span>
          <small>${c.motion[step.id].desc}</small>
          ${step.showcase
            ? `<a class="showcase" href="${step.showcase}" target="_blank" rel="noopener">${c.ui.showcase}</a>`
            : ''}
        </span>
      </label>`).join('');

    /* Tabs rather than a list of options: only the level being considered
       needs explaining, and one panel at a time keeps four descriptions from
       competing for the same attention. */
    this.el.groups.innerHTML = GROUPS.map(g => `
      <div class="group" data-group="${g.id}">
        <p class="group-head"><b>${c.groups[g.id].name}</b><small>${c.groups[g.id].desc}</small></p>

        <div class="tabs" role="tablist" aria-label="${c.groups[g.id].name}">
          ${g.levels.map(l => `
            <button class="tab" type="button" role="tab"
                    data-level="${l.id}"
                    aria-selected="${this.state.groups[g.id] === l.id}"
                    tabindex="${this.state.groups[g.id] === l.id ? '0' : '-1'}">
              ${c.levels[g.id][l.id].name}
            </button>`).join('')}
        </div>

        <div class="panel" role="tabpanel">
          <p class="panel-head">
            <b data-panel-name="${g.id}"></b>
            <span class="cost" data-panel-cost="${g.id}"></span>
          </p>
          <p class="panel-desc" data-panel-desc="${g.id}"></p>
        </div>
      </div>`).join('');

    this.el.extras.innerHTML = EXTRAS.map(e => `
      <label class="row" data-extra="${e.id}">
        <span class="check"><input type="checkbox" value="${e.id}" ${this.state.extras.has(e.id) ? 'checked' : ''}><span></span></span>
        <span class="txt"><b>${c.extras[e.id].name}</b><small>${c.extras[e.id].desc}</small></span>
        <span class="cost">${this.#tag(e.price, e.open)}</span>
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
      this.state.base = e.target.value;
      this.render();
    });

    this.el.motion.addEventListener('change', e => {
      this.state.motion = e.target.value;
      this.render();
    });

    this.el.groups.addEventListener('click', e => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      this.state.groups[tab.closest('.group').dataset.group] = tab.dataset.level;
      this.render();
    });

    // arrow keys move along a tab list; a keyboard user should not have to
    // tab through four buttons to reach the last one
    this.el.groups.addEventListener('keydown', e => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      const step = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity }[e.key];
      if (step === undefined) return;
      e.preventDefault();

      const list = [...tab.parentElement.querySelectorAll('.tab')];
      const at = list.indexOf(tab);
      const next = list[Math.max(0, Math.min(list.length - 1,
        step === -Infinity ? 0 : step === Infinity ? list.length - 1 : at + step))];

      this.state.groups[tab.closest('.group').dataset.group] = next.dataset.level;
      this.render();
      next.focus();
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
      this.state.counts[id] = Math.max(config.min,
        Math.min(config.max, this.state.counts[id] + Number(button.dataset.step)));
      this.root.querySelector(`#out-${id}`).textContent = this.state.counts[id];
      this.#syncSteppers();
      this.render();
    });
  }

  /** A dead button is more annoying than a disabled one. */
  #syncSteppers() {
    for (const config of COUNTERS) {
      for (const b of this.el.counts.querySelectorAll(`button[data-for="${config.id}"]`)) {
        const step = Number(b.dataset.step);
        b.disabled = (step === -1 && this.state.counts[config.id] === config.min)
                  || (step === 1 && this.state.counts[config.id] === config.max);
      }
    }
  }

  /**
   * Redraw every generated label in the new language and hand back what
   * changed, still showing the old wording.
   *
   * The caller animates it together with the rest of the page: run separately,
   * each label would start its own wave and the page would change in a
   * ragged sequence instead of one sweep.
   *
   * @returns {{el:HTMLElement,text:string}[]}
   */
  setLanguage(lang) {
    // the old DOM is thrown away by build(), so keep the text, not the nodes
    const before = this.#labels().map(el => el.textContent);
    this.lang = lang;
    this.build();
    this.range.replay();      // the numbers turn over with the words around them

    const pairs = [];
    this.#labels().forEach((el, i) => {
      const was = before[i];
      if (was === undefined) return;
      const text = el.textContent;
      el.dataset.raw = was;
      el.textContent = was;          // the wave starts from the old wording
      /* Included even when the wording is the same. A price of "+$180" reads
         alike in every language, and a line standing still while everything
         around it turns over looks like something failed. */
      pairs.push({ el, text });
    });
    return pairs;
  }

  /** Everything on the page that carries words and can be rolled over. */
  #labels() {
    return [...this.root.querySelectorAll(
      '.row .txt b, .row .txt small, .cost, ' +
      '.group-head b, .group-head small, .tab, .panel-head b, .panel-desc, ' +
      '.step-head b, .step small, .showcase, ' +
      '#rangeLead, #rangeTail, #openNote, #addon')];
  }

  /** Whether a counter has anything to say yet. */
  needed(counter) {
    if (!counter.needs) return true;
    const on = COUNTERS.find(x => x.id === counter.needs);
    return this.state.counts[counter.needs] > on.min;
  }

  /* ── maths ───────────────────────────────────────────── */

  /** What a counter costs above the minimum a project already includes. */
  static #units(config, value) {
    const n = Math.max(0, value - config.min);
    if (!n) return 0;
    return config.first ? config.first + (n - 1) * config.unit : n * config.unit;
  }

  calculate() {
    const { state } = this;
    const base = BASES.find(b => b.id === state.base);
    const motion = MOTION.find(m => m.id === state.motion);

    let total = base.price + motion.price;
    let open = base.open || motion.open;

    for (const counter of COUNTERS) {
      if (!this.needed(counter)) continue;
      total += PricingConfigurator.#units(counter, state.counts[counter.id]);
    }

    for (const group of GROUPS) {
      const level = group.levels.find(l => l.id === state.groups[group.id]);
      total += level.price;
      if (level.price && level.open) open = true;
    }

    for (const extra of EXTRAS) {
      if (!state.extras.has(extra.id)) continue;
      total += extra.price;
      if (extra.open) open = true;
    }

    // support follows what can break, not the size of the bill
    let support = SUPPORT.base + (SUPPORT.motion[state.motion] ?? 0);
    for (const [id, add] of Object.entries(SUPPORT.groups)) {
      if (state.groups[id] && state.groups[id] !== 'none') support += add;
    }
    for (const [id, add] of Object.entries(SUPPORT.extras)) {
      if (state.extras.has(id)) support += add;
    }

    const rounded = PricingConfigurator.round50(total);
    const high = open ? CORRIDOR.openHigh : CORRIDOR.high;

    return {
      total, rounded, support, open,
      monthly: rounded * INSTALMENT.markup / INSTALMENT.months,
      low: Math.floor(total * CORRIDOR.low / 50) * 50,
      high: Math.ceil(total * high / 50) * 50,
      pages: state.counts.pages,
      langs: state.counts.langs,
      rounds: state.counts.rounds
    };
  }

  /* ── output ──────────────────────────────────────────── */

  render() {
    const m = PricingConfigurator.money;
    const c = this.copy;
    const q = this.calculate();
    const { state, el } = this;

    const sum = state.instalment
      ? `${m(Math.round(q.monthly / 5) * 5)}${c.ui.month}`
      : m(q.rounded);
    this.odometer.set(`${q.open ? c.ui.from : '≈'} ${sum}`);

    let addon = state.instalment ? c.ui.months : '';
    if (state.support) {
      addon += `${addon ? '  ·  ' : ''}+ ${m(q.support)}${c.ui.month} ${c.ui.supportShort}`;
    }
    el.addon.textContent = addon;

    /* Three parts rather than one line of markup: the words change with the
       language and roll over, the numbers change with every click and are
       left to the eye. */
    el.rangeLead.textContent = c.ui.corridor;
    this.range.set(`${m(q.low)} – ${m(q.high)}.`);
    el.rangeTail.textContent = c.ui.afterBrief;
    el.open.textContent = q.open ? c.ui.openNote : '';
    el.open.hidden = !q.open;

    el.supCost.textContent = `+${m(q.support)}${c.ui.month}`;
    el.splitCost.textContent = `≈ ${m(Math.round(q.monthly / 5) * 5)}${c.ui.month}`;

    /* Translation is nothing to decide about until there is a second
       language, so the line stays out of the way until there is one. */
    for (const counter of COUNTERS) {
      const row = this.root.querySelector(`.row[data-count="${counter.id}"]`);
      if (row) row.hidden = !this.needed(counter);
    }

    for (const group of GROUPS) {
      const id = state.groups[group.id];
      const level = group.levels.find(l => l.id === id);
      const words = c.levels[group.id][id];

      for (const tab of this.root.querySelectorAll(`[data-group="${group.id}"] .tab`)) {
        const on = tab.dataset.level === id;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      }

      const name = this.root.querySelector(`[data-panel-name="${group.id}"]`);
      const cost = this.root.querySelector(`[data-panel-cost="${group.id}"]`);
      const desc = this.root.querySelector(`[data-panel-desc="${group.id}"]`);
      if (!name) continue;

      name.textContent = words.name;
      cost.textContent = id === 'none' ? '—' : this.#tag(level.price, level.open);
      desc.textContent = words.desc || '';

      /* The panel announces itself only when the tab actually changed.
         Replayed on every redraw it flashes once whenever anything else on
         the page is rebuilt — a language switch, for instance. */
      if (this.shown?.[group.id] !== id) {
        const panel = name.closest('.panel');
        panel.classList.remove('turned');
        void panel.offsetWidth;
        panel.classList.add('turned');
      }
    }

    for (const row of this.root.querySelectorAll('.row')) {
      const counter = row.dataset.count;
      const input = row.querySelector('input');
      const config = counter && COUNTERS.find(x => x.id === counter);
      const chosen = config
        ? this.state.counts[counter] > config.min
        : Boolean(input?.checked);
      row.classList.toggle('active', chosen && row.dataset.level !== 'none');
    }
    this.shown = Object.fromEntries(GROUPS.map(g => [g.id, state.groups[g.id]]));

    for (const step of this.root.querySelectorAll('.step')) {
      step.classList.toggle('active', step.dataset.motion === state.motion);
    }
  }
}
