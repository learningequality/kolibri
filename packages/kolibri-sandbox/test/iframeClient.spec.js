import 'mutationobserver-shim';
import Sandbox from '../src/iframeClient';
import SandboxHandler from '../src/SandboxHandler';
import SandboxShim from '../src/SandboxShim';
import { events, nameSpace } from '../src/base';

class TestHandler extends SandboxHandler {
  init(iframe, startUrl) {
    iframe.src = startUrl;
    return Promise.resolve();
  }
}

// The parts of the SandboxHandler contract that createIframe drives.
function mockHandler(overrides = {}) {
  return {
    init: jest.fn().mockResolvedValue(),
    setNow: jest.fn(),
    setData: jest.fn(),
    setUserData: jest.fn(),
    getProgress: () => null,
    _initializeShims: jest.fn(),
    ...overrides,
  };
}

// Mirror _loadHandler's contract: the handler script registers a handler as it loads.
function loadHandlerRegistering(pick) {
  Sandbox.prototype._loadHandler.mockImplementation(async function (url) {
    this.registerHandler(await pick(url));
  });
}

describe('Sandbox iframeClient', () => {
  let sandbox;
  beforeEach(() => {
    jest.spyOn(Sandbox.prototype, '_loadHandler').mockReturnValue(undefined);
    window.name = nameSpace;
    sandbox = new Sandbox();
  });
  afterEach(() => {
    sandbox.iframe?.remove();
    // Remove this instance's window message listener so leftover mediators from
    // earlier tests don't receive messages and re-trigger createIframe.
    sandbox.mediator.destroy();
    jest.restoreAllMocks();
  });
  describe('constructor method', () => {
    it('should bind a listener to a readycheck event to send a ready event', () => {
      sandbox.mediator.sendMessage = jest.fn();
      return new Promise(resolve => {
        sandbox.mediator.registerMessageHandler({
          nameSpace,
          event: events.READYCHECK,
          callback: () => {
            resolve();
          },
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.READYCHECK });
      }).then(() => {
        expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
          nameSpace,
          event: events.IFRAMEREADY,
          data: true,
        });
      });
    });
    it('should bind a listener to a ready event to call the createIframe callback', () => {
      expect(sandbox.mediator.__messageHandlers[nameSpace][events.MAINREADY].length).toBe(1);
    });
    it('should call the createIframe method when the main ready event is triggered', () => {
      const createIframe = jest.fn();
      sandbox.mediator.__messageHandlers[nameSpace][events.MAINREADY] = [createIframe];
      sandbox.mediator.sendMessage = jest.fn();
      return new Promise(resolve => {
        sandbox.mediator.registerMessageHandler({
          nameSpace,
          event: events.MAINREADY,
          callback: () => {
            resolve();
          },
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.MAINREADY });
      }).then(() => {
        expect(createIframe).toHaveBeenCalled();
      });
    });
  });

  describe('handler registration', () => {
    it('should report HANDLER_ERROR when no handler url is given', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({ contentNamespace: 'test', startUrl: 'http://test.com' });

      expect(Sandbox.prototype._loadHandler).not.toHaveBeenCalled();
      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.ERROR,
        data: { message: expect.stringMatching(/handlerUrl is required/), error: 'HANDLER_ERROR' },
      });
    });
  });

  describe('handler registration ordering', () => {
    it('should emit HANDLER_REGISTRATION before the handler loads the content', async () => {
      const srcAtRegistration = [];
      sandbox.mediator.sendMessage = jest.fn(msg => {
        if (msg.event === events.HANDLER_REGISTRATION) {
          srcAtRegistration.push(sandbox.iframe.src);
        }
      });
      loadHandlerRegistering(() => new TestHandler(sandbox));

      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com/',
        handlerUrl: 'http://handler.js',
      });

      expect(srcAtRegistration).toEqual(['']);
      expect(sandbox.iframe.src).toBe('http://test.com/');
    });
  });

  describe('repeated MAINREADY', () => {
    it('should build the content only once', async () => {
      // Main re-sends MAINREADY on every IFRAMEREADY, so the same build arrives twice.
      loadHandlerRegistering(() => new TestHandler(sandbox));
      sandbox.mediator.sendMessage = jest.fn();
      const mainReady = {
        nameSpace,
        event: events.MAINREADY,
        data: {
          contentNamespace: 'test',
          startUrl: 'http://test.com/',
          handlerUrl: 'http://handler.js',
        },
      };

      sandbox.mediator.handleMessage({ data: mainReady });
      sandbox.mediator.handleMessage({ data: mainReady });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(Sandbox.prototype._loadHandler).toHaveBeenCalledTimes(1);
      expect(document.body.querySelectorAll('iframe')).toHaveLength(1);
      expect(sandbox.iframe.src).toBe('http://test.com/');
    });
  });

  describe('clock propagation', () => {
    const shimClock = () => sandbox.handler.shims.localStorage.__now().getTime();

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1000);
      loadHandlerRegistering(() => new TestHandler(sandbox));
      sandbox.mediator.sendMessage = jest.fn();
    });

    it('should propagate the injected clock to the handler after registration', async () => {
      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
        now: 4242,
      });

      expect(shimClock()).toBe(4242);
    });
  });

  describe('session restoration', () => {
    it('should hand the saved state and user data to the handler before content loads', async () => {
      // The content's own scripts read the shims as they load, so the data has to
      // already be there.
      class ObservingHandler extends TestHandler {
        init(...args) {
          this.shimsAtInit = {
            state: this.shims.localStorage.data,
            userData: this.shims.localStorage.userData,
          };
          return super.init(...args);
        }
      }
      loadHandlerRegistering(() => new ObservingHandler(sandbox));
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
        contentState: { localStorage: { key: 'value' } },
        userData: { userId: 'test123' },
      });

      expect(sandbox.handler.shimsAtInit).toEqual({
        state: { key: 'value' },
        userData: { userId: 'test123' },
      });
    });

    it('should register once the session is restored, so main learns its progress', async () => {
      class ScoredShim extends SandboxShim {
        static shimName = 'SCORM';
        getProgress() {
          return this.data.score ?? null;
        }
      }
      class ScoredHandler extends TestHandler {
        static shims = [ScoredShim];
      }
      loadHandlerRegistering(() => new ScoredHandler(sandbox));
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
        contentState: { SCORM: { score: 0.5 } },
      });

      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { progress: 0.5 },
      });
    });

    it('should give the handler empty state when nothing has been saved', async () => {
      loadHandlerRegistering(() => new TestHandler(sandbox));
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });

      expect(sandbox.handler.shims.localStorage.data).toEqual({});
      expect(sandbox.handler.shims.localStorage.userData).toEqual({});
    });

    it('should hand user data main sends later to every shim', async () => {
      loadHandlerRegistering(() => new TestHandler(sandbox));
      sandbox.mediator.sendMessage = jest.fn();
      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
        userData: { userId: 'before' },
      });

      sandbox.mediator.handleMessage({
        data: { nameSpace, event: events.USERDATAUPDATE, data: { userId: 'after' } },
      });

      for (const shim of Object.values(sandbox.handler.shims)) {
        expect(shim.userData).toEqual({ userId: 'after' });
      }
    });
  });

  describe('loading signalling', () => {
    function loadWith(init) {
      const handler = mockHandler({ init });
      loadHandlerRegistering(() => handler);
      sandbox.mediator.sendMessage = jest.fn();
      return sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });
    }

    it('should clear the loading state once content is loaded', async () => {
      await loadWith(jest.fn().mockResolvedValue());

      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.LOADING,
        data: false,
      });
    });

    it('should clear the loading state even if contentWindow is null after init', async () => {
      // Otherwise the consumer hangs in the loading state indefinitely.
      await loadWith(
        jest.fn(iframe => {
          Object.defineProperty(iframe, 'contentWindow', {
            configurable: true,
            get: () => null,
          });
          return Promise.resolve();
        }),
      );

      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.LOADING,
        data: false,
      });
    });

    // zip_wsgi marks any zipcontent 404 with this meta, and the iframe fires load
    // for the error body like any other navigation.
    function failNavigation(iframe, message) {
      const meta = iframe.contentDocument.createElement('meta');
      meta.setAttribute('name', 'sandbox-error');
      meta.setAttribute('content', message);
      iframe.contentDocument.head.appendChild(meta);
      iframe.dispatchEvent(new Event('load'));
    }

    const errorsSent = () =>
      sandbox.mediator.sendMessage.mock.calls.filter(([msg]) => msg.event === events.ERROR);

    it('should report LOADING_ERROR when the content document marks itself failed', async () => {
      await loadWith(
        jest.fn(iframe => {
          failNavigation(iframe, 'Could not read the zip file');
          return Promise.resolve();
        }),
      );

      expect(errorsSent()).toEqual([
        [
          {
            nameSpace,
            event: events.ERROR,
            data: { message: 'Could not read the zip file', error: 'LOADING_ERROR' },
          },
        ],
      ]);
      expect(sandbox.mediator.sendMessage).not.toHaveBeenCalledWith({
        nameSpace,
        event: events.LOADING,
        data: false,
      });
    });

    it('should report LOADING_ERROR for a failed navigation after the content loaded', async () => {
      // A learner following a broken link inside a zip lands on the same 404 body.
      await loadWith(jest.fn().mockResolvedValue());
      sandbox.iframe.dispatchEvent(new Event('load'));
      expect(errorsSent()).toEqual([]);

      failNavigation(sandbox.iframe, 'File not found');

      expect(errorsSent()).toEqual([
        [
          {
            nameSpace,
            event: events.ERROR,
            data: { message: 'File not found', error: 'LOADING_ERROR' },
          },
        ],
      ]);
    });

    it('should report HANDLER_ERROR when the handler never loads', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      Sandbox.prototype._loadHandler.mockRejectedValue(new Error('Failed to load handler script'));
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });

      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.ERROR,
        data: { message: 'Failed to load handler script', error: 'HANDLER_ERROR' },
      });
    });
  });

  describe('initializeIframe', () => {
    // The content document calls this from its own <head>, before any of its
    // scripts run. Shimming only happens here - see the comment on the method.
    async function withHandler(handler) {
      loadHandlerRegistering(() => handler);
      sandbox.mediator.sendMessage = jest.fn();
      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });
    }

    it('should ignore a call before any content has been built', () => {
      expect(() => sandbox.initializeIframe(window)).not.toThrow();
    });

    it('should not shim the content window as a side effect of loading', async () => {
      // jsdom replaces the frame's window when TestHandler navigates, which would hide
      // anything installed during the build.
      class StayingHandler extends SandboxHandler {
        init() {
          return Promise.resolve();
        }
      }
      const handler = new StayingHandler(sandbox);
      await withHandler(handler);

      expect(sandbox.iframe.contentWindow.localStorage).not.toBe(handler.shims.localStorage.shim);
    });

    it('should shim the content window when the content document calls in', async () => {
      const handler = new TestHandler(sandbox);
      await withHandler(handler);
      const contentWindow = sandbox.iframe.contentWindow;

      sandbox.initializeIframe(contentWindow);

      expect(contentWindow.localStorage).toBe(handler.shims.localStorage.shim);
    });

    it('should ignore windows that are not the content iframe', async () => {
      const localStorage = window.localStorage;
      await withHandler(new TestHandler(sandbox));

      sandbox.initializeIframe(window);

      expect(window.localStorage).toBe(localStorage);
    });

    it('should report a shimming failure rather than silently not persisting', async () => {
      jest.spyOn(console, 'error').mockImplementation();
      class FailingShim extends SandboxShim {
        static shimName = 'failingShim';
        initialize() {
          throw new Error('blocked');
        }
      }
      class FailingHandler extends TestHandler {
        static shims = [FailingShim];
      }
      await withHandler(new FailingHandler(sandbox));

      sandbox.initializeIframe(sandbox.iframe.contentWindow);

      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.ERROR,
        data: { message: 'Failed to initialize shims: failingShim', error: 'HANDLER_ERROR' },
      });
    });
  });
});

