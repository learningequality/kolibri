import { SandboxHandler } from '../src/SandboxHandler';
import { SandboxShim } from '../src/SandboxShim';
import { events } from '../src/base';

class TestShim extends SandboxShim {
  static shimName = 'testShim';
}

class AnotherShim extends SandboxShim {
  static shimName = 'anotherShim';
}

class UserDataShim extends SandboxShim {
  static shimName = 'userDataShim';

  static consumesUserData = true;
}

class TestHandler extends SandboxHandler {
  static shims = [TestShim];
  async init() {}
}

class MultiShimHandler extends SandboxHandler {
  static shims = [TestShim, AnotherShim];
  async init() {}
}

class UserDataHandler extends SandboxHandler {
  static shims = [TestShim, UserDataShim];
  async init() {}
}

class BaseShimsHandler extends SandboxHandler {
  async init() {}
}

describe('SandboxHandler', () => {
  describe('setNow', () => {
    it('should propagate the clock to every shim', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), sendMessage: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new MultiShimHandler(mockSandbox);
      const spies = Object.values(handler.shims).map(shim => jest.spyOn(shim, 'setNow'));

      handler.setNow(5000);

      expect(spies.length).toBeGreaterThan(0);
      for (const spy of spies) {
        expect(spy).toHaveBeenCalledWith(5000);
      }
    });
  });

  describe('getRegistration', () => {
    it('should return an object with a shims array', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new TestHandler(mockSandbox);
      const registration = handler.getRegistration();

      expect(registration).toHaveProperty('shims');
      expect(Array.isArray(registration.shims)).toBe(true);
    });

    it('should include shimName in the array', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new TestHandler(mockSandbox);
      const registration = handler.getRegistration();

      expect(registration.shims).toContain('testShim');
    });

    it('should include all shims when handler has multiple shims', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new MultiShimHandler(mockSandbox);
      const registration = handler.getRegistration();

      // Should include 5 base shims plus 2 custom shims
      expect(registration.shims).toHaveLength(7);
      // Base shims
      expect(registration.shims).toContain('localStorage');
      expect(registration.shims).toContain('sessionStorage');
      expect(registration.shims).toContain('cookie');
      expect(registration.shims).toContain('kolibri');
      expect(registration.shims).toContain('indexedDB');
      // Custom shims
      expect(registration.shims).toContain('testShim');
      expect(registration.shims).toContain('anotherShim');
    });

    it('should list only the shims that consume user data', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new UserDataHandler(mockSandbox);
      const registration = handler.getRegistration();

      expect(registration.userDataShims).toEqual(['userDataShim']);
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

    it('hands the initialization options to every shim', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), sendMessage: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new MultiShimHandler(mockSandbox);
      const spies = Object.values(handler.shims).map(shim => jest.spyOn(shim, 'iframeInitialize'));
      const contentWindow = { document: {} };

      handler._initializeShims(contentWindow, { contentNamespace: 'abc123' });

      for (const spy of spies) {
        expect(spy).toHaveBeenCalledWith(contentWindow, { contentNamespace: 'abc123' });
      }
    });
  });

  describe('_destroyShims', () => {
    it('should destroy every shim', () => {
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), removeMessageHandler: jest.fn() },
        registerHandler: jest.fn(),
      };
      const handler = new MultiShimHandler(mockSandbox);
      const spies = Object.values(handler.shims).map(shim => jest.spyOn(shim, 'destroy'));

      handler._destroyShims();

      expect(spies.length).toBeGreaterThan(0);
      for (const spy of spies) {
        expect(spy).toHaveBeenCalled();
      }
    });
  });

  describe('progress in state updates', () => {
    it('should include progress field in STATEUPDATE when getProgress returns non-null', () => {
      const sendMessage = jest.fn();
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), sendMessage },
        registerHandler: jest.fn(),
      };

      class ProgressShim extends SandboxShim {
        static shimName = 'progressShim';
        constructor(mediator) {
          super(mediator);
          this.data = { someKey: 'someValue' };
        }
        getProgress() {
          return 0.75;
        }
      }

      class ProgressHandler extends SandboxHandler {
        static shims = [ProgressShim];
        async init() {}
      }

      const handler = new ProgressHandler(mockSandbox);
      sendMessage.mockClear();

      // Trigger state update
      handler.shims.progressShim.stateUpdated();

      // Find the STATEUPDATE call for this shim
      const stateUpdateCall = sendMessage.mock.calls.find(
        c => c[0].nameSpace === 'progressShim' && c[0].event === events.STATEUPDATE,
      );

      expect(stateUpdateCall).toBeDefined();
      expect(stateUpdateCall[0].data).toHaveProperty('progress', 0.75);
      expect(stateUpdateCall[0].data).toHaveProperty('state', { someKey: 'someValue' });
    });

    it('should NOT include progress field when getProgress returns null', () => {
      const sendMessage = jest.fn();
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), sendMessage },
        registerHandler: jest.fn(),
      };

      class NoProgressShim extends SandboxShim {
        static shimName = 'noProgressShim';
        constructor(mediator) {
          super(mediator);
          this.data = { key: 'value' };
        }
        // getProgress() returns null by default from SandboxShim
      }

      class NoProgressHandler extends SandboxHandler {
        static shims = [NoProgressShim];
        async init() {}
      }

      const handler = new NoProgressHandler(mockSandbox);
      sendMessage.mockClear();

      handler.shims.noProgressShim.stateUpdated();

      const stateUpdateCall = sendMessage.mock.calls.find(
        c => c[0].nameSpace === 'noProgressShim' && c[0].event === events.STATEUPDATE,
      );

      expect(stateUpdateCall).toBeDefined();
      expect(stateUpdateCall[0].data).not.toHaveProperty('progress');
      // Should have state wrapped
      expect(stateUpdateCall[0].data).toEqual({ state: { key: 'value' } });
    });

    it('should use recalculated progress value when shim progress changes', () => {
      const sendMessage = jest.fn();
      const mockSandbox = {
        mediator: { registerMessageHandler: jest.fn(), sendMessage },
        registerHandler: jest.fn(),
      };

      let progressValue = 0.25;

      class ChangingShim extends SandboxShim {
        static shimName = 'changingShim';
        constructor(mediator) {
          super(mediator);
          this.data = {};
        }
        getProgress() {
          return progressValue;
        }
      }

      class ChangingHandler extends SandboxHandler {
        static shims = [ChangingShim];
        async init() {}
      }

      const handler = new ChangingHandler(mockSandbox);
      sendMessage.mockClear();

      // First update with 0.25
      handler.shims.changingShim.stateUpdated();
      let calls = sendMessage.mock.calls.filter(
        c => c[0].nameSpace === 'changingShim' && c[0].event === events.STATEUPDATE,
      );
      expect(calls[0][0].data.progress).toBe(0.25);

      // Change progress and update again
      progressValue = 0.9;
      handler.shims.changingShim.stateUpdated();
      calls = sendMessage.mock.calls.filter(
        c => c[0].nameSpace === 'changingShim' && c[0].event === events.STATEUPDATE,
      );
      expect(calls[1][0].data.progress).toBe(0.9);
    });
  });
});
