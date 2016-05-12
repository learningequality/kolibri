
import logging from 'loglevel';


import KolibriModule from 'kolibri_module';
import Vue from 'vue';
import Main from './Main.vue';


const LearnModule = KolibriModule.extend({
  ready() {
    logging.info('Hello World');
    this.vm = new Vue({
      el: 'body',
      components: { Main },
    });
  },
});

module.exports = new LearnModule();
