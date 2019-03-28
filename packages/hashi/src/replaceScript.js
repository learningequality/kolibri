/*
 * Modified from https://ghinda.net/article/script-tags/
 */

// https://html.spec.whatwg.org/multipage/scripting.html
export const runScriptTypes = [
  'application/javascript',
  'application/ecmascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
];

export default function replaceScript($script, callback) {
  if (!$script.loaded) {
    $script.loaded = true;
    const s = document.createElement('script');
    s.type = 'text/javascript';
    [].forEach.call($script.attributes, attribute => {
      // Set src later when everything else
      // has been set.
      if (attribute.name !== 'src') {
        s.setAttribute(attribute.name, attribute.value);
      }
    });
    if ($script.src) {
      const cb = () => {
        // Clean up onload and onerror handlers
        // after they have been triggered to avoid
        // these being called again.
        delete s.onload;
        delete s.onerror;
        callback();
      };
      s.onload = cb;
      s.onerror = cb;
      s.src = $script.src;
      s.async = false;
    } else {
      s.innerHTML = $script.innerHTML;
    }

    const parentNode = $script.parentNode;

    const typeAttr = $script.getAttribute('type');

    // only run script tags without the type attribute
    // or with a javascript mime attribute value
    if (!typeAttr || runScriptTypes.indexOf(typeAttr) !== -1) {
      // Remove the element so that we don't clutter the DOM
      // with duplicates.
      parentNode.removeChild($script);
      // re-insert the script tag so it executes.
      parentNode.appendChild(s);
    }

    // run the callback immediately for inline scripts
    if (!$script.src) {
      callback();
    }
  }
}
