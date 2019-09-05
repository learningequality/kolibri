import setupPluginMediator from '../utils/pluginMediator';
import KContentRenderer from './KContentRenderer';
import ContentRendererLoading from './ContentRendererLoading';
import { RENDERER_SUFFIX } from './constants';

export default {
  install(
    Vue,
    {
      languageDirection,
      ContentRendererLoadingComponent = ContentRendererLoading,
      ContentRendererErrorComponent = {
        // Define a simple error component in case none is supplied.
        render(h) {
          return h('p', 'Error');
        },
      },
      coreApp,
      registerContentActivity = () => {},
    } = {}
  ) {
    if (!coreApp) {
      coreApp = window.kolibriCoreAppGlobal = window.kolibriCoreAppGlobal || {};
    } else {
      // Do a check that if a coreApp argument is supplied, that it is referenceable
      // as window.kolibriCoreAppGlobal.
      setTimeout(() => {
        // Do after the main thread executes, so that if this is inside the kolibri core
        // app then it has had a chance to be assigned to the core global object.
        if (coreApp !== window.kolibriCoreAppGlobal) {
          console.error('KContent coreApp is not window.kolibriCoreAppGlobal'); // eslint-disable-line no-console
        }
      }, 0);
    }

    Vue.component('ContentRendererLoading', ContentRendererLoadingComponent);
    Vue.component('ContentRendererError', ContentRendererErrorComponent);

    setupPluginMediator({
      Vue,
      languageDirection,
      facade: coreApp,
    });

    Vue.prototype.canRenderContent = preset =>
      Boolean(Vue.options.components[preset + RENDERER_SUFFIX]);

    Vue.prototype.registerContentActivity = registerContentActivity;

    Vue.component('KContentRenderer', KContentRenderer);
  },
};
