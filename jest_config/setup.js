import 'intl';
import 'intl/locale-data/jsonp/en.js';
import Vue from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import router from 'kolibri.coreVue.router';
import { setUpVueIntl } from 'kolibri.utils.i18n';

router.init([]);

Vue.prototype.Kolibri = {};
Vue.config.silent = true;
Vue.use(Vuex);
Vue.use(VueRouter);
setUpVueIntl();
Vue.config.productionTip = false;

const csrf = global.document.createElement('input');
csrf.name = 'csrfmiddlewaretoken';
csrf.value = 'csrfmiddlewaretoken';
global.document.body.append(csrf);