describe('Sandbox _loadHandler', () => {
  let sandbox;

  beforeEach(() => {
    document.head.innerHTML = '';
    sandbox = new Sandbox();
  });

  afterEach(() => {
    sandbox.mediator.destroy();
    jest.useRealTimers();
  });

  const appendedScripts = () => Array.from(document.head.querySelectorAll('script'));

  it('resolves once the script it appended has registered a handler', async () => {
    const promise = sandbox._loadHandler('http://example.test/handler.js');
    const script = appendedScripts()[0];
    expect(script.src).toBe('http://example.test/handler.js');

    sandbox.registerHandler(new SandboxHandler(sandbox));
    script.onload();

    await expect(promise).resolves.toBeUndefined();
  });

  it('waits for a slow handler script however long it takes', async () => {
    jest.useFakeTimers();
    const settled = jest.fn();
    const promise = sandbox._loadHandler('http://example.test/handler.js');
    promise.then(settled, settled);
    jest.runAllTimers();
    await Promise.resolve();
    expect(settled).not.toHaveBeenCalled();

    sandbox.registerHandler(new SandboxHandler(sandbox));
    appendedScripts()[0].onload();

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when the script loads but never registers', async () => {
    const promise = sandbox._loadHandler('http://example.test/handler.js');

    appendedScripts()[0].onload();

    await expect(promise).rejects.toThrow(/did not register/);
  });

  it('rejects when the script fails to load', async () => {
    const promise = sandbox._loadHandler('http://example.test/handler.js');

    appendedScripts()[0].onerror();

    await expect(promise).rejects.toThrow(/Failed to load/);
  });
});
