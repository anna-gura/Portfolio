/**
 * Theme and language are remembered between pages and visits.
 *
 * Storage can be unavailable (private mode, an embedded preview), so every
 * access is guarded: a site that cannot remember a preference is a small
 * annoyance, a site that throws on load is a broken one.
 */
export class Prefs {
  static KEY = 'pfs.prefs';

  static read() {
    try {
      return JSON.parse(localStorage.getItem(Prefs.KEY)) ?? {};
    } catch {
      return {};
    }
  }

  /** @param {object} patch */
  static write(patch) {
    try {
      localStorage.setItem(Prefs.KEY, JSON.stringify({ ...Prefs.read(), ...patch }));
    } catch {
      /* nothing to do: the visitor simply starts fresh next time */
    }
  }

  static get theme() { return Prefs.read().theme ?? null; }
  static set theme(v) { Prefs.write({ theme: v }); }

  static get lang() { return Prefs.read().lang ?? null; }
  static set lang(v) { Prefs.write({ lang: v }); }
}
