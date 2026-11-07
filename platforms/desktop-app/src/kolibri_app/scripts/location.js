(function () {
  // WebView2 also runs document-created scripts in child frames.
  if (window.top !== window) {
    return;
  }
  function report() {
    window.__BRIDGE__.postMessage(JSON.stringify({ type: '__TYPE__', url: location.href }));
  }
  // vue-router 3 hash mode navigates with history.pushState, which raises no hashchange.
  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    history[name] = function () {
      var result = original.apply(this, arguments);
      report();
      return result;
    };
  });
  window.addEventListener('popstate', report);
})();
