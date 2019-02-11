import 'intl';
import 'intl/locale-data/jsonp/en.js';
import * as Aphrodite from 'aphrodite';
import * as AphroditeNoImportant from 'aphrodite/no-important';

import Vue from 'kolibri.lib.vue';
import { i18nSetup } from 'kolibri.utils.i18n';

Aphrodite.StyleSheetTestUtils.suppressStyleInjection();
AphroditeNoImportant.StyleSheetTestUtils.suppressStyleInjection();

Vue.prototype.Kolibri = {};
Vue.config.silent = true;
i18nSetup(true);
Vue.config.productionTip = false;

const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);
