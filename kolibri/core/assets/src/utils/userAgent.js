/*
 * userAgent regex is imported from here:
 * https://github.com/faisalman/ua-parser-js/blob/master/src/ua-parser.js
 * The subsequent code is then written from scratch as it was easier than vendoring
 * the more general purpose code therein.
 */

const NAME = 'name';
const VERSION = 'version';

const browserTests = [
  {
    test: /\s(opr)\/([\w.]+)/i,
    map: [[NAME, 'Opera'], VERSION],
  },
  {
    tests: [/(?:ms|\()(ie)\s([\w.]+)/i, /(trident).+rv[:\s]([\w.]+).+like\sgecko/i],
    map: [[NAME, 'IE'], VERSION],
  },

  {
    test: /(edge|edgios|edga)\/((\d+)?[\w.]+)/i,
    map: [[NAME, 'Edge'], VERSION],
  },
  {
    test: /\swv\).+(chrome)\/([\w.]+)/i,
    map: [[NAME, /(.+)/, '$1 WebView'], VERSION],
  },
  {
    test: /android.+version\/([\w.]+)\s+(?:mobile\s?safari|safari)*/i,
    map: [VERSION, [NAME, 'Android Browser']],
  },
  {
    test: /(chrome)\/v?([\w.]+)/i,
    map: [NAME, VERSION],
  },
  {
    test: /((?:android.+)crmo|crios)\/([\w.]+)/i,
    map: [[NAME, 'Chrome'], VERSION],
  },
  {
    test: /fxios\/([\w.-]+)/i,
    map: [VERSION, [NAME, 'Firefox']],
  },
  {
    test: /version\/([\w.]+).+?mobile\/\w+\s(safari)/i,
    map: [VERSION, [NAME, 'Mobile Safari']],
  },
  {
    test: /version\/([\w.]+).+?(mobile\s?safari|safari)/i,
    map: [VERSION, NAME],
  },
  {
    test: /(firefox)\/([\w.-]+)$/i,
    map: [NAME, VERSION],
  },
];

/**
 * A browser specification object.
 * All version numbers are actually strings to allow for non-final version numbers.
 * @typedef {Object} Browser.
 * @property {?string} name - A nullable string that gives the name of the recognized browser.
 * @property {?string} major - Major version number.
 * @property {?string} minor - Minor version number.
 * @property {?string} patch - Patch version number.
 */

/**
 * This function parses the browser user agent string and returns an object with two values
 * one for the recognized browser name, and one for the recognized browser version.
 * It relies on the regexes above to infer the browser and version from user agent string.
 * As such, its ability to recognizes browsers is limited, as it will only return non-null
 * values for browser and version in the case that the user agent matches those above.
 * @param  {string} userAgent a user agent string from a browser's window.navigator.userAgent.
 * @return {Browser} - a browser specification object.
 */
export function getBrowser(userAgent) {
  // Use to track the parsed name and version.
  const browser = {
    [NAME]: null,
    [VERSION]: null,
  };
  // Setup the output object which will be returned.
  const outputBrowser = {
    name: null,
    major: null,
    minor: null,
    patch: null,
  };

  if (userAgent) {
    let val;
    for (let i = 0; i < browserTests.length; i++) {
      val = browserTests[i];
      let regex;
      if (val.test) {
        if (val.test.test(userAgent)) {
          regex = val.test;
        }
      } else if (val.tests) {
        for (let j = 0; j < val.tests.length; j++) {
          if (val.tests[j].test(userAgent)) {
            regex = val.tests[j];
            break;
          }
        }
      }
      if (regex) {
        const result = regex.exec(userAgent);
        for (let k = 0; k < val.map.length; k++) {
          if (val.map[k] === NAME || val.map[k] === VERSION) {
            browser[val.map[k]] = result[k + 1];
            // If it is not one of those two options it must be a map of some sort
          } else if (val.map[k].length === 2) {
            browser[val.map[k][0]] = val.map[k][1];
          } else if (val.map[k].length === 3) {
            browser[val.map[k][0]] = result[k + 1].replace(val.map[k][1], val.map[k][2]);
          }
        }
        break;
      }
    }
  }
  if (browser[NAME]) {
    outputBrowser.name = browser[NAME];
  }

  if (browser[VERSION]) {
    const version = browser[VERSION].split('.');
    if (version[0]) {
      outputBrowser.major = version[0];
      if (version[1]) {
        outputBrowser.minor = version[1];
        if (version[2]) {
          outputBrowser.patch = version[2];
        }
      }
    }
  }
  return outputBrowser;
}

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
