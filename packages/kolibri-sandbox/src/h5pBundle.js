import jQuery from 'jquery';
/* eslint-disable import/no-unresolved */
/*
 * These files are temporarily brought in
 * for building new versions of our H5P vendor
 * bundle, so are not actually always present.
 */
import '../vendor/h5p/styles/h5p.css';
import '../vendor/h5p/styles/h5p-core-button.css';
import '../vendor/h5p/styles/h5p-confirmation-dialog.css';

const logging = console; //elsint-disable-line no-console

window.H5P = {
  jQuery,
  // H5P complains if this is undefined, but because of our monkey patching
  // this is never used.
  OfflineRequestQueue: function () {},
  externalEmbed: true,
  preventInit: true,
};

window.$ = window.jQuery = jQuery;

window.H5P.jQuery.fn.__originalLoad = window.H5P.jQuery.load;

window.H5P.jQuery.fn.load = function (url) {
  /**
   * NOTE:
   * This is needed in order to support old libraries that uses the .load() function
   * for elements in the deprecated jQuery way (elem.load(fn)), the correct way to do this
   * now is elem.on('load', fn)
   */
  if (typeof url === 'function') {
    logging.warn('You are using a deprecated H5P library. Please upgrade!');
    const args = Array.prototype.slice.call(arguments);
    args.unshift('load');
    return window.H5P.jQuery.fn.on.apply(this, args);
  }

  return window.H5P.jQuery.fn.__originalLoad.apply(this, arguments);
};

require('../vendor/h5p/js/h5p');
require('../vendor/h5p/js/h5p-event-dispatcher');
require('../vendor/h5p/js/h5p-x-api');
require('../vendor/h5p/js/h5p-x-api-event');
require('../vendor/h5p/js/h5p-content-type');
require('../vendor/h5p/js/h5p-confirmation-dialog');
require('../vendor/h5p/js/h5p-resizer');
/* eslint-enable */
