import router from 'kolibri.coreVue.router';
import urls from 'kolibri.urls';
import { scrollBehavior, initializeScrollBehavior } from './scrolling.js';
import RootVue from './views/StyleGuideIndex';
import { navMenuRoutes, titleForRoute } from './routes';
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
    // make a router that lets us use anchor links (hash IDs)
    router.initRouter({
      mode: 'history',
      base: urls['style_guide'](),
      scrollBehavior,
    });

    router.afterEach(to => {
      document.title = titleForRoute(to) + ' - Kolibri Design System';
    });

    initializeScrollBehavior();

    // people get ready
    super.ready();
  }
}

export default new StyleGuideModule();
