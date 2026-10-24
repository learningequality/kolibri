import needsPolyfills from 'browserslist-config-kolibri/needsPolyfills';

if (needsPolyfills()) {
  const url = document.currentScript.dataset.polyfillUrl;
  document.write('<script src="' + url + '"></script>');
}
