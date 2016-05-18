const logging = require('loglevel');
const KolibriModule = require('kolibri_module');


class NavModule extends KolibriModule {
  ready() {
    logging.info('Navigation Loaded');
  }
}

module.exports = new NavModule();
