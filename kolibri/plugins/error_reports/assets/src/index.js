import Vue from 'vue';
import logging from 'kolibri.lib.logging';
import {
  report,
  VueErrorReport,
  JavascriptErrorReport,
  UnhandledRejectionErrorReport,
} from './utils';

const logger = logging.getLogger(__filename);

// these shall be responsibe for catching runtime errors
Vue.config.errorHandler = function(err, vm) {
  logger.debug(`Unexpected Error: ${err}`);
  const error = new VueErrorReport(err, vm);
  report(error);
};

window.addEventListener('error', e => {
  logger.debug(`Unexpected Error: ${e.error}`);
  const error = new JavascriptErrorReport(e);
  report(error);
});

window.addEventListener('unhandledrejection', event => {
  if (process.env.NODE_ENV === 'production') {
    event.preventDefault();
  }
  logger.debug(`Unhandled Rejection: ${event.reason}`);
  const error = new UnhandledRejectionErrorReport(event);
  report(error);
});
