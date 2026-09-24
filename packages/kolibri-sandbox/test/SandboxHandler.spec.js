import SandboxHandler from '../src/SandboxHandler';
import SandboxShim from '../src/SandboxShim';
import { createMediator, destroyMediators } from './__fixtures__/mediators';

class TestShim extends SandboxShim {
  static shimName = 'testShim';
}

class AnotherShim extends SandboxShim {
  static shimName = 'anotherShim';
}

class MultiShimHandler extends SandboxHandler {
  static shims = [TestShim, AnotherShim];
  async init() {}
}

class BaseShimsHandler extends SandboxHandler {
  async init() {}
}

describe('SandboxHandler', () => {
  afterEach(destroyMediators);

  describe('constructor', () => {
    it('should register only once its subclass is fully constructed', () => {
      class FieldHandler extends SandboxHandler {
        static shims = [TestShim];
        constructor(sandbox) {
          super(sandbox);
          this.ready = true;
        }
        async init() {}
      }
      let readyWhenRegistered;
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), sendMessage: jest.fn() },
        registerHandler: jest.fn(handler => {
          readyWhenRegistered = handler.ready;
        }),
      };

      window.sandbox = mockSandbox;

      try {
        FieldHandler.register();
      } finally {
        delete window.sandbox;
      }

      expect(mockSandbox.registerHandler).toHaveBeenCalledWith(expect.any(FieldHandler));
      expect(readyWhenRegistered).toBe(true);
    });

    it('should refuse to register without a sandbox environment', () => {
      expect(() => BaseShimsHandler.register()).toThrow(/sandbox environment/);
    });

    it('should give a handler the base shims alongside its own', () => {
      const handler = new MultiShimHandler({ mediator: createMediator(window) });

      expect(Object.keys(handler.shims).sort()).toEqual(
        ['anotherShim', 'cookie', 'indexedDB', 'localStorage', 'sessionStorage', 'testShim'].sort(),
      );
    });

    it('should not give a handler the Kolibri data API by default', () => {
      const handler = new BaseShimsHandler({ mediator: createMediator(window) });

      expect(handler.shims).not.toHaveProperty('kolibri');
    });
  });

  describe('setData', () => {
    it('should route each namespace to the shim that owns it', () => {
      const handler = new MultiShimHandler({ mediator: createMediator(window) });

      handler.setData({ testShim: { a: 1 } });

      expect(handler.shims.testShim.data).toEqual({ a: 1 });
      expect(handler.shims.anotherShim.data).toEqual({});
    });

    it('should drop an unrecognised namespace without disturbing the others', () => {
      const handler = new MultiShimHandler({ mediator: createMediator(window) });

      expect(() => handler.setData({ goneShim: { a: 1 }, testShim: { b: 2 } })).not.toThrow();

      expect(handler.shims.testShim.data).toEqual({ b: 2 });
    });
  });

  describe('setUserData', () => {
    it('should propagate the user data to every shim', () => {
      const handler = new MultiShimHandler({ mediator: createMediator(window) });

      handler.setUserData({ userId: 'abc' });

      for (const shim of Object.values(handler.shims)) {
        expect(shim.userData).toEqual({ userId: 'abc' });
      }
    });
  });

  describe('setNow', () => {
    it('should put every shim on the server clock', () => {
      jest.useFakeTimers({ now: 0 });
      try {
        const mockSandbox = {
          mediator: { registerMessageHandler: jest.fn(), sendMessage: jest.fn() },
          registerHandler: jest.fn(),
        };
        const handler = new MultiShimHandler(mockSandbox);

        handler.setNow(5000);

        const clocks = Object.values(handler.shims).map(shim => shim.__now().getTime());
        expect(clocks).toEqual(clocks.map(() => 5000));
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('getProgress', () => {
    it('should report the progress the restored state gives', () => {
      class ScoredShim extends SandboxShim {
        static shimName = 'scoredShim';
        getProgress() {
          return this.data.score ?? null;
        }
      }
      class ScoredHandler extends SandboxHandler {
        static shims = [TestShim, ScoredShim];
        async init() {}
      }
      const handler = new ScoredHandler({ mediator: createMediator(window) });

      expect(handler.getProgress()).toBeNull();

      handler.setData({ scoredShim: { score: 0.5 } });

      expect(handler.getProgress()).toBe(0.5);

      handler.setData({ scoredShim: { score: 0 } });

      expect(handler.getProgress()).toBe(0);
    });
  });

  describe('_initializeShims', () => {
    // Shims must install unconditionally and resolve backing state at access
    // time. One that returns early leaves content silently unshimmed, and the
    // failure only surfaces later as the content misbehaving.
    it('installs every base shim given no backing data', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), sendMessage: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new BaseShimsHandler(mockSandbox);
      const contentWindow = { document: {} };

      handler._initializeShims(contentWindow);

      // Every shim installs itself under its own shimName, on the window or
      // (for cookie) the document.
      const missing = Object.keys(handler.shims).filter(
        shimName => !(shimName in contentWindow) && !(shimName in contentWindow.document),
      );
      expect(missing).toEqual([]);
    });

    class NamespacedShim extends SandboxShim {
      static shimName = 'namespacedShim';
      initialize(contentWindow, { contentNamespace }) {
        contentWindow.namespacedShim = { contentNamespace };
      }
    }

    class NamespacedHandler extends SandboxHandler {
      static shims = [NamespacedShim];
      async init() {}
    }

    class FailingShim extends SandboxShim {
      static shimName = 'failingShim';
      initialize() {
        throw new Error('nope');
      }
    }

    it("hands the sandbox's content namespace to every shim", () => {
      const handler = new NamespacedHandler({
        mediator: createMediator(window),
        contentNamespace: 'abc123',
      });
      const originalIndexedDB = { open: jest.fn() };
      const contentWindow = { document: {}, indexedDB: originalIndexedDB };

      handler._initializeShims(contentWindow);
      contentWindow.indexedDB.open('mydb', 1);

      expect(originalIndexedDB.open).toHaveBeenCalledWith('abc123-mydb', 1);
      expect(contentWindow.namespacedShim).toEqual({ contentNamespace: 'abc123' });
    });

    it('attempts every shim and then reports the ones that failed', () => {
      jest.spyOn(console, 'error').mockImplementation();
      class FailingHandler extends SandboxHandler {
        static shims = [FailingShim, NamespacedShim];
        async init() {}
      }
      const handler = new FailingHandler({ mediator: createMediator(window) });
      const contentWindow = { document: {} };

      expect(() => handler._initializeShims(contentWindow)).toThrow('failingShim');
      expect(contentWindow).toHaveProperty('namespacedShim');
    });

    it('logs but does not raise when a base shim fails', () => {
      const error = jest.spyOn(console, 'error').mockImplementation();
      const handler = new NamespacedHandler({ mediator: createMediator(window) });
      const contentWindow = { document: {} };
      Object.defineProperty(contentWindow, 'indexedDB', {
        get() {
          throw new Error('blocked');
        },
      });

      expect(() => handler._initializeShims(contentWindow)).not.toThrow();
      expect(contentWindow).toHaveProperty('namespacedShim');
      expect(error).toHaveBeenCalledWith('Failed to initialize shim indexedDB:', expect.any(Error));
    });
  });
});
