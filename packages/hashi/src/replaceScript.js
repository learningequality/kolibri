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
  const s = document.createElement('script');
  s.type = 'text/javascript';
  if ($script.src) {
    s.onload = callback;
    s.onerror = callback;
    s.src = $script.src;
  } else {
    s.innerHTML = $script.innerHTML;
  }

  const parentNode = $script.parentNode;

  // Remove the element so that we don't clutter the DOM
  // with duplicates.
  parentNode.removeChild($script);

  const typeAttr = $script.getAttribute('type');

  // only run script tags without the type attribute
  // or with a javascript mime attribute value
  if (!typeAttr || runScriptTypes.indexOf(typeAttr) !== -1) {
    // re-insert the script tag so it executes.
    parentNode.appendChild(s);
  }

  // run the callback immediately for inline scripts
  if (!$script.src) {
    callback();
  }
}
