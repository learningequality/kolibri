const KolibriModule = require('kolibri_module');
const rootvue = require('./vue');
const router = require('./router');
const store = require('./store');
const sync = require('vuex-router-sync').sync;

class LearnModule extends KolibriModule {
  ready() {
    sync(store, router);
    router.start(rootvue, 'rootvue');
  }
}

module.exports = new LearnModule();
