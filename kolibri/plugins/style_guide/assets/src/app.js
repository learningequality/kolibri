import Vue from 'kolibri.lib.vue';
import Vuep from 'vuep';
import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import RootVue from './views/StyleGuideIndex';
import { navMenuRoutes } from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

Vue.use(Vuep, { lineNumbers: false });

class StyleGuideModule extends KolibriApp {
  get routes() {
    return navMenuRoutes;
  }
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    router.afterEach(() => {
      store.dispatch('notLoading');
    });
    return super.ready();
  }
}

export default new StyleGuideModule();
