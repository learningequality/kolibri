import 'mutationobserver-shim';
import Sandbox from '../src/iframeClient';
import { events, nameSpace } from '../src/base';
import * as handlerLoader from '../src/handlerLoader';

jest.mock('../src/handlerLoader');

// The parts of the SandboxHandler contract that createIframe drives.
function mockHandler(overrides = {}) {
  return {
    getRegistration: () => ({ shims: [] }),
    init: jest.fn().mockResolvedValue(),
    setNow: jest.fn(),
    setData: jest.fn(),
    setUserData: jest.fn(),
    _initializeShims: jest.fn(),
    _destroyShims: jest.fn(),
    destroy: jest.fn(),
    ...overrides,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('Sandbox iframeClient', () => {
  let sandbox;
  beforeEach(() => {
    window.name = nameSpace;
    sandbox = new Sandbox();
  });
  afterEach(() => {
    // Remove this instance's window message listener so leftover mediators from
    // earlier tests don't receive messages and re-trigger createIframe.
    sandbox.mediator.destroy();
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

  describe('handler registration ordering', () => {
    it('should emit HANDLER_REGISTRATION before calling handler.init', async () => {
      const eventOrder = [];

      sandbox.mediator.sendMessage = jest.fn(msg => {
        eventOrder.push({ type: 'sendMessage', event: msg.event });
      });

      const handler = mockHandler({
        getRegistration: () => ({
          shims: ['testShim'],
        }),
        init: jest.fn(() => {
          eventOrder.push({ type: 'handlerInit' });
          return Promise.resolve();
        }),
      });

      // Mock loadHandler to register the handler
      handlerLoader.loadHandler.mockImplementation(async (url, sandboxEnv) => {
        sandboxEnv.registerHandler(handler);
      });

      // Call createIframe with a handler URL
      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });

      // Find indices of relevant events
      const registrationIndex = eventOrder.findIndex(
        e => e.type === 'sendMessage' && e.event === 'handlerregistration',
      );
      const initIndex = eventOrder.findIndex(e => e.type === 'handlerInit');

      expect(registrationIndex).toBeGreaterThanOrEqual(0);
      expect(initIndex).toBeGreaterThanOrEqual(0);
      expect(registrationIndex).toBeLessThan(initIndex);
    });

    it('should include all shim registrations in the HANDLER_REGISTRATION event', async () => {
      let capturedRegistration = null;
      sandbox.mediator.sendMessage = jest.fn(msg => {
        if (msg.event === 'handlerregistration') {
          capturedRegistration = msg.data;
        }
      });

      const handler = mockHandler({
        getRegistration: () => ({
          shims: ['shimA', 'shimB'],
        }),
      });

      // Mock loadHandler to register the handler
      handlerLoader.loadHandler.mockImplementation(async (url, sandboxEnv) => {
        sandboxEnv.registerHandler(handler);
      });

      // Call createIframe with a handler URL
      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });

      expect(capturedRegistration).not.toBeNull();
      expect(capturedRegistration.shims).toContain('shimA');
      expect(capturedRegistration.shims).toContain('shimB');
    });
  });

  describe('repeated and overlapping builds', () => {
    it('should ignore a repeat of the build already in flight', async () => {
      // Main re-sends MAINREADY on every IFRAMEREADY, so the same build arrives twice.
      const handler = mockHandler();
      const gate = deferred();
      handlerLoader.loadHandler.mockImplementation(async (url, env) => {
        await gate.promise;
        env.registerHandler(handler);
      });
      handlerLoader.loadHandler.mockClear();
      sandbox.mediator.sendMessage = jest.fn();

      const build = sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });
      const repeat = sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });
      gate.resolve();
      await Promise.all([build, repeat]);

      expect(handlerLoader.loadHandler).toHaveBeenCalledTimes(1);
      expect(handler.init).toHaveBeenCalledTimes(1);
    });

    it('should let an in-flight build settle before replacing it with other content', async () => {
      // Otherwise the first run resumes after the swap and initializes the second
      // run's iframe, and its handler registration lands on top of the live one.
      const first = mockHandler();
      const second = mockHandler();
      const gate = deferred();
      handlerLoader.loadHandler.mockImplementation(async (url, env) => {
        if (url === 'http://first.js') {
          await gate.promise;
          env.registerHandler(first);
        } else {
          env.registerHandler(second);
        }
      });
      sandbox.mediator.sendMessage = jest.fn();

      const firstBuild = sandbox.createIframe({
        contentNamespace: 'one',
        startUrl: 'http://one.com',
        handlerUrl: 'http://first.js',
      });
      const secondBuild = sandbox.createIframe({
        contentNamespace: 'two',
        startUrl: 'http://two.com',
        handlerUrl: 'http://second.js',
      });
      gate.resolve();
      await Promise.all([firstBuild, secondBuild]);

      expect(first.init).toHaveBeenCalledTimes(1);
      expect(second.init).toHaveBeenCalledTimes(1);
      expect(first.init.mock.calls[0][0]).not.toBe(second.init.mock.calls[0][0]);
      expect(second.init.mock.calls[0][0]).toBe(sandbox.iframe);
      expect(sandbox.handler).toBe(second);
    });

    it('should unsubscribe the replaced handler shims', async () => {
      // The shims subscribe on the shared mediator, so a handler left subscribed
      // keeps taking state pushed for its successor.
      const first = mockHandler();
      const second = mockHandler();
      handlerLoader.loadHandler.mockImplementation(async (url, env) => {
        env.registerHandler(url === 'http://first.js' ? first : second);
      });
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({
        contentNamespace: 'one',
        startUrl: 'http://one.com',
        handlerUrl: 'http://first.js',
      });
      await sandbox.createIframe({
        contentNamespace: 'two',
        startUrl: 'http://two.com',
        handlerUrl: 'http://second.js',
      });

      expect(first._destroyShims).toHaveBeenCalled();
      expect(second._destroyShims).not.toHaveBeenCalled();
    });
  });

  describe('clock propagation', () => {
    it('should propagate the injected clock to the handler after registration', async () => {
      const handler = mockHandler();
      handlerLoader.loadHandler.mockImplementation(async (url, env) => {
        env.registerHandler(handler);
      });
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
        now: 4242,
      });

      expect(handler.setNow).toHaveBeenCalledWith(4242);
    });
  });

  describe('session restoration', () => {
    it('should hand the saved state and user data to the handler before content loads', async () => {
      const applied = [];
      const handler = mockHandler({
        init: jest.fn(() => {
          applied.push('init');
          return Promise.resolve();
        }),
        setData: jest.fn(() => applied.push('setData')),
        setUserData: jest.fn(() => applied.push('setUserData')),
      });
      handlerLoader.loadHandler.mockImplementation(async (url, env) => {
        env.registerHandler(handler);
      });
      sandbox.mediator.sendMessage = jest.fn();

      const contentState = { localStorage: { key: 'value' } };
      const userData = { userId: 'test123' };
      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
        contentState,
        userData,
      });

      expect(handler.setData).toHaveBeenCalledWith(contentState);
      expect(handler.setUserData).toHaveBeenCalledWith(userData);
      // The content's own scripts read the shims as they load, so the data has to
      // already be there.
      expect(applied).toEqual(['setData', 'setUserData', 'init']);
    });

    it('should give the handler empty state when nothing has been saved', async () => {
      const handler = mockHandler();
      handlerLoader.loadHandler.mockImplementation(async (url, env) => {
        env.registerHandler(handler);
      });
      sandbox.mediator.sendMessage = jest.fn();

      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });

      expect(handler.setData).toHaveBeenCalledWith({});
      expect(handler.setUserData).toHaveBeenCalledWith({});
    });
  });

  describe('loading signalling', () => {
    function loadWith(init) {
      const handler = mockHandler({ init });
      handlerLoader.loadHandler.mockImplementation(async (url, env) => {
        env.registerHandler(handler);
      });
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
  });

  describe('initializeIframe', () => {
    // The content document calls this from its own <head>, before any of its
    // scripts run. Shimming only happens here - see the comment on the method.
    async function withHandler(handler) {
      handlerLoader.loadHandler.mockImplementation(async (url, sandboxEnv) => {
        sandboxEnv.registerHandler(handler);
      });
      sandbox.mediator.sendMessage = jest.fn();
      await sandbox.createIframe({
        contentNamespace: 'test',
        startUrl: 'http://test.com',
        handlerUrl: 'http://handler.js',
      });
    }

    it('should not shim the content window as a side effect of loading', async () => {
      const handler = mockHandler();
      await withHandler(handler);

      expect(handler._initializeShims).not.toHaveBeenCalled();
    });

    it('should shim the content window when the content document calls in', async () => {
      const handler = mockHandler();
      await withHandler(handler);

      sandbox.initializeIframe(sandbox.iframe.contentWindow);

      expect(handler._initializeShims).toHaveBeenCalledWith(sandbox.iframe.contentWindow, {
        contentNamespace: 'test',
      });
    });

    it('should ignore windows that are not the content iframe', async () => {
      const handler = mockHandler();
      await withHandler(handler);

      sandbox.initializeIframe(window);

      expect(handler._initializeShims).not.toHaveBeenCalled();
    });
  });
});
