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
      // If finished trigger all the DOM Content Loaded event
      const DOMContentLoadedEvent = document.createEvent('Event');
      DOMContentLoadedEvent.initEvent('DOMContentLoaded', true, true);
      document.dispatchEvent(DOMContentLoadedEvent);
      const $body = document.querySelector('body');
      if ($body && $body.onload) {
        $body.onload();
      }
    }
  }

  if (arr.length) {
    const fn = arr[index];

    fn(callback);
  }
}

export function setContent(contents) {
  document.documentElement.innerHTML = contents;

  // First generate the callbacks for all script tags.
  // This will create insertion operations for all script tags
  const $scripts = document.querySelectorAll('script');

  const runList = [].map.call($scripts, function($script) {
    return function(callback) {
      replaceScript($script, callback);
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
