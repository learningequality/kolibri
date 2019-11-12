import router from 'kolibri.coreVue.router';
import urls from 'kolibri.urls';
import { scrollBehavior, initializeScrollBehavior } from './scrolling.js';
import RootVue from './views/StyleGuideIndex';
import { allRoutes } from './routes';
import pluginModule from './modules/pluginModule';
import KolibriApp from 'kolibri_app';

class StyleGuideModule extends KolibriApp {
  get routes() {
    return allRoutes;
  }
  get RootVue() {
    return RootVue;
  }
  get pluginModule() {
    return pluginModule;
  }
  ready() {
    // make a router that lets us use anchor links (hash IDs)
    router.initRouter({
      mode: 'history',
      base: urls['style_guide'](),
      scrollBehavior,
    });

    router.afterEach(to => {
      const name = 'Kolibri Design System';
      if (to.meta && to.meta.title) {
        document.title = `${to.meta.title} - ${name}`;
      } else if (to.meta && to.meta.componentAPI) {
        document.title = `${to.meta.componentAPI.name} - ${name}`;
      } else {
        document.title = name;
      }
    });

    initializeScrollBehavior();

    // people get ready
    super.ready();
  }
}

export default new StyleGuideModule();
