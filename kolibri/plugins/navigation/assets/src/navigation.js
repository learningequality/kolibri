import logging from 'loglevel';
import KolibriModule from 'kolibri_module';

const NavModule = KolibriModule.extend({
  ready() {
    logging.info('Navigation Loaded');
  },
});

module.exports = new NavModule();
