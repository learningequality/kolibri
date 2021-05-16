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

window.H5P = {
  jQuery,
  OfflineRequestQueue: function() {},
};

window.$ = window.jQuery = jQuery;

require('../vendor/h5p/js/h5p');
require('../vendor/h5p/js/h5p-event-dispatcher');
require('../vendor/h5p/js/h5p-x-api');
require('../vendor/h5p/js/h5p-x-api-event');
require('../vendor/h5p/js/h5p-content-type');
/* eslint-enable */
