import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
import pluginData from 'kolibri-plugin-data';
import themeConfig from 'kolibri/styles/themeConfig';
import { validateObject } from 'kolibri/utils/objectSpecs';
import initializeTheme from '../initializeTheme';
import themeSpec from '../themeSpec';

jest.mock('kolibri-plugin-data', () => ({ __esModule: true, default: {} }));

// Verbatim from DefaultThemeHook.theme in kolibri/plugins/default_theme/kolibri_plugin.py.
function defaultThemeHookTheme() {
  return {
    signIn: {
      background: '/static/assets/default_theme/background.jpg',
      backgroundImgCredit: 'Lewa Wildlife Conservancy',
      topLogo: {
        style: 'margin-bottom: 5px; width: 50px; height: 50px;',
      },
      titleStyle: { fontWeight: '600', fontSize: '20px' },
    },
    logos: [
      {
        src: '/static/assets/favicons/logo.ico',
        content_type: 'image/vnd.microsoft.icon',
        size: '32x32',
      },
      {
        src: '/static/assets/default_theme/kolibri-logo.svg',
        content_type: 'image/svg+xml',
        maskable: false,
        size: 'any',
      },
      {
        src: '/static/assets/default_theme/kolibri-logo-192.png',
        content_type: 'image/png',
        size: '192x192',
      },
      {
        src: '/static/assets/default_theme/kolibri-logo-512.png',
        content_type: 'image/png',
        size: '512x512',
      },
    ],
  };
}

// ThemeHook.get_theme() backfills the top-level sections before this ships as kolibriTheme.
function initializedThemeHookTheme() {
  return {
    ...defaultThemeHookTheme(),
    tokenMapping: {},
    sideNav: {},
    appBar: {},
  };
}

describe('initializeTheme', () => {
  it('populates every section from spec defaults when the server sends no theme', () => {
    pluginData.kolibriTheme = undefined;

    initializeTheme();

    expect(themeConfig.signIn.showTitle).toBe(true);
    expect(themeConfig.signIn.scrimOpacity).toBe(0.2);
    expect(themeConfig.signIn.titleStyle).toBe(null);
    expect(themeConfig.sideNav.showKolibriFooterLogo).toBe(true);
    expect(themeConfig.appBar.background).toBe(themeTokens().appBar);
  });

  it('keeps the bundled default theme intact, defaulting the fields it omits', () => {
    const theme = defaultThemeHookTheme();
    pluginData.kolibriTheme = initializedThemeHookTheme();

    initializeTheme();

    expect(themeConfig.signIn.background).toBe(theme.signIn.background);
    expect(themeConfig.signIn.backgroundImgCredit).toBe(theme.signIn.backgroundImgCredit);
    expect(themeConfig.signIn.topLogo.style).toBe(theme.signIn.topLogo.style);
    expect(themeConfig.signIn.titleStyle).toEqual(theme.signIn.titleStyle);
    expect(themeConfig.signIn.showTitle).toBe(true);
    expect(themeConfig.signIn.scrimOpacity).toBe(0.2);
  });

  it('populates sections the theme hook omits entirely', () => {
    pluginData.kolibriTheme = defaultThemeHookTheme();

    initializeTheme();

    expect(themeConfig.sideNav.showKolibriFooterLogo).toBe(true);
    expect(themeConfig.appBar.textColor).toBe(themeTokens().text);
  });
});

describe('themeSpec', () => {
  // Nothing else catches signIn.titleStyle specced as a String: objectWithDefaults
  // does not type-check, and validateObject's complaint only reaches a silenced logger.
  it('validates the bundled default theme', () => {
    expect(validateObject(initializedThemeHookTheme(), themeSpec)).toBe(true);
  });
});
