import Vue from 'vue';
import VueMeta from 'vue-meta';
import VueRouter from 'vue-router';
import Vuex from 'vuex';
import VueAphrodite from './vueAphrodite';

// Register Vue plugins
Vue.use(Vuex);
Vue.use(VueRouter);
Vue.use(VueMeta);
Vue.use(VueAphrodite);

export default Vue;
