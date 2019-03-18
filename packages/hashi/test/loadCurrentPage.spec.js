/**
 * @jest-environment jest-environment-jsdom-script
 */
import http from 'http';
import loadCurrentPage, { seq, setContent } from '../src/loadCurrentPage';

describe('loadCurrentPage function', () => {
  let mockXHR;
  beforeEach(() => {
    class mockXHRClass {
      constructor() {
        mockXHR = this;
        this.readyState = 4;
        this.responseText = '<html></html>';
      }
    }
    mockXHRClass.prototype.open = jest.fn();
    mockXHRClass.prototype.send = jest.fn();
    mockXHRClass.prototype.addEventListener = jest.fn();
    mockXHRClass.prototype.setRequestHeader = jest.fn();
    window.XMLHttpRequest = mockXHRClass;
  });
  it('should add an onload event listener', () => {
    loadCurrentPage();
    expect(mockXHR.addEventListener.mock.calls[0][0]).toEqual('load');
  });
  it('should open a GET request to the current window URL', () => {
    loadCurrentPage();
    expect(mockXHR.open).toHaveBeenCalledWith('GET', window.location.href);
  });
  it('should call send', () => {
    loadCurrentPage();
    expect(mockXHR.send).toHaveBeenCalledWith();
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

describe('setContent function', () => {
  it('should add DOM elements', () => {
    setContent('<html><body><div id="this"></div></body></html>');
    expect(document.getElementById('this')).toBeDefined();
  });
  it('should add DOM elements and script elements', () => {
    window.shouldExecute = jest.fn();
    setContent(
      '<html><body><div id="this"></div></body><script>window.shouldExecute()</script></html>'
    );
    expect(document.getElementById('this')).toBeDefined();
    expect(window.shouldExecute).toHaveBeenCalled();
  });
  it('should execute inline script elements in order', () => {
    const mock1 = jest.fn();
    const mock2 = jest.fn();
    const mock3 = jest.fn();
    const promise1 = new Promise(resolve => {
      window.resolve1 = resolve;
    }).then(() => {
      expect(mock1).not.toHaveBeenCalled();
      expect(mock2).not.toHaveBeenCalled();
      expect(mock3).not.toHaveBeenCalled();
      mock1();
    });
    const promise2 = new Promise(resolve => {
      window.resolve2 = resolve;
    }).then(() => {
      expect(mock1).toHaveBeenCalled();
      expect(mock2).not.toHaveBeenCalled();
      expect(mock3).not.toHaveBeenCalled();
      mock2();
    });
    const promise3 = new Promise(resolve => {
      window.resolve3 = resolve;
    }).then(() => {
      expect(mock2).toHaveBeenCalled();
      expect(mock3).not.toHaveBeenCalled();
    });
    setContent(
      `<html>
      <body>
      <script>window.resolve1()</script>
      <script>window.resolve2()</script>
      <script>window.resolve3()</script>
      </body></html>`
    );
    return Promise.all([promise1, promise2, promise3]);
  });
  describe('scripts loaded from source', () => {
    const port = 9009;
    let app, script;
    function runServer() {
      app = http
        .createServer((request, response) => {
          //header to allow CORS request
          response.setHeader('Access-Control-Allow-Origin', '*');
          response.setHeader('Access-Control-Request-Method', '*');
          response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
          response.setHeader('Access-Control-Allow-Headers', '*');
          response.writeHead(200, { 'Content-Type': 'text/javascript' });
          response.end(script);
        })
        .listen(port, () => {});
    }
    beforeEach(() => {
      runServer();
    });
    afterEach(() => {
      app.close();
      app = undefined;
    });
    it('should execute loaded script elements in order', () => {
      const mock1 = jest.fn();
      const mock2 = jest.fn();
      const mock3 = jest.fn();
      const script1 = 'window.resolve1()';
      const script2 = 'window.resolve2()';
      const script3 = 'window.resolve3()';
      const promise1 = new Promise(resolve => {
        window.resolve1 = resolve;
      }).then(() => {
        expect(mock1).not.toHaveBeenCalled();
        expect(mock2).not.toHaveBeenCalled();
        expect(mock3).not.toHaveBeenCalled();
        script = script2;
        mock1();
      });
      const promise2 = new Promise(resolve => {
        window.resolve2 = resolve;
      }).then(() => {
        expect(mock1).toHaveBeenCalled();
        expect(mock2).not.toHaveBeenCalled();
        expect(mock3).not.toHaveBeenCalled();
        script = script3;
        mock2();
      });
      const promise3 = new Promise(resolve => {
        window.resolve3 = resolve;
      }).then(() => {
        expect(mock2).toHaveBeenCalled();
        expect(mock3).not.toHaveBeenCalled();
      });
      script = script1;
      setContent(
        `<html>
        <body>
        <script src="http://127.0.0.1:${port}/test1.js"></script>
        <script src="http://127.0.0.1:${port}/test2.js"></script>
        <script src="http://127.0.0.1:${port}/test3.js"></script>
        </body></html>`
      );
      return Promise.all([promise1, promise2, promise3]);
    });
  });
  it('should execute all script elements in order even if they error', () => {
    const mock1 = jest.fn();
    const mock2 = jest.fn();
    const mock3 = jest.fn();
    const promise1 = new Promise(resolve => {
      window.resolve1 = resolve;
    }).then(() => {
      expect(mock1).not.toHaveBeenCalled();
      expect(mock2).not.toHaveBeenCalled();
      expect(mock3).not.toHaveBeenCalled();
      mock1();
    });
    const promise2 = new Promise(resolve => {
      window.resolve2 = resolve;
    }).then(() => {
      expect(mock1).toHaveBeenCalled();
      expect(mock2).not.toHaveBeenCalled();
      expect(mock3).not.toHaveBeenCalled();
      mock2();
    });
    const promise3 = new Promise(resolve => {
      window.resolve3 = resolve;
    }).then(() => {
      expect(mock2).toHaveBeenCalled();
      expect(mock3).not.toHaveBeenCalled();
    });
    setContent(
      `<html>
      <body>
      <script>fail!</script>
      <script>window.resolve1()</script>
      <script src=""></script>
      <script>window.resolve2()</script>
      <script src(unknown)></script>
      <script>window.resolve3()</script>
      </body></html>`
    );
    return Promise.all([promise1, promise2, promise3]);
  });
});
