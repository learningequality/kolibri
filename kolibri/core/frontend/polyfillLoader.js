// Feature test for core-js 3.31 long-pole: ES2023 Array copy methods
// (Array.prototype.toSorted / toReversed / toSpliced / with).
// All browsers that natively support these also support the full
// core-js 3.31 polyfill set — no generation from core-js-compat needed.
// The pinned core-js version is corejs: '3.31' in kolibri/core/buildConfig.js —
// revisit this test when bumping that value.
(function () {
  var p = Array.prototype;
  var methods = ['toSorted', 'toReversed', 'toSpliced', 'with'];
  var hasAllMethods = methods.every(function (m) {
    return typeof p[m] === 'function';
  });
  if (!hasAllMethods) {
    var url = document.currentScript.dataset.polyfillUrl;
    document.write('<script src="' + url + '"></script>');
  }
})();
