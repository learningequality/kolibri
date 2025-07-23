import './main.scss'; // attaches styles globally
import { setBrandColors, setTokenMapping } from 'kolibri-design-system/lib/styles/theme';
import generateGlobalStyles from 'kolibri-design-system/lib/styles/generateGlobalStyles';
import { set } from 'vue';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';
import trackMediaType from 'kolibri-design-system/lib/styles/trackMediaType';
import plugin_data from 'kolibri-plugin-data';
import themeSpec from './themeSpec';
import themeConfig from 'kolibri/styles/themeConfig';
import { validateObject, objectWithDefaults } from 'kolibri/utils/objectSpecs';

export function setThemeConfig(theme) {
  Object.keys(themeConfig).forEach(key => {
    set(themeConfig, key, theme[key]);
  });
}

export default function initializeTheme() {
  validateObject(plugin_data.kolibriTheme, themeSpec);
  const theme = objectWithDefaults(plugin_data.kolibriTheme, themeSpec);
  if (theme.brandColors) {
    setBrandColors(theme.brandColors);
  }
  setTokenMapping(theme.tokenMapping);
  setThemeConfig(theme);
  generateGlobalStyles();
  trackInputModality();
  trackMediaType();
}
