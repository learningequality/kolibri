import 'intl';
import 'intl/locale-data/jsonp/en.js';
import * as Aphrodite from 'aphrodite';
import * as AphroditeNoImportant from 'aphrodite/no-important';

import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import { i18nSetup } from 'kolibri.utils.i18n';
import KThemePlugin from 'kolibri-design-system/lib/KThemePlugin';
import KContentPlugin from 'kolibri-design-system/lib/content/KContentPlugin';

Aphrodite.StyleSheetTestUtils.suppressStyleInjection();
AphroditeNoImportant.StyleSheetTestUtils.suppressStyleInjection();

// Register Vue plugins and components
Vue.use(Vuex);
Vue.use(VueRouter);
Vue.use(VueMeta);
Vue.use(KThemePlugin);
Vue.use(KContentPlugin);

Vue.config.silent = true;
Vue.config.devtools = false;
Vue.config.productionTip = false;

i18nSetup(true);

const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);

Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });

// Shows better NodeJS unhandled promise rejection errors
process.on('unhandledRejection', (reason, p) => {
  /* eslint-disable no-console */
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  console.log(reason.stack);
});
