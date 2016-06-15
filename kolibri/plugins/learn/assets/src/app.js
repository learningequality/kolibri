const KolibriModule = require('kolibri_module');
const rootvue = require('./vue');
const router = require('./router');

class LearnModule extends KolibriModule {
  ready() {
    router.start(rootvue, 'rootvue');
  }
}

module.exports = new LearnModule();
