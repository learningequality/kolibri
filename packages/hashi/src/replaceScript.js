export function getScripts(doc) {
  const $scripts = doc.querySelectorAll('template[hashi-script="true"]');
  return [].map.call($scripts, $template => {
    const parentNode = $template.parentNode;
    const node = $template.content.children[0];
    if ($template.hasAttribute('async')) {
      node.setAttribute('async', node.getAttribute('async') || true);
    } else {
      node.removeAttribute('async');
    }
    parentNode.removeChild($template);
    // Keep a record of the parent node for later
    // reattaching.
    node._parentNode = parentNode;
    return node;
  });
}

/*
 * Modified from https://ghinda.net/article/script-tags/
 */
export function replaceScript($script, callback) {
  if ($script) {
    if (!$script.loaded) {
      $script.loaded = true;
      if ($script.src && !$script.hasAttribute('async')) {
        $script.onload = callback;
        $script.onerror = callback;
      }

      const parentNode = $script._parentNode;

      document.write = function(domString) {
        const template = document.createElement('template');
        template.innerHTML = domString;
        parentNode.appendChild(template.content.firstChild);
      };

      parentNode.appendChild($script);

      // run the callback immediately for inline scripts
      // and for async loading scripts.
      if (!$script.src || $script.hasAttribute('async')) {
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
      if (document.readyState === 'complete') {
        // Only call this if the document is already fully loaded
        // and we need to emulate the window load event.
        document.dispatchEvent(loadEvent);
        window.dispatchEvent(loadEvent);
      }
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

function createCallback($script) {
  return function(callback) {
    window.onerror = callback;
    try {
      replaceScript($script, callback);
    } catch (e) {
      callback();
    }
  };
}

export function setScripts() {
  // First generate the callbacks for all script tags.
  // This will create insertion operations for all script tags
  const documentWriteOriginal = document.write;
  const fragment = document.createDocumentFragment();
  const body = document.documentElement.removeChild(document.body);
  fragment.appendChild(body);

  const headScripts = getScripts(document);
  const bodyScripts = getScripts(fragment);
  // Populate the run list initially with the scripts in <head>
  const runList = headScripts.map(createCallback);
  // When all those have been executed, attach the body back into
  // the document
  runList.push(function(callback) {
    document.documentElement.appendChild(fragment);
    callback();
  });
  // Now add all the scripts from the body of the document to the run list
  runList.push(...bodyScripts.map(createCallback));
  // Lastly, reinstate the original document.write once all intermediary
  // rendering has finished.
  runList.push(function(callback) {
    document.write = documentWriteOriginal;
    callback();
  });

  // insert the script tags sequentially
  // to preserve execution order
  seq(runList);
}

function supportsTemplate() {
  return 'content' in document.createElement('template');
}

export function executePage() {
  // If the browser we are in does not support templates,
  // then the foregoing script tags inside template tags
  // have already been executed.
  if (supportsTemplate()) {
    if (document.readyState !== 'loading') {
      setScripts();
    } else {
      window.addEventListener('DOMContentLoaded', setScripts, { once: true });
    }
  }
}
