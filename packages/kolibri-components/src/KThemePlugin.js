import computedClass from './styles/computedClass';

import KBreadcrumbs from './KBreadcrumbs';
import KButton from './buttons-and-links/KButton';
import KCheckbox from './KCheckbox';
import KCircularLoader from './loaders/KCircularLoader';
import KDropdownMenu from './KDropdownMenu';
import KEmptyPlaceholder from './KEmptyPlaceholder';
import KExternalLink from './buttons-and-links/KExternalLink';
import KFixedGrid from './grids/KFixedGrid';
import KFixedGridItem from './grids/KFixedGridItem';
import KGrid from './grids/KGrid';
import KGridItem from './grids/KGridItem';
import KIcon from './KIcon';
import KLabeledIcon from './KLabeledIcon';
import KLinearLoader from './loaders/KLinearLoader';
import KModal from './KModal';
import KPageContainer from './KPageContainer';
import KRadioButton from './KRadioButton';
import KRouterLink from './buttons-and-links/KRouterLink';
import KSelect from './KSelect';
import KSwitch from './KSwitch';
import KTextbox from './KTextbox';
import KTooltip from './KTooltip';

import { themeTokens, themeBrand, themePalette, themeOutlineStyle } from './styles/theme';
import globalThemeState from './styles/globalThemeState';

/**
 * Install Kolibri theme helpers on all Vue instances.
 * Also, set up global state, listeners, and styles.
 */
export default function KThemePlugin(Vue) {
  Vue.mixin({
    /* eslint-disable kolibri/vue-no-unused-properties */
    computed: {
      $coreOutline() {
        if (globalThemeState.inputModality === 'keyboard') {
          return themeOutlineStyle();
        }
        return {
          outline: 'none',
        };
      },
      $inputModality() {
        return globalThemeState.inputModality;
      },
    },
    /* eslint-enable kolibri/vue-no-unused-properties */
  });
  Vue.prototype.$themeBrand = themeBrand();
  Vue.prototype.$themeTokens = themeTokens();
  Vue.prototype.$themePalette = themePalette();
  Vue.prototype.$computedClass = computedClass;

  // globally-accessible components
  Vue.component('KBreadcrumbs', KBreadcrumbs);
  Vue.component('KButton', KButton);
  Vue.component('KCheckbox', KCheckbox);
  Vue.component('KCircularLoader', KCircularLoader);
  Vue.component('KDropdownMenu', KDropdownMenu);
  Vue.component('KEmptyPlaceholder', KEmptyPlaceholder);
  Vue.component('KExternalLink', KExternalLink);
  Vue.component('KFixedGrid', KFixedGrid);
  Vue.component('KFixedGridItem', KFixedGridItem);
  Vue.component('KGrid', KGrid);
  Vue.component('KGridItem', KGridItem);
  Vue.component('KIcon', KIcon);
  Vue.component('KLabeledIcon', KLabeledIcon);
  Vue.component('KLinearLoader', KLinearLoader);
  Vue.component('KModal', KModal);
  Vue.component('KPageContainer', KPageContainer);
  Vue.component('KRadioButton', KRadioButton);
  Vue.component('KRouterLink', KRouterLink);
  Vue.component('KSelect', KSelect);
  Vue.component('KSwitch', KSwitch);
  Vue.component('KTextbox', KTextbox);
  Vue.component('KTooltip', KTooltip);
}
