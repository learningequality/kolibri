// Browsers that pass this ES2023 Array-copy test meet the cutoff in ./cutoff.js
// and natively support every module in the polyfill bundle.
export default function needsPolyfills() {
  const p = Array.prototype;
  const methods = ['toSorted', 'toReversed', 'toSpliced', 'with'];
  return !methods.every(m => typeof p[m] === 'function');
}
