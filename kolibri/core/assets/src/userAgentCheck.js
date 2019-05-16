import { getBrowser, passesRequirements } from './utils/userAgent';

const userAgent =
  window && window.navigator && window.navigator.userAgent ? window.navigator.userAgent : '';

const browser = getBrowser(userAgent);

const minimumBrowserRequirements = {
  IE: {
    major: 11,
  },
  Android: {
    major: 4,
    minor: 0,
    patch: 2,
  },
};

if (!passesRequirements(browser, minimumBrowserRequirements)) {
  window.location.href = window.kolibriUrls['kolibri:core:unsupported']();
}

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

function setFontStyle(href) {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.type = 'text/css';
  fonts.href = href;
  document.head.appendChild(fonts);
}

if (passesRequirements(browser, modernFontBrowsers)) {
  setFontStyle(window.fullCSSFileModern);
} else {
  setFontStyle(window.fullCSSFileBasic);
}
