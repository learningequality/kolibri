import FontFaceObserver from 'fontfaceobserver';
import { availableLanguages, currentLanguage } from 'kolibri.utils.i18n';
import logger from 'kolibri.lib.logging';
import { browser, userAgent, passesRequirements } from './browserInfo';
import plugin_data from 'plugin_data';

const logging = logger.getLogger(__filename);

const modernFontBrowsers = {
  Edge: {
    major: 17,
  },
  Firefox: {
    major: 58,
  },
  Chrome: {
    major: 60,
  },
  'Chrome WebView': {
    major: 60,
  },
  Safari: {
    major: 11,
    minor: 1,
  },
  Opera: {
    major: 47,
  },
  'Mobile Safari': {
    major: 11,
    minor: 4,
  },
};

function loadFullFonts() {
  /*
   * This function eagerly loads the full fonts for the current language asynchronously, but
   * avoids referencing them until they've been fully loaded. This is done by adding a
   * class to the HTML root which has the effect of switching fonts from system defaults
   * to Noto.
   *
   * This prevents the text from being invisible while the fonts are loading ("FOIT")
   * and instead falls back on system fonts while they're loading ("FOUT").
   *
   * We need to do this even for 'modern' browsers, because not all browsers implement
   * fall-back behaviors of the font stacks correctly. See:
   *
   *    https://bugs.chromium.org/p/chromium/issues/detail?id=897539
   */

  // We use the <html> element to store the CSS 'loaded' class
  const htmlEl = document.documentElement;
  const FULL_FONTS = 'full-fonts-loaded';
  const PARTIAL_FONTS = 'partial-fonts-loaded';

  // Skip partial font usage and observer for Edge browser as a workaround for
  //   https://github.com/learningequality/kolibri/issues/4515
  // TODO: figure out exactly why this was happening and remove this logic.
  if (/Edge/.test(userAgent)) {
    htmlEl.classList.add(FULL_FONTS);
    return;
  }

  htmlEl.classList.add(PARTIAL_FONTS);

  const uiNormal = new FontFaceObserver('noto-full', { weight: 400 });
  const uiBold = new FontFaceObserver('noto-full', { weight: 700 });

  // passing the language name to 'load' for its glyphs, not its value per se
  const string = availableLanguages[currentLanguage].lang_name;
  Promise.all([uiNormal.load(string, 20000), uiBold.load(string, 20000)])
    .then(function() {
      htmlEl.classList.remove(PARTIAL_FONTS);
      htmlEl.classList.add(FULL_FONTS);
      logging.debug(`Loaded full font for '${currentLanguage}'`);
    })
    .catch(function() {
      logging.warn(`Could not load full font for '${currentLanguage}'`);
    });
}

function addFontStylesheetLink(href) {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.type = 'text/css';
  fonts.href = href;
  document.head.appendChild(fonts);
}

export default function setupAndLoadFonts() {
  if (passesRequirements(browser, modernFontBrowsers)) {
    addFontStylesheetLink(plugin_data.fullCSSFileModern);
  } else {
    addFontStylesheetLink(plugin_data.fullCSSFileBasic);
  }
  loadFullFonts();
}
