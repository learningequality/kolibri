import 'intl';
import 'intl/locale-data/jsonp/en.js';
import * as Aphrodite from 'aphrodite';
import * as AphroditeNoImportant from 'aphrodite/no-important';

import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import { i18nSetup } from 'kolibri.utils.i18n';
import KThemePlugin from 'kolibri-components/src/KThemePlugin';
import KContentPlugin from 'kolibri-components/src/content/KContentPlugin';

Aphrodite.StyleSheetTestUtils.suppressStyleInjection();
AphroditeNoImportant.StyleSheetTestUtils.suppressStyleInjection();

// Register Vue plugins and components
Vue.use(Vuex);
Vue.use(VueRouter);
Vue.use(VueMeta);
Vue.use(KThemePlugin);
Vue.use(KContentPlugin);

Vue.config.silent = true;
i18nSetup(true);
Vue.config.productionTip = false;

const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);

Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });
