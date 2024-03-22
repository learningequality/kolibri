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

// Check for presence of the touch event in DOM or multi-touch capabilities
export const isTouchDevice =
  'ontouchstart' in window ||
  window.navigator?.maxTouchPoints > 0 ||
  window.navigator?.msMaxTouchPoints > 0;

function handlePointerDown(event) {
  if (event.pointerType === 'mouse') {
    localStorage.setItem('mouseUsed', 'true');
    isMouseUsed = true;
    window.removeEventListener('pointerdown', handlePointerDown);
  }
}

window.addEventListener('pointerdown', handlePointerDown);

export let isMouseUsed = localStorage.getItem('mouseUsed') === 'true';
