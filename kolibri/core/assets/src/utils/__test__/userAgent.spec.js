import { getBrowser, passesRequirements } from '../userAgent';

/*
 * Relevant test cases copied from:
 * https://github.com/faisalman/ua-parser-js/blob/master/test/browser-test.json
 */

const testCases = [
  {
    desc: 'Android Browser on Galaxy Nexus',
    ua:
      'Mozilla/5.0 (Linux; U; Android 4.0.2; en-us; Galaxy Nexus Build/ICL53F) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
    expect: {
      name: 'Android Browser',
      version: '4.0',
    },
  },
  {
    desc: 'Android Browser on Galaxy S3',
    ua:
      'Mozilla/5.0 (Linux; Android 4.4.4; en-us; SAMSUNG GT-I9300I Build/KTU84P) AppleWebKit/537.36 (KHTML, like Gecko) Version/1.5 Chrome/28.0.1500.94 Mobile Safari/537.36',
    expect: {
      name: 'Android Browser',
      version: '1.5',
    },
  },
  {
    desc: 'Android Browser on HTC Flyer (P510E)',
    ua:
      'Mozilla/5.0 (Linux; U; Android 3.2.1; ru-ru; HTC Flyer P510e Build/HTK75C) AppleWebKit/534.13 (KHTML, like Gecko) Version/4.0 Safari/534.13',
    expect: {
      name: 'Android Browser',
      version: '4.0',
    },
  },
  {
    desc: 'Android Browser on Huawei Honor Glory II (U9508)',
    ua:
      'Mozilla/5.0 (Linux; U; Android 4.0.4; ru-by; HUAWEI U9508 Build/HuaweiU9508) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30 ACHEETAHI/2100050044',
    expect: {
      name: 'Android Browser',
      version: '4.0',
    },
  },
  {
    desc: 'Android Browser on Huawei P8 (H891L)',
    ua:
      'Mozilla/5.0 (Linux; Android 4.4.4; HUAWEI H891L Build/HuaweiH891L) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/33.0.0.0 Mobile Safari/537.36',
    expect: {
      name: 'Android Browser',
      version: '4.0',
    },
  },
  {
    desc: 'Chrome',
    ua:
      'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/536.6 (KHTML, like Gecko) Chrome/20.0.1090.0 Safari/536.6',
    expect: {
      name: 'Chrome',
      version: '20.0.1090.0',
    },
  },
  {
    desc: 'Chrome WebView',
    ua:
      'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36',
    expect: {
      name: 'Chrome WebView',
      version: '43.0.2357.65',
    },
  },
  {
    desc: 'Chrome on iOS',
    ua:
      'Mozilla/5.0 (iPhone; U; CPU iPhone OS 5_1_1 like Mac OS X; en) AppleWebKit/534.46.0 (KHTML, like Gecko) CriOS/19.0.1084.60 Mobile/9B206 Safari/7534.48.3',
    expect: {
      name: 'Chrome',
      version: '19.0.1084.60',
    },
  },
  {
    desc: 'Chrome on Android',
    ua:
      'Mozilla/5.0 (Linux; U; Android-4.0.3; en-us; Galaxy Nexus Build/IML74K) AppleWebKit/535.7 (KHTML, like Gecko) CrMo/16.0.912.75 Mobile Safari/535.7',
    expect: {
      name: 'Chrome',
      version: '16.0.912.75',
    },
  },
  {
    desc: 'Firefox',
    ua: 'Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2',
    expect: {
      name: 'Firefox',
      version: '15.0a2',
    },
  },
  {
    desc: 'IE 11 with IE token',
    ua: 'Mozilla/5.0 (IE 11.0; Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko',
    expect: {
      name: 'IE',
      version: '11.0',
    },
  },
  {
    desc: 'IE 11 without IE token',
    ua: 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv 11.0) like Gecko',
    expect: {
      name: 'IE',
      version: '11.0',
    },
  },
  {
    desc: 'Mobile Safari',
    ua:
      'Mozilla/5.0 (iPhone; U; CPU iPhone OS 4_0 like Mac OS X; en-us) AppleWebKit/532.9 (KHTML, like Gecko) Version/4.0.5 Mobile/8A293 Safari/6531.22.7',
    expect: {
      name: 'Mobile Safari',
      version: '4.0.5',
    },
  },
  {
    desc: 'Opera Webkit',
    ua:
      'Mozilla/5.0 AppleWebKit/537.22 (KHTML, like Gecko) Chrome/25.0.1364.123 Mobile Safari/537.22 OPR/14.0.1025.52315',
    expect: {
      name: 'Opera',
      version: '14.0.1025.52315',
    },
  },
  {
    desc: 'Safari',
    ua:
      'Mozilla/5.0 (Windows; U; Windows NT 5.2; en-US) AppleWebKit/533.17.8 (KHTML, like Gecko) Version/5.0.1 Safari/533.17.8',
    expect: {
      name: 'Safari',
      version: '5.0.1',
    },
  },
  {
    desc: 'Microsoft Edge',
    ua:
      'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0',
    expect: {
      name: 'Edge',
      version: '12.0',
    },
  },
  {
    desc: 'Microsoft Edge on iOS',
    ua:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 11_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.0 EdgiOS/42.1.1.0 Mobile/15F79 Safari/605.1.15',
    expect: {
      name: 'Edge',
      version: '42.1.1.0',
    },
  },
  {
    desc: 'Microsoft Edge on Android',
    ua:
      'Mozilla/5.0 (Linux; Android 8.0.0; G8441 Build/47.1.A.12.270) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.123 Mobile Safari/537.36 EdgA/42.0.0.2529',
    expect: {
      name: 'Edge',
      version: '42.0.0.2529',
    },
  },
  {
    desc: 'Firefox iOS',
    ua:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) FxiOS/1.1 Mobile/13B143 Safari/601.1.46',
    expect: {
      name: 'Firefox',
      version: '1.1',
    },
  },
];

