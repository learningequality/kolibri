// Ensure structuredClone is available in the jsdom test environment
// (needed by ESLint 9's RuleTester)
import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom';
import 'intl';
import 'intl/locale-data/jsonp/en.js';
import * as Aphrodite from 'aphrodite';
import * as AphroditeNoImportant from 'aphrodite/no-important';
import failOnConsole from 'jest-fail-on-console';

import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import logging from 'kolibri-logging';
import { i18nSetup } from 'kolibri/utils/i18n';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = val => JSON.parse(JSON.stringify(val));
}

/* eslint-disable vue/one-component-per-file */

failOnConsole({
  shouldFailOnAssert: true,
  shouldFailOnDebug: true,
  shouldFailOnError: true,
  shouldFailOnInfo: true,
  shouldFailOnLog: true,
  shouldFailOnWarn: true,
  // Allow vue-router deprecation warning about the `event` prop on <router-link>.
  // This warning is triggered by KCard in the design system (kolibri-design-system)
  // which uses `event=""` to prevent router-link click handling. It cannot be fixed
  // in this repo; it needs to be addressed in the design system.
  allowMessage: (message, methodName) => {
    if (
      methodName === 'warn' &&
      typeof message === 'string' &&
      message.includes("<router-link>'s event prop is deprecated")
    ) {
      return true;
    }
    return false;
  },
});

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

Vue.component('ContentViewer', {
  props: ['options'],
  render(h) {
    return h('p', this.options && this.options.title);
  },
});

Vue.config.silent = true;
Vue.config.devtools = false;
Vue.config.productionTip = false;

// Flush Vue's one-time devtools/production tip that is scheduled via
// setTimeout(fn, 0) at import time (before config flags can be set).
// This global beforeAll drains that timer so it doesn't fire during tests
// and trigger jest-fail-on-console.
global.beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});

Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });

// Shows better NodeJS unhandled promise rejection errors
process.on('unhandledRejection', (reason, p) => {
  process.stderr.write(`Unhandled Rejection at: Promise ${p}, reason: ${reason}\n`);
  if (reason && reason.stack) {
    process.stderr.write(`${reason.stack}\n`);
  }
});

const scheduler = typeof setImmediate === 'function' ? setImmediate : setTimeout;

// Copied from https://github.com/kentor/flush-promises/blob/f33ac564190c784019f1f689dd544187f4b77eb2/index.js
global.flushPromises = function flushPromises() {
  return new Promise(function (resolve) {
    scheduler(resolve);
  });
};
/* eslint-enable vue/one-component-per-file */

module.exports = async () => {
  await i18nSetup(true);
};
