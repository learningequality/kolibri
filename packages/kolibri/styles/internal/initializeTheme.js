import './main.scss'; // attaches styles globally
import { setBrandColors, setTokenMapping } from 'kolibri-design-system/lib/styles/theme';
import generateGlobalStyles from 'kolibri-design-system/lib/styles/generateGlobalStyles';
import { set } from 'vue';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';
import trackMediaType from 'kolibri-design-system/lib/styles/trackMediaType';
import themeConfig from 'kolibri/styles/themeConfig';
import { validateObject, objectWithDefaults } from 'kolibri/utils/objectSpecs';
import plugin_data from 'kolibri-plugin-data';
import themeSpec from './themeSpec';

export function setThemeConfig(theme) {
  Object.keys(themeConfig).forEach(key => {
    set(themeConfig, key, theme[key]);
  });
}

// Default matching ThemeHook.get_theme() in kolibri/core/theme_hook.py
const DEFAULT_THEME = { signIn: {}, tokenMapping: {}, sideNav: {}, appBar: {} };

export default function initializeTheme() {
  const themeData = plugin_data.kolibriTheme || DEFAULT_THEME;
  validateObject(themeData, themeSpec);
  const theme = objectWithDefaults(themeData, themeSpec);
  if (theme.brandColors) {
    setBrandColors(theme.brandColors);
  }
  setTokenMapping(theme.tokenMapping);
  setThemeConfig(theme);
  generateGlobalStyles();
  trackInputModality();
  trackMediaType();
}
