import setupPluginMediator from '../utils/pluginMediator';
import KContentRenderer from './KContentRenderer';
import { RENDERER_SUFFIX } from './constants';

export default {
  install(
    Vue,
    {
      languageDirection,
      ContentRendererLoadingComponent = {
        render(h) {
          return h('p', '-----');
        },
      },
      ContentRendererErrorComponent = {
        render(h) {
          return h('p', 'xxxxx');
        },
      },
      facade,
      registerContentActivity = () => {},
    } = {}
  ) {
    if (!facade) {
      facade = window.kolibriCoreAppGlobal = window.kolibriCoreAppGlobal || {};
    }

    Vue.component('ContentRendererLoading', ContentRendererLoadingComponent);
    Vue.component('ContentRendererError', ContentRendererErrorComponent);

    setupPluginMediator({
      Vue,
      languageDirection,
      facade,
    });

    Vue.prototype.canRenderContent = preset =>
      Boolean(Vue.options.components[preset + RENDERER_SUFFIX]);

    Vue.prototype.registerContentActivity = registerContentActivity;

    Vue.component('KContentRenderer', KContentRenderer);
  },
};
