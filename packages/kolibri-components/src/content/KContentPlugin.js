import pluginMediatorFactory from '../utils/pluginMediator';
import { languageDirections } from '../utils/i18n';
import contentRendererMixinFactory from './mixin';
import contentRendererFactory from './ContentRenderer';

export default {
  install(
    Vue,
    {
      languageDirection = languageDirections.LTR,
      ContentRendererLoadingComponent = {},
      ContentRendererErrorComponent = {},
      facade,
      logging = console,
      activeCallback = () => {},
    } = {}
  ) {
    if (!facade) {
      facade = window.kolibriCoreAppGlobal = window.kolibriCoreAppGlobal || {};
    }
    const contentRendererMixin = contentRendererMixinFactory({
      logging,
    });

    const mediator = pluginMediatorFactory({
      Vue,
      languageDirection,
      logging,
      ContentRendererLoadingComponent,
      ContentRendererErrorComponent,
      facade,
      contentRendererMixin,
    });

    Vue.prototype.canRenderContent = mediator.canRenderContent.bind(mediator);

    Vue.component(
      'KContentRenderer',
      contentRendererFactory({
        logging,
        activeCallback,
        contentRendererMixin,
      })
    );
  },
};
