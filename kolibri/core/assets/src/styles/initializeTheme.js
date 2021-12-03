import '../styles/main.scss'; // attaches styles globally
import { setBrandColors, setTokenMapping } from 'kolibri-design-system/lib/styles/theme';
import generateGlobalStyles from 'kolibri-design-system/lib/styles/generateGlobalStyles';
import trackInputModality from 'kolibri-design-system/lib/styles/trackInputModality';
import trackMediaType from 'kolibri-design-system/lib/styles/trackMediaType';
import { setThemeConfig } from './themeConfig';
import plugin_data from 'plugin_data';

export default function initializeTheme() {
  setBrandColors(plugin_data.kolibriTheme.brandColors);
  setTokenMapping(plugin_data.kolibriTheme.tokenMapping);
  setThemeConfig(plugin_data.kolibriTheme);
  generateGlobalStyles();
  trackInputModality();
  trackMediaType();
}