describe('userAgent detection', () => {
  testCases.forEach(testCase => {
    it(`should register the browser ${testCase.desc} as ${testCase.expect.name}`, () => {
      const browser = getBrowser(testCase.ua);
      expect(browser.name).toBe(testCase.expect.name);
      const version = testCase.expect.version.split('.');
      if (version[0]) {
        expect(browser.major).toEqual(version[0]);
      }
      if (version[1]) {
        expect(browser.minor).toEqual(version[1]);
      }
      if (version[2]) {
        expect(browser.patch).toEqual(version[2]);
      }
    });
  });
});

describe('requirements detection', () => {
  it('should pass when only major and major version is greater than or equal', () => {
    const browserName = 'test';
    const major = 1;
    const browser = {
      name: browserName,
      major,
    };
    const requirements = {
      [browserName]: {
        major,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(true);
  });
  it('should fail when only major and major version is less than', () => {
    const browserName = 'test';
    const major = 1;
    const browser = {
      name: browserName,
      major,
    };
    const requirements = {
      [browserName]: {
        major: major + 1,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should pass when major and minor, major and minor version are greater than or equal', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const browser = {
      name: browserName,
      major,
      minor,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(true);
  });
  it('should fail when major and minor and minor version is less than', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const browser = {
      name: browserName,
      major,
      minor,
    };
    const requirements = {
      [browserName]: {
        major,
        minor: minor + 1,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should fail when major and minor and minor version is undefined', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const browser = {
      name: browserName,
      major,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should pass when major/minor/patch, major/minor/patch version are greater than or equal', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const patch = 3;
    const browser = {
      name: browserName,
      major,
      minor,
      patch,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
        patch,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(true);
  });
  it('should fail when major/minor/patch, patch version is less than', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const patch = 3;
    const browser = {
      name: browserName,
      major,
      minor,
      patch,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
        patch: patch + 1,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
  it('should fail when major/minor/patch, patch version is undefined', () => {
    const browserName = 'test';
    const major = 1;
    const minor = 2;
    const patch = 3;
    const browser = {
      name: browserName,
      major,
      minor,
    };
    const requirements = {
      [browserName]: {
        major,
        minor,
        patch,
      },
    };
    expect(passesRequirements(browser, requirements)).toBe(false);
  });
});
