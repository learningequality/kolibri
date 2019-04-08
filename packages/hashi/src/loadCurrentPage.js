import replaceScript from './replaceScript';

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

export function setContent(contents) {
  document.documentElement.innerHTML = contents;

  // First generate the callbacks for all script tags.
  // This will create insertion operations for all script tags
  const $scripts = document.querySelectorAll('script');

  const $nonDeferredScripts = [].filter.call($scripts, script => !script.defer);
  const $deferredScripts = [].filter.call($scripts, script => script.defer);

  const runList = $nonDeferredScripts.concat($deferredScripts).map(function($script) {
    return function(callback) {
      const cb = () => {
        try {
          delete window.onerror;
        } catch (e) {} // eslint-disable-line no-empty
        callback();
      };
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

export default function loadCurrentPage() {
  const req = new XMLHttpRequest();
  req.addEventListener('load', () => {
    setContent(req.responseText);
  });
  req.open('GET', window.location.href);
  req.send();
}
