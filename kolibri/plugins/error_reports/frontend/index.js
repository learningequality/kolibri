import Vue from 'vue';
import logging from 'kolibri-logging';
import router from 'kolibri/router';
import {
  report,
  VueErrorReport,
  JavascriptErrorReport,
  UnhandledRejectionErrorReport,
} from './utils';
import { initBreadcrumbs } from './breadcrumbs';
import { initErrorQueue } from './errorQueue';

const logger = logging.getLogger(__filename);

// Initialize breadcrumb collection with router for navigation tracking
initBreadcrumbs(router);

// Initialize error queue for offline support and deduplication
initErrorQueue();

// kolibri-sentry-plugin's Sentry.init({ Vue }) also installs one, and plugin
// load order is not fixed.
const previousErrorHandler = Vue.config.errorHandler;

// These shall be responsible for catching runtime errors
Vue.config.errorHandler = function (err, vm, info) {
  logger.debug('Unexpected Error:', err);
  const error = new VueErrorReport(err, vm, info);
  report(error);
  if (previousErrorHandler) {
    previousErrorHandler.call(this, err, vm, info);
    return;
  }
  // Setting an errorHandler suppresses Vue's default console.error of
  // component errors - re-emit so that capture does not make errors
  // less visible.
  // eslint-disable-next-line no-console
  console.error(err);
};

// Matches messages sentry-javascript's inboundFilters ignores by default:
// cross-origin scripts report only "Script error.", and browsers fire the
// ResizeObserver loop error without any failure in application code.
const BROWSER_NOISE = /^(?:Script error\.?$|ResizeObserver loop)/;

window.addEventListener('error', e => {
  if (!e.error && BROWSER_NOISE.test(e.message)) return;
  logger.debug('Unexpected Error:', e.error);
  const error = new JavascriptErrorReport(e);
  report(error);
});

window.addEventListener('unhandledrejection', event => {
  if (process.env.NODE_ENV === 'production') {
    event.preventDefault();
  }
  logger.error('Unhandled Rejection:', event.reason);
  const error = new UnhandledRejectionErrorReport(event);
  report(error);
});
