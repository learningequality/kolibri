// Legacy-cohort cutoff, not a completeness check: browsers that pass this
// ES2023 Array-copy test still lack part of the bundled core-js set.
// No feature test separates that set cleanly at any core-js version.
export default function needsPolyfills() {
  const p = Array.prototype;
  const methods = ['toSorted', 'toReversed', 'toSpliced', 'with'];
  return !methods.every(m => typeof p[m] === 'function');
}
