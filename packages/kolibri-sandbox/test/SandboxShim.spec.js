import SandboxShim from '../src/SandboxShim';
import { events } from '../src/base';
import { createMediator, destroyMediators } from './__fixtures__/mediators';

class TestShim extends SandboxShim {
  static shimName = 'testShim';
}

describe('SandboxShim', () => {
  afterEach(destroyMediators);

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
      const mediator = createMediator(window);
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

  describe('request', () => {
    let remote;
    let shim;

    beforeEach(() => {
      remote = { postMessage: jest.fn() };
      shim = new TestShim(createMediator(remote));
    });

    afterEach(() => {
      shim.destroy();
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should send the request on the shim namespace and return the reply', async () => {
      remote.postMessage.mockImplementation((message, origin, [port]) => {
        port.postMessage({ result: 'answer' });
      });

      await expect(shim.request('lookup', { id: 'abc' })).resolves.toBe('answer');
      expect(remote.postMessage).toHaveBeenCalledWith(
        { nameSpace: 'testShim', event: 'lookup', data: { id: 'abc' } },
        '*',
        [expect.any(MessagePort)],
      );
    });

    it('should close the reply port and reject with 504 after 30 seconds', async () => {
      jest.useFakeTimers();
      const close = jest.spyOn(MessagePort.prototype, 'close');
      const reply = shim.request('lookup');
      const settled = jest.fn();
      reply.then(settled, settled);

      await jest.advanceTimersByTimeAsync(29999);
      expect(settled).not.toHaveBeenCalled();

      const [port] = remote.postMessage.mock.calls[0][2];
      await jest.advanceTimersByTimeAsync(1);
      port.postMessage({ result: 'late' });

      await expect(reply).rejects.toMatchObject({ status: 504 });
      expect(close).toHaveBeenCalledTimes(1);
    });

    it.each([
      { invalid: () => {} },
      {
        get invalid() {
          throw null;
        },
      },
    ])('should reject with 400 when the request cannot be cloned (%#)', async data => {
      const { port1, port2 } = new MessageChannel();
      remote.postMessage.mockImplementation((message, origin, ports) => {
        port1.postMessage(message, ports);
      });

      try {
        const reply = shim.request('lookup', data);
        await expect(reply).rejects.toBeInstanceOf(Error);
        await expect(reply).rejects.toMatchObject({ status: 400 });
      } finally {
        port1.close();
        port2.close();
      }
    });

    it('should reject every outstanding request with 503 without affecting settled requests', async () => {
      remote.postMessage.mockImplementationOnce((message, origin, [port]) => {
        port.postMessage({ result: 'answer' });
      });
      const completed = shim.request('lookup');
      await expect(completed).resolves.toBe('answer');

      const outstanding = [shim.request('lookup'), shim.request('lookup')];
      shim.destroy();

      await Promise.all(
        outstanding.map(reply => expect(reply).rejects.toMatchObject({ status: 503 })),
      );
      await expect(completed).resolves.toBe('answer');
    });
  });

  describe('getProgress', () => {
    it('should return null by default', () => {
      const mockMediator = { registerMessageHandler: jest.fn() };
      const shim = new TestShim(mockMediator);

      expect(shim.getProgress()).toBeNull();
    });
  });

  describe('setData', () => {
    it('should restore state without the subclass wiring anything up', () => {
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage: jest.fn() };

      const shim = new TestShim(mockMediator);
      shim.setData({ a: 1 });
      shim.setData({ b: 2 });

      expect(shim.data).toEqual({ b: 2 });
    });

    it('should not send the restored state back to main', () => {
      const sendMessage = jest.fn();
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage };

      const shim = new TestShim(mockMediator);
      shim.setData({ key: 'value' });

      expect(sendMessage).not.toHaveBeenCalled();
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
      shim.setData({ a: 1 });
      shim.setData({ b: 2 });

      expect(shim.data).toEqual({ b: 2, restored: true });
    });
  });

  describe('setUserData', () => {
    it('should store user data without the subclass wiring anything up', () => {
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage: jest.fn() };
      const shim = new TestShim(mockMediator);

      shim.setUserData({ userId: 'testuser' });

      expect(shim.userData).toEqual({ userId: 'testuser' });
    });
  });

  describe('stateUpdated', () => {
    it('should send its state to main under its shim name', () => {
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
        nameSpace: 'sandbox',
        event: events.SHIMSTATEUPDATE,
        data: { shim: 'dataShim', state: { key: 'value' } },
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
        nameSpace: 'sandbox',
        event: events.SHIMSTATEUPDATE,
        data: { shim: 'progressShim', state: { foo: 'bar' }, progress: 0.75 },
      });
    });

    it('should include progress when getProgress returns 0', () => {
      const sendMessage = jest.fn();
      const mockMediator = { registerMessageHandler: jest.fn(), sendMessage };

      class ZeroProgressShim extends SandboxShim {
        static shimName = 'zeroProgressShim';
        getProgress() {
          return 0;
        }
      }

      new ZeroProgressShim(mockMediator).stateUpdated();

      expect(sendMessage).toHaveBeenCalledWith({
        nameSpace: 'sandbox',
        event: events.SHIMSTATEUPDATE,
        data: { shim: 'zeroProgressShim', state: {}, progress: 0 },
      });
    });
  });
});
