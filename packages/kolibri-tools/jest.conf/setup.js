import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom';
import 'intl';
import 'intl/locale-data/jsonp/en.js';
import * as Aphrodite from 'aphrodite';
import * as AphroditeNoImportant from 'aphrodite/no-important';

import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import logging from 'kolibri-logging';
import { i18nSetup } from 'kolibri/utils/i18n';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';

/* eslint-disable vue/one-component-per-file */

global.beforeEach(() => {
  return new Promise(resolve => {
    Aphrodite.StyleSheetTestUtils.suppressStyleInjection();
    AphroditeNoImportant.StyleSheetTestUtils.suppressStyleInjection();
    return process.nextTick(resolve);
  });
});

global.afterEach(() => {
  return new Promise(resolve => {
    Aphrodite.StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
    AphroditeNoImportant.StyleSheetTestUtils.clearBufferAndResumeStyleInjection();
    return process.nextTick(resolve);
  });
});

// Disable all core logging during tests.
logging.setLevel('silent');

// Register Vue plugins and components
Vue.use(Vuex);
Vue.mixin({
  beforeCreate: function () {
    // This fix some problems between the VueRouter plugin, and Vue-testing-library.
    this.$options.router = this.$options.router || undefined;
  },
});
Vue.use(VueRouter);
Vue.use(VueMeta);
Vue.use(KThemePlugin);

Vue.component('ContentRenderer', {
  render(h) {
    return h('p', 'ContentRenderer');
  },
});

Vue.config.silent = true;
Vue.config.devtools = false;
Vue.config.productionTip = false;

i18nSetup(true);

Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });

// Shows better NodeJS unhandled promise rejection errors
process.on('unhandledRejection', (reason, p) => {
  /* eslint-disable no-console */
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  console.log(reason.stack);
});

const scheduler = typeof setImmediate === 'function' ? setImmediate : setTimeout;

// Copied from https://github.com/kentor/flush-promises/blob/f33ac564190c784019f1f689dd544187f4b77eb2/index.js
global.flushPromises = function flushPromises() {
  return new Promise(function (resolve) {
    scheduler(resolve);
  });
};
/* eslint-enable vue/one-component-per-file */
