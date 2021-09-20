import UAParser from 'ua-parser-js';

/**
 * A requirements specification object.
 * @typedef {Object.<string, Browser>} Requirements.
 */

/**
 * A function to determine if the browser specification object fails to pass one of the restrictions
 * passed in. It does this in a permissive way, whereby if no specification is made for a particular
 * browser name, then it will return true. If, however, the browser is specified in the requirements
 * object, then if it fails to pass the version requirements specified, then false will be returned.
 * @param  {Browser} browser     - a browser specification object for the browser being tested.
 * @param  {Requirements} requirements - a requirements specification object specifying conditions
 * to test.
 * @return {boolean} - false if failed to pass any of the requirements, true otherwise.
 */
export function passesRequirements(browser, requirements) {
  if (browser.major && browser.name) {
    const entry = requirements[browser.name];
    if (entry) {
      if (browser.major < entry.major) {
        return false;
      } else if (browser.major === entry.major) {
        if (entry.minor && (browser.minor < entry.minor || !browser.minor)) {
          return false;
        } else if (entry.minor && browser.minor === entry.minor) {
          if (entry.patch && (browser.patch < entry.patch || !browser.patch)) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

export const userAgent =
  window && window.navigator && window.navigator.userAgent ? window.navigator.userAgent : '';

const parser = new UAParser(userAgent);

/**
 * General browser info
 */

const info = parser.getResult();

const browserVersion = (info.browser.version || '').split('.');

export const browser = {
  name: info.browser.name,
  major: browserVersion[0],
  minor: browserVersion[1],
  patch: browserVersion[2],
};

const osVersion = (info.os.version || '').split('.');

export const os = {
  name: info.os.name,
  major: osVersion[0],
  minor: osVersion[1],
  patch: osVersion[2],
};

/**
 * Detection of whether an Android device is using WebView based on
 * https://developer.chrome.com/multidevice/user-agent#webview_user_agent
 * First checks for 'wv' (Lolipop+), then for 'Version/x.x'
 */
const isAndroid = os.name === 'Android';
export const isAndroidWebView =
  isAndroid &&
  (browser.name === 'Chrome Webview' ||
    (browser.name === 'Chrome' && /Version\/\d+\.\d+/.test(userAgent)));

/**
 * Embedded WebViews on Mac have no app identifier, while all the major browsers do, so check
 * for browser app strings and mark as embedded if none are found.
 */
const isMac = os.name === 'Mac OS';
export const isMacWebView =
  isMac && !(/Safari/.test(userAgent) || /Chrome/.test(userAgent) || /Firefox/.test(userAgent));

/**
 * All web views
 */
export const isEmbeddedWebView = isAndroidWebView || isMacWebView;
