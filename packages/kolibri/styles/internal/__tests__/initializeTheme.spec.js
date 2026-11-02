import { themeTokens } from 'kolibri-design-system/lib/styles/theme';
import logger from 'kolibri-logging';
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

function brandColorScale() {
  return {
    v_50: '#F5F7FF',
    v_100: '#D9E1FD',
    v_200: '#B4C3FB',
    v_300: '#8EA4F9',
    v_400: '#6986F7',
    v_500: '#4368F5',
    v_600: '#2547F3',
  };
}

function brandColorsTheme() {
  return {
    ...initializedThemeHookTheme(),
    brandColors: { primary: brandColorScale(), secondary: brandColorScale() },
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

  it('validates brand scales defining v_50 to v_600', () => {
    expect(validateObject(brandColorsTheme(), themeSpec)).toBe(true);
  });

  describe('with error logging enabled', () => {
    let consoleError;

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      logger.setLevel('error');
    });

    afterEach(() => {
      logger.setLevel('silent');
      consoleError.mockRestore();
    });

    it.each(['primary', 'secondary'])('rejects a %s scale missing v_50', family => {
      const theme = brandColorsTheme();
      delete theme.brandColors[family].v_50;

      expect(validateObject(theme, themeSpec)).toBe(false);
      expect(consoleError).toHaveBeenCalledWith(expect.stringContaining(`${family}.v_50`));
    });
  });
});
