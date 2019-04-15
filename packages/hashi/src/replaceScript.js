export function getScripts() {
  const $scripts = document.querySelectorAll('template[hashi-script="true"]');
  return [].map.call($scripts, $template => {
    const parentNode = $template.parentNode;
    const node = $template.content.children[0];
    parentNode.removeChild($template);
    // Keep a record of the parent node for later
    // reattaching.
    node._parentNode = parentNode;
    return node;
  });
}

function generateSingleInvocationFn(callback) {
  return function() {
    if (!callback.called) {
      callback.called = true;
      callback();
    }
  };
}

/*
 * Modified from https://ghinda.net/article/script-tags/
 */
export function replaceScript($script, callback) {
  if ($script) {
    if (!$script.loaded) {
      $script.loaded = true;
      if ($script.src) {
        $script.onload = callback;
        $script.onerror = callback;
      }

      const parentNode = $script._parentNode;

      parentNode.appendChild($script);

      // run the callback immediately for inline scripts
      if (!$script.src) {
        callback();
      }
    }
  } else {
    callback();
  }
}

/*
 * runs an array of async functions in sequential order
 */
export function seq(arr, index) {
  // first call, without an index
  if (typeof index === 'undefined') {
    index = 0;
  }

  function callback() {
    index++;
    if (index < arr.length) {
      seq(arr, index);
    } else {
      // If finished trigger the DOM Content Loaded event and the load event
      // Normally DOMContentLoaded would be triggered before the load event
      // but we have already waited for the DOM to be inserted here, and
      // then executed all the scripts, so we have a slightly less efficient
      // rendering path, but we can be sure that both are appropriate to
      // trigger at this point.
      const DOMContentLoadedEvent = document.createEvent('Event');
      DOMContentLoadedEvent.initEvent('DOMContentLoaded', true, true);
      const loadEvent = document.createEvent('Event');
      loadEvent.initEvent('load', true, true);
      document.dispatchEvent(DOMContentLoadedEvent);
      document.dispatchEvent(loadEvent);
      window.dispatchEvent(loadEvent);
      const elements = document.querySelectorAll(':not(script)');
      Array.prototype.forEach.call(elements, element => {
        element.dispatchEvent(loadEvent);
      });
    }
  }

  if (arr.length) {
    const fn = arr[index];

    fn(callback);
  } else {
    callback();
  }
}

export function setScripts($scripts) {
  // First generate the callbacks for all script tags.
  // This will create insertion operations for all script tags

  const $nonDeferredScripts = [].filter.call($scripts, script => !script.defer);
  const $deferredScripts = [].filter.call($scripts, script => script.defer);

  const runList = $nonDeferredScripts.concat($deferredScripts).map(function($script) {
    return function(callback) {
      const cb = generateSingleInvocationFn(callback);
      window.onerror = cb;
      try {
        replaceScript($script, cb);
      } catch (e) {
        cb();
      }
    };
  });

  // insert the script tags sequentially
  // to preserve execution order
  seq(runList);
}

export function executePage() {
  const scripts = getScripts();
  setScripts(scripts);
}
