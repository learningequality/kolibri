import KContentRenderer from './KContentRenderer';
import { RENDERER_SUFFIX } from './constants';

export default {
  install(Vue) {
    Vue.prototype.canRenderContent = preset =>
      Boolean(Vue.options.components[preset + RENDERER_SUFFIX]);

    Vue.component('KContentRenderer', KContentRenderer);
  },
};
