/* eslint-disable no-console */
// Injected into every page by KolibriView._setup_bridge on the WebKit backends.
// `__BRIDGE__` and `__TYPE__` are substituted in Python before injection.
(function () {
  function filenameFromDisposition(response) {
    var disposition = response.headers.get('Content-Disposition') || '';
    var match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    if (!match) {
      return '';
    }
    var value = match[1].trim();
    try {
      // Only the filename*= form is percent-encoded; a plain filename= carrying
      // a literal % (a facility named "100% School", say) would throw here.
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }
  function readAsBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var encoded = reader.result;
        resolve(encoded.substring(encoded.indexOf(',') + 1));
      };
      reader.onerror = function () {
        reject(reader.error || new Error('could not read the response'));
      };
      reader.readAsDataURL(blob);
    });
  }
  document.addEventListener(
    'click',
    function (event) {
      var anchor = event.target.closest && event.target.closest('a[download]');
      if (!anchor || !anchor.href) {
        return;
      }
      event.preventDefault();
      // Read the attributes now: the exporters remove the anchor as soon as the
      // synthetic click returns, well before the fetch below resolves.
      var url = anchor.href;
      var named = anchor.getAttribute('download');
      var filename;
      fetch(url, { credentials: 'same-origin' })
        .then(function (response) {
          if (!response.ok) {
            // Otherwise the error page's body would be saved as the download.
            throw new Error('HTTP ' + response.status);
          }
          filename = named || filenameFromDisposition(response);
          return response.blob();
        })
        .then(readAsBase64)
        .then(function (data) {
          window.__BRIDGE__.postMessage(
            JSON.stringify({ type: '__TYPE__', filename: filename, data: data })
          );
        })
        .catch(function (error) {
          console.error('Kolibri: could not download ' + url, error);
        });
    },
    true
  );
})();
