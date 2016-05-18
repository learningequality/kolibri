import logging from 'loglevel';


import KolibriModule from 'kolibri_module';
import Vue from 'vue';
import Nav from './navigation.vue';


class NavModule extends KolibriModule {
  ready() {
    logging.info('Navigation Loaded');
  }
}

module.exports = new NavModule();
