// Legacy-cohort cutoff, not a completeness check: browsers that pass this
// ES2023 Array-copy test still lack part of the bundled core-js set.
// No feature test separates that set cleanly at any core-js version.
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
