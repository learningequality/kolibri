import URL from 'core-js/web/url';

function addSkipHashiGetParam(url) {
  /*
   * Function to add a get param to prevent manipulation of any returned HTML
   * in order to prevent dynamically loaded HTML being modified.
   */
  url = new URL(url, window.location.href);
  url.searchParams.append('SKIP_HASHI', true);
  return url.toString();
}

export default function() {
  // Make sure async calls add the SKIP_HASHI GET param to return
  // unparsed HTML for dynamic loading.
  XMLHttpRequest.prototype.origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(...args) {
    args[1] = addSkipHashiGetParam(args[1]);
    return this.origOpen.apply(this, args);
  };
  if (window.fetch) {
    const origFetch = window.fetch;
    window.fetch = function(...args) {
      args[0] = addSkipHashiGetParam(args[0]);
      return origFetch(...args);
    };
  }
}
