function withArrayMethods(overrides, fn) {
  const saved = {};
  for (const name of Object.keys(overrides)) {
    saved[name] = Array.prototype[name];
    if (overrides[name]) {
      Array.prototype[name] = saved[name] || (() => []);
    } else {
      delete Array.prototype[name];
    }
  }
  try {
    fn();
  } finally {
    for (const name of Object.keys(saved)) {
      if (saved[name] === undefined) {
        delete Array.prototype[name];
      } else {
        Array.prototype[name] = saved[name];
      }
    }
  }
}

describe('polyfillLoader', () => {
  let writeSpy;

  beforeEach(() => {
    jest.resetModules();
    writeSpy = jest.spyOn(document, 'write').mockImplementation(() => {});
    Object.defineProperty(document, 'currentScript', {
      get: () => ({ dataset: { polyfillUrl: 'test-polyfills.js' } }),
      configurable: true,
    });
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('writes a polyfill <script> tag when ES2023 array copy methods are absent', () => {
    withArrayMethods({ toSorted: false }, () => {
      require('../polyfillLoader');

      expect(writeSpy).toHaveBeenCalledWith(
        expect.stringMatching(/<script[^>]+src=["']test-polyfills\.js["']/),
      );
    });
  });

  it('writes the polyfill script tag without async or defer attributes', () => {
    withArrayMethods({ toSorted: false }, () => {
      require('../polyfillLoader');

      const call = writeSpy.mock.calls[0][0];
      expect(call).not.toMatch(/\basync\b/);
      expect(call).not.toMatch(/\bdefer\b/);
    });
  });

  it('does not write a polyfill script tag when ES2023 array copy methods are present', () => {
    withArrayMethods({ toSorted: true, toReversed: true, toSpliced: true, with: true }, () => {
      require('../polyfillLoader');

      expect(writeSpy).not.toHaveBeenCalled();
    });
  });
});
