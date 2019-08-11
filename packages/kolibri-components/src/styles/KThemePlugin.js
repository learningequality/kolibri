import computedClass from './computedClass';
import trackInputModality from './trackInputModality';
import generateGlobalStyles from './generateGlobalStyles';

import { themeTokens, themeBrand, themePalette, themeOutlineStyle } from './theme';

/**
 * Install Kolibri theme helpers on all Vue instances.
 * Also, set up global state, listeners, and styles.
 */
export default function KThemePlugin(Vue) {
  trackInputModality();
  generateGlobalStyles();
  Vue.mixin({
    /* eslint-disable kolibri/vue-no-unused-properties */
    computed: {
      $coreOutline() {
        return themeOutlineStyle();
      },
    },
    /* eslint-enable kolibri/vue-no-unused-properties */
  });
  Vue.prototype.$themeBrand = themeBrand();
  Vue.prototype.$themeTokens = themeTokens();
  Vue.prototype.$themePalette = themePalette();
  Vue.prototype.$computedClass = computedClass;
}
