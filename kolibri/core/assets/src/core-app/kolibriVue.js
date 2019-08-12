import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import KThemePlugin from 'kolibri-components/src/KThemePlugin';

// Register Vue plugins and components
Vue.use(Vuex);
Vue.use(VueRouter);
Vue.use(VueMeta);
Vue.use(KThemePlugin);

export default Vue;
