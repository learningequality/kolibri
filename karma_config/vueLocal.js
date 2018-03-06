import 'intl';
import 'intl/locale-data/jsonp/en.js';
import Vue from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import kRouter from 'kolibri.coreVue.router';
import { setUpVueIntl } from 'kolibri.utils.i18n';

kRouter.init([]);

Vue.prototype.Kolibri = {};
Vue.config.silent = true;
Vue.use(Vuex);
Vue.use(VueRouter);
setUpVueIntl();

export default Vue;
