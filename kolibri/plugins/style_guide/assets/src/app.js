import router from 'kolibri.coreVue.router';
import store from 'kolibri.coreVue.vuex.store';
import urls from 'kolibri.urls';
import RootVue from './views/StyleGuideIndex';
import { navMenuRoutes } from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

import 'prismjs';
import 'prismjs/themes/prism.css';

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
    router.initRouter({ mode: 'history', base: urls['style_guide']() });
    router.afterEach(() => {
      store.dispatch('notLoading');
    });
    return super.ready();
  }
}

export default new StyleGuideModule();
