
import logging from 'loglevel';


import KolibriModule from 'kolibri_module';
import Vue from 'vue';
import Main from './Main.vue';


const vm = new Vue({
  el: 'body',
  components: { Main },
});

logging.info('HELLO');

const LearnModule = KolibriModule.extend({ vm });

module.exports = new LearnModule();
