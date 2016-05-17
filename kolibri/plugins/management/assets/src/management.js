import logging from 'loglevel';


import KolibriModule from 'kolibri_module';
import Vue from 'vue';
import Main from './Main.vue';
import { store } from './vuex/store.js';

const vm = new Vue({
  el: 'body',
  components: { Main },
  store,
});

logging.info('HELLO');

const ManagementModule = KolibriModule.extend({ vm });

module.exports = new ManagementModule();
