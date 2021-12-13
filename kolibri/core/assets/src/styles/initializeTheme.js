import '../styles/main.scss'; // attaches styles globally
import { setBrandColors, setTokenMapping } from 'kolibri-design-system/lib/styles/theme';
import generateGlobalStyles from 'kolibri-design-system/lib/styles/generateGlobalStyles';
import Vue from 'vue';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';
import trackMediaType from 'kolibri-design-system/lib/styles/trackMediaType';
import { validateObject } from 'kolibri.utils.validators';
import themeSpec from './themeSpec';
import themeConfig from './themeConfig';
import plugin_data from 'plugin_data';

export function setThemeConfig(theme) {
  Object.keys(themeConfig).forEach(key => {
    Vue.set(themeConfig, key, theme[key]);
  });
}

export default function initializeTheme() {
  validateObject(plugin_data.kolibriTheme, themeSpec);
  setBrandColors(plugin_data.kolibriTheme.brandColors);
  setTokenMapping(plugin_data.kolibriTheme.tokenMapping);
  setThemeConfig(plugin_data.kolibriTheme);
  generateGlobalStyles();
  trackInputModality();
  trackMediaType();
}
