import { getScripts, replaceScript, seq, setScripts } from '../src/replaceScript';

function headScript(scriptTag) {
  return `<html><head><template hashi-script="true">${scriptTag}</template></head></html>`;
}

function bodyScript(scriptTag) {
  return `<html><body><template hashi-script="true">${scriptTag}</template></body></html>`;
}

function replaceTestScript(callback = () => {}) {
  replaceScript(getScripts(document)[0], callback);
}

describe('getScript function', () => {
  it('should return script tags in the head that have no type', () => {
    document.documentElement.innerHTML = headScript('<script>window;</script>');
    const script = getScripts(document)[0];
    expect(script.innerHTML).toBe('window;');
  });
  it('should return script tags in the body that have no type', () => {
    document.documentElement.innerHTML = bodyScript('<script>window;</script>');
    const script = getScripts(document)[0];
    expect(script.innerHTML).toBe('window;');
  });
  it('should set the original parentNode on the tag as _parentNode', () => {
    document.documentElement.innerHTML = headScript('<script>window;</script>');
    const script = getScripts(document)[0];
    expect(script._parentNode).toBe(document.head);
  });
});

describe('replaceScript function', () => {
  // Because JSDOM does not handle script tags embedded inside
  // template tags in the same way a browser does, it is not possible
  // to test other functionality here.
  describe('inline JS', () => {
    it('should preserve arbitrary attributes from a script tag', () => {
      document.documentElement.innerHTML = bodyScript('<script data-test="test"></script>');
      replaceTestScript();
      const script = document.querySelector('script');
      expect(script.getAttribute('data-test')).toBe('test');
    });
    it('should remove async attribute from a script tag if no async tag on the template tag', () => {
      document.documentElement.innerHTML = bodyScript('<script async="true"></script>');
      replaceTestScript();
      const script = document.querySelector('script');
      expect(script.getAttribute('async')).toBe(null);
    });
    it('should preserve async attribute from a template tag', () => {
      document.documentElement.innerHTML = `<html><body><template async="true" hashi-script="true"><script></script></template></body></html>`;
      replaceTestScript();
      const script = document.querySelector('script');
      expect(script.getAttribute('async')).toBe('true');
    });
    it('should preserve async attribute from a template tag but not overwrite script async attribute', () => {
      document.documentElement.innerHTML = `<html><body><template async="true" hashi-script="true"><script async="bananas"></script></template></body></html>`;
      replaceTestScript();
      const script = document.querySelector('script');
      expect(script.getAttribute('async')).toBe('bananas');
    });
  });
});

describe('seq function', () => {
  it('should execute a sequence of async functions that accept callbacks in order', () => {
    let resolve1, resolve2;
    let promise1, promise2;
    const mock1 = jest.fn();
    const mock2 = jest.fn();
    const mock3 = jest.fn();
    const fns = [
      callback => {
        promise1 = new Promise(resolve => {
          resolve1 = resolve;
        }).then(() => {
          mock1();
          callback();
        });
      },
      callback => {
        promise2 = new Promise(resolve => {
          resolve2 = resolve;
        }).then(() => {
          mock2();
          callback();
        });
      },
      callback => {
        new Promise(() => {}).then(() => {
          mock3();
          callback();
        });
      },
    ];
    seq(fns);
    expect(mock1).not.toHaveBeenCalled();
    expect(mock2).not.toHaveBeenCalled();
    expect(mock3).not.toHaveBeenCalled();
    resolve1();
    return promise1.then(() => {
      expect(mock1).toHaveBeenCalled();
      expect(mock2).not.toHaveBeenCalled();
      expect(mock3).not.toHaveBeenCalled();
      resolve2();
      return promise2.then(() => {
        expect(mock2).toHaveBeenCalled();
        expect(mock3).not.toHaveBeenCalled();
      });
    });
  });
  it('should fire a DOMContentLoaded event when the last async function has completed', () => {
    let promise1, promise2, promise3;
    const fns = [
      callback => {
        promise1 = Promise.resolve().then(() => {
          callback();
        });
      },
      callback => {
        promise2 = Promise.resolve().then(() => {
          callback();
        });
      },
      callback => {
        promise3 = Promise.resolve().then(() => {
          callback();
        });
      },
    ];
    const listener = jest.fn();
    document.addEventListener('DOMContentLoaded', listener);
    seq(fns);
    return Promise.all([promise1, promise2, promise3]).then(() => {
      expect(listener).toHaveBeenCalled();
    });
  });
});

describe('setScripts function', () => {
  // Because JSDOM does not handle script tags embedded inside
  // template tags in the same way a browser does, it is not possible
  // to test other functionality here.
  it('should trigger onload methods', () => {
    window.mock1 = jest.fn();
    document.documentElement.innerHTML = `<html>
      <body onload="window.mock1()">
      </div>
      </body></html>`;
    setScripts();
    expect(window.mock1).toHaveBeenCalled();
  });
});
