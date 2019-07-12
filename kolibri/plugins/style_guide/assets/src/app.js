import router from 'kolibri.coreVue.router';
import urls from 'kolibri.urls';
import debounce from 'lodash/debounce';
import RootVue from './views/StyleGuideIndex';
import { navMenuRoutes, titleForRoute } from './routes';
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

  // it seems we just cleared the hash due to scrolling, so don't scroll to the top
  if (clearingHash) {
    clearingHash = false;
    return;
  }

  // otherwise default to the top
  return { x: 0, y: 0 };
};

// two state variables to help with scrolling and anchor link positions
let lastScrollTime = null;
let clearingHash = false;

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

    // clear the URL hash when you scroll away so you can click back to the section again!
    window.addEventListener(
      'scroll',
      debounce(
        () => {
          // no hash, no worries
          if (!window.location.hash) return;
          // if it's been a while since we scrolled, nothing to do
          const time = new Date().getTime();
          if (lastScrollTime === null || time - lastScrollTime > 1000) {
            lastScrollTime = time;
            return;
          }
          // if we're actively scrolling, get rid of the hash
          clearingHash = true;
          router.replace('');
        },
        100,
        { leading: true }
      )
    );

    // people get ready
    return super.ready();
  }
}

export default new StyleGuideModule();
