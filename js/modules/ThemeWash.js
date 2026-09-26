/**
 * Switching the theme is a flood of paint spreading from the switch.
 *
 * What spreads is the new theme itself, not a coloured disc: inside the wet
 * area the page is already in the new theme, outside it is still in the old
 * one. The View Transitions API is what makes that possible — it snapshots
 * both states and lets the new one be clipped to a growing circle.
 *
 * Where the API is missing the theme simply changes, which is the honest
 * fallback: a fake disc of flat colour would look worse than no animation.
 */
export class ThemeWash {
  static DURATION = 1000;

  /**
   * @param {HTMLElement} origin element the flood starts from
   * @param {() => void} commit  applies the new theme
   */
  static run(origin, commit) {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || !document.startViewTransition) { commit(); return; }

    const rect = origin.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    ) * 1.04;

    // strip the blended texture for the duration: snapshotting those layers
    // is what makes the transition stutter
    const root = document.documentElement;
    root.classList.add('switching');

    const transition = document.startViewTransition(commit);

    const done = () => root.classList.remove('switching');
    transition.finished.then(done).catch(done);

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: ThemeWash.DURATION,
          easing: 'cubic-bezier(.34,.02,.22,1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    }).catch(() => { /* transition unsupported mid-flight: nothing to undo */ });
  }
}
