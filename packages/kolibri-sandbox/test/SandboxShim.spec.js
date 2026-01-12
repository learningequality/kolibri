import { SandboxShim } from '../src/SandboxShim';
import Mediator from '../src/mediator';
import { events } from '../src/base';

class TestShim extends SandboxShim {
  static shimName = 'testShim';
}

describe('SandboxShim', () => {
  describe('constructor', () => {
    it('should set nameSpace from static shimName', () => {
      const mockMediator = {
        registerMessageHandler: jest.fn(),
      };
      const shim = new TestShim(mockMediator);

      expect(shim.nameSpace).toBe('testShim');
    });

    it('should throw if shimName is not defined', () => {
      class NoNameShim extends SandboxShim {}

      const mockMediator = { registerMessageHandler: jest.fn() };

      expect(() => new NoNameShim(mockMediator)).toThrow('must define static shimName');
    });
  });

  describe('on', () => {
    it('should accept an event the subclass declares', () => {
      const mediator = new Mediator(window);
      const callback = jest.fn();

      class OwnEventShim extends SandboxShim {
        static shimName = 'ownEventShim';
        static events = { OWNEVENT: 'ownevent' };
      }

      const shim = new OwnEventShim(mediator);
      shim.on(shim.events.OWNEVENT, callback);
      mediator.handleMessage({
        data: { nameSpace: 'ownEventShim', event: 'ownevent', data: 3 },
      });

      expect(callback).toHaveBeenCalledWith(3);
    });

    it('should reject an event no one declares', () => {
      const shim = new TestShim({ registerMessageHandler: jest.fn() });

      expect(() => shim.on('ownevent', jest.fn())).toThrow(ReferenceError);
    });
  });

  describe('getProgress', () => {
    it('should return null by default', () => {
      const mockMediator = { registerMessageHandler: jest.fn() };
      const shim = new TestShim(mockMediator);

      expect(shim.getProgress()).toBeNull();
    });

    it('should return value when overridden', () => {
      class ProgressShim extends SandboxShim {
        static shimName = 'progressShim';
        getProgress() {
          return 0.5;
        }
      }

      const mockMediator = { registerMessageHandler: jest.fn() };
      const shim = new ProgressShim(mockMediator);

      expect(shim.getProgress()).toBe(0.5);
    });
  });

  describe('setData', () => {
    it('should restore state without the subclass wiring anything up', () => {
      const sendMessage = jest.fn();
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage };

      const shim = new TestShim(mockMediator);
      shim.setData({ key: 'value' });

      expect(shim.data).toEqual({ key: 'value' });
      expect(sendMessage).toHaveBeenCalledWith({
        nameSpace: 'testShim',
        event: events.STATEUPDATE,
        data: { state: { key: 'value' } },
      });
    });

    it('should store state pushed from main', () => {
      const mediator = new Mediator(window);
      const shim = new TestShim(mediator);

      mediator.handleMessage({
        data: { nameSpace: 'testShim', event: events.STATEUPDATE, data: { key: 'value' } },
      });

      expect(shim.data).toEqual({ key: 'value' });
    });

    it('should honour a subclass that computes its state', () => {
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage: jest.fn() };

      class TransformingShim extends SandboxShim {
        static shimName = 'transformingShim';
        get data() {
          return this.__data;
        }
        set data(data) {
          this.__data = { ...data, restored: true };
        }
      }

      const shim = new TransformingShim(mockMediator);
      shim.setData({ key: 'value' });

      expect(shim.data).toEqual({ key: 'value', restored: true });
    });
  });

  describe('setUserData', () => {
    it('should store user data without the subclass wiring anything up', () => {
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage: jest.fn() };
      const shim = new TestShim(mockMediator);

      shim.setUserData({ userId: 'testuser' });

      expect(shim.userData).toEqual({ userId: 'testuser' });
    });

    it('should not declare itself a user data consumer by default', () => {
      // Main sends USERDATAUPDATE only to the shims that declare an interest, so
      // storing user data and asking for it are deliberately separate.
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage: jest.fn() };

      class UserDataShim extends SandboxShim {
        static shimName = 'userDataShim';
        static consumesUserData = true;
      }

      expect(new TestShim(mockMediator).consumesUserData).toBe(false);
      expect(new UserDataShim(mockMediator).consumesUserData).toBe(true);
    });
  });

  describe('destroy', () => {
    it('should stop taking state pushed from main', () => {
      const mediator = new Mediator(window);
      const shim = new TestShim(mediator);

      shim.destroy();
      mediator.handleMessage({
        data: { nameSpace: 'testShim', event: events.STATEUPDATE, data: { key: 'value' } },
      });

      expect(shim.data).toEqual({});
    });

    it('should drop the subscriptions a subclass added through on', () => {
      // Subclasses subscribe to their own events too, so tracking them in on() is
      // the only teardown that covers a shim we do not know about.
      const mediator = new Mediator(window);
      const callback = jest.fn();

      class SubscribingShim extends SandboxShim {
        static shimName = 'subscribingShim';
        static events = { OWNEVENT: 'ownevent' };
        constructor(mediator) {
          super(mediator);
          this.on(this.events.OWNEVENT, callback);
        }
      }

      const shim = new SubscribingShim(mediator);
      shim.destroy();
      mediator.handleMessage({
        data: { nameSpace: 'subscribingShim', event: 'ownevent', data: 3 },
      });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('stateUpdated', () => {
    it('should send state wrapped in { state } object', () => {
      const sendMessage = jest.fn();
      const mockMediator = {
        registerMessageHandler: jest.fn(),
        sendMessage,
      };

      class DataShim extends SandboxShim {
        static shimName = 'dataShim';
        constructor(mediator) {
          super(mediator);
          this.data = { key: 'value' };
        }
      }

      const shim = new DataShim(mockMediator);
      shim.stateUpdated();

      expect(sendMessage).toHaveBeenCalledWith({
        nameSpace: 'dataShim',
        event: events.STATEUPDATE,
        data: { state: { key: 'value' } },
      });
    });

    it('should include progress when getProgress returns non-null', () => {
      const sendMessage = jest.fn();
      const mockMediator = {
        registerMessageHandler: jest.fn(),
        sendMessage,
      };

      class ProgressShim extends SandboxShim {
        static shimName = 'progressShim';
        constructor(mediator) {
          super(mediator);
          this.data = { foo: 'bar' };
        }
        getProgress() {
          return 0.75;
        }
      }

      const shim = new ProgressShim(mockMediator);
      shim.stateUpdated();

      expect(sendMessage).toHaveBeenCalledWith({
        nameSpace: 'progressShim',
        event: events.STATEUPDATE,
        data: { state: { foo: 'bar' }, progress: 0.75 },
      });
    });
  });
});
