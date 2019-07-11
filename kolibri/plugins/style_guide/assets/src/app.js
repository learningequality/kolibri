import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import urls from 'kolibri.urls';
import RootVue from './views/StyleGuideIndex';
import { navMenuRoutes } from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

import 'prismjs';
import 'prismjs/themes/prism.css';

const scrollBehavior = function(to, from, savedPosition) {
  if (savedPosition) {
    // savedPosition is only available for popstate navigations
    return savedPosition;
  }
  // scroll to anchor by returning the selector
  if (to.hash) {
    const position = {};
    position.selector = to.hash;
    position.offset = { y: 128 };
    return position;
  }
  // otherwise default to the top
  return { x: 0, y: 0 };
};

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
    router.initRouter({
      mode: 'history',
      base: urls['style_guide'](),
      scrollBehavior,
    });
    router.afterEach(() => {
      store.dispatch('notLoading');
    });
    return super.ready();
  }
}

export default new StyleGuideModule();
