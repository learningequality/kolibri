import logging from 'loglevel';


import KolibriModule from 'kolibri_module';


class NavModule extends KolibriModule {
  ready() {
    logging.info('Navigation Loaded');
  }
}

module.exports = new NavModule();
