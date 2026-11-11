(function () {
  var origin = __ORIGIN__;
  var saved = __LOCATION__;
  var key = 'kolibri-restore-' + __TOKEN__;
  if (window.top !== window || location.origin !== origin || sessionStorage.getItem(key)) {
    return;
  }
  sessionStorage.setItem(key, '1');
  var hashIndex = saved.indexOf('#');
  if (hashIndex !== -1 && location.pathname + location.search === saved.slice(0, hashIndex)) {
    history.replaceState(history.state, '', saved);
  }
})();
