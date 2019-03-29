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

export function getBrowser(userAgent) {
  const browser = {
    [NAME]: null,
    [VERSION]: null,
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
  if (browser[VERSION]) {
    browser[VERSION] = browser[VERSION].split('.');
  }
  return browser;
}

export function passesRequirements(browser, requirements) {
  if (browser[VERSION] && browser[NAME]) {
    const entry = requirements[browser[NAME]];
    if (entry) {
      const version = browser[VERSION];
      if (version[0] < entry.major) {
        return false;
      } else if (version[0] === entry.major) {
        if (entry.minor && (version[1] < entry.minor || !version[1])) {
          return false;
        } else if (entry.minor && version[1] === entry.minor) {
          if (entry.patch && (version[2] < entry.patch || !version[2])) {
            return false;
          }
        }
      }
    }
  }
  return true;
}
