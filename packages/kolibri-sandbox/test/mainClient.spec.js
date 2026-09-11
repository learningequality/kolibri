import Sandbox from '../src/mainClient';
import { events, nameSpace } from '../src/base';

describe('Sandbox mainClient', () => {
  let sandbox;
  let iframe;
  beforeEach(() => {
    iframe = document.createElement('iframe');
    iframe.name = nameSpace;
    // contentWindow is undefined on jsdom simulation of an iframe
    // so we use a proxy here to expose the local window
    // object instead.
    const iframeProxy = new Proxy(iframe, {
      get(obj, prop) {
        if (prop === 'contentWindow') {
          return window;
        }
        return obj[prop];
      },
    });
    sandbox = new Sandbox({ iframe: iframeProxy, now: () => 1234 });
  });
  afterEach(() => {
    // Every client listens on the shared jsdom window, so a client left alive
    // keeps relaying later tests' messages.
    sandbox.destroy();
  });
  describe('constructor', () => {
    it('should throw when no now function is passed', () => {
      expect(() => new Sandbox({ iframe })).toThrow(TypeError);
    });
  });
  describe('initialize method', () => {
    it('should store contentState in _shimData', () => {
      const data = { myShim: { key: 'value' } };
      const userData = {};
      sandbox.initialize(data, userData);
      expect(sandbox._shimData).toEqual({ myShim: { key: 'value' } });
    });
    it('should store userData', () => {
      const data = {};
      const userData = { userId: 'test123' };
      sandbox.initialize(data, userData);
      expect(sandbox._userData).toEqual(userData);
    });
    it('should fire a ready check', () => {
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize();
      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READYCHECK,
        data: true,
      });
    });
    it('should send MAINREADY with data when iframe ready event is fired', () => {
      const contentState = { myShim: { key: 'value' } };
      const userData = { userId: 'test' };
      return new Promise(resolve => {
        sandbox.mediator.sendMessage = jest.fn();
        sandbox.initialize(contentState, userData, 'http://start.url', 'testns');
        sandbox.on(events.IFRAMEREADY, () => {
          resolve();
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
          nameSpace,
          event: events.MAINREADY,
          data: {
            contentNamespace: 'testns',
            startUrl: 'http://start.url',
            handlerUrl: null,
            contentState: { myShim: { key: 'value' } },
            userData: { userId: 'test' },
            now: 1234,
          },
        });
      });
    });
    it('should send updated data when iframe ready fires again after updateData', () => {
      const data = {};
      const userData = {};
      const updatedUserData = { userId: 'test' };
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize(data, userData, 'http://start.url', 'testns');
      return new Promise(resolve => {
        sandbox.updateData({
          contentState: { localStorage: { test: 'this' } },
          userData: updatedUserData,
        });
        sandbox.on(events.IFRAMEREADY, () => {
          resolve();
        });
        sandbox.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
          nameSpace,
          event: events.MAINREADY,
          data: expect.objectContaining({
            contentState: { localStorage: { test: 'this' } },
            userData: updatedUserData,
          }),
        });
      });
    });
    it('should not send MAINREADY while contentWindow is null', () => {
      // An iframe's contentWindow is transiently null mid-navigation; sending then
      // would throw, and the previous remote must not be clobbered.
      let contentWindow = window;
      const nullableIframe = new Proxy(document.createElement('iframe'), {
        get(obj, prop) {
          return prop === 'contentWindow' ? contentWindow : obj[prop];
        },
      });
      const client = new Sandbox({ iframe: nullableIframe, now: () => 1234 });
      client.mediator.sendMessage = jest.fn();
      client.initialize({}, {}, 'http://start.url', 'testns');
      contentWindow = null;

      return new Promise(resolve => {
        client.on(events.IFRAMEREADY, resolve);
        client.mediator.sendLocalMessage({ nameSpace, event: events.IFRAMEREADY, data: true });
      }).then(() => {
        expect(client.mediator.remote).toBe(window);
        expect(client.ready).toBe(false);
        expect(client.mediator.sendMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({ event: events.MAINREADY }),
        );
        client.destroy();
      });
    });
    it('should call mediator sendMessage with the readycheck event', () => {
      const data = {};
      const userData = {};
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize(data, userData);
      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.READYCHECK,
        data: true,
      });
    });
  });
  describe('updateData method', () => {
    it('should update userData when provided', () => {
      sandbox.initialize({}, {});
      sandbox.updateData({ userData: { userId: 'newUser' } });
      expect(sandbox._userData).toEqual({ userId: 'newUser' });
    });
    it('should update _shimData when contentState provided', () => {
      sandbox.initialize({}, {});
      sandbox.updateData({ contentState: { myShim: { key: 'value' } } });
      expect(sandbox._shimData.myShim).toEqual({ key: 'value' });
    });
    it('should merge new contentState with existing _shimData', () => {
      sandbox.initialize({ existingShim: { old: 'data' } }, {});
      sandbox.updateData({ contentState: { newShim: { new: 'data' } } });
      expect(sandbox._shimData).toEqual({
        existingShim: { old: 'data' },
        newShim: { new: 'data' },
      });
    });
    describe('once the handler has registered its shims', () => {
      beforeEach(async () => {
        sandbox.initialize({}, {}, 'http://test.com', 'testns');
        sandbox.mediator.sendLocalMessage({
          nameSpace,
          event: events.HANDLER_REGISTRATION,
          data: { shims: ['shimOne', 'shimTwo'], userDataShims: ['shimOne'] },
        });
        await new Promise(resolve => setTimeout(resolve, 0));
        sandbox.mediator.sendMessage = jest.fn();
      });
      it('should send new user data only to the shims that consume it', () => {
        // The shims are in the iframe, so a mid-session change only reaches them
        // by message.
        sandbox.updateData({ userData: { userId: 'newUser' } });

        expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
          nameSpace: 'shimOne',
          event: events.USERDATAUPDATE,
          data: { userId: 'newUser' },
        });
        expect(sandbox.mediator.sendMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({ nameSpace: 'shimTwo', event: events.USERDATAUPDATE }),
        );
      });
      it('should send new state only to the shims it was given for', () => {
        sandbox.updateData({ contentState: { shimOne: { key: 'value' } } });

        expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
          nameSpace: 'shimOne',
          event: events.STATEUPDATE,
          data: { key: 'value' },
        });
        expect(sandbox.mediator.sendMessage).not.toHaveBeenCalledWith(
          expect.objectContaining({ nameSpace: 'shimTwo', event: events.STATEUPDATE }),
        );
      });
    });
    it('should not send to shims before the handler has registered', () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      sandbox.mediator.sendMessage = jest.fn();

      sandbox.updateData({ userData: { userId: 'newUser' } });

      // MAINREADY carries the current user data, so there is nothing to catch up.
      expect(sandbox.mediator.sendMessage).not.toHaveBeenCalled();
    });
  });
  describe('data getter', () => {
    it('should return a copy of _shimData', () => {
      const contentState = {
        shimOne: { key: 'value1' },
        shimTwo: { key: 'value2' },
      };
      sandbox.initialize(contentState, {});
      expect(sandbox.data).toEqual(contentState);
    });
    it('should return a deep copy (not the same reference)', () => {
      sandbox.initialize({ myShim: { key: 'value' } }, {});
      const data1 = sandbox.data;
      const data2 = sandbox.data;
      expect(data1).not.toBe(data2);
      expect(data1.myShim).not.toBe(data2.myShim);
    });
  });
  describe('on method', () => {
    it('should throw a reference error if an invalid event is set', () => {
      expect(sandbox.on).toThrow(ReferenceError);
    });
    it('should call the mediator registerMessageHandler method', () => {
      sandbox.mediator.registerMessageHandler = jest.fn();
      const callback = jest.fn();
      sandbox.on(events.IFRAMEREADY, callback);
      expect(sandbox.mediator.registerMessageHandler).toHaveBeenCalledWith({
        nameSpace,
        event: events.IFRAMEREADY,
        callback,
      });
    });
  });
  describe('onStateUpdate method', () => {
    it('should call the on method with the STATEUPDATE event', () => {
      sandbox.on = jest.fn();
      const callback = jest.fn();
      sandbox.onStateUpdate(callback);
      expect(sandbox.on).toHaveBeenCalledWith(events.STATEUPDATE, callback);
    });
  });
  describe('registration handling', () => {
    it('should store registration when HANDLER_REGISTRATION event received', () => {
      return new Promise(resolve => {
        sandbox.mediator.sendMessage = jest.fn();
        sandbox.initialize({}, {}, 'http://test.com', 'testns');

        expect(sandbox.registration).toBeNull();

        const registration = {
          shims: ['testShim'],
        };

        sandbox.on(events.HANDLER_REGISTRATION, () => {
          resolve();
        });

        sandbox.mediator.sendLocalMessage({
          nameSpace,
          event: events.HANDLER_REGISTRATION,
          data: registration,
        });
      }).then(() => {
        expect(sandbox.registration).toEqual({ shims: ['testShim'] });
      });
    });

    it('should initialize _shimData with empty objects for each registered shim namespace', () => {
      return new Promise(resolve => {
        sandbox.mediator.sendMessage = jest.fn();
        sandbox.initialize({}, {}, 'http://test.com', 'testns');

        const registration = {
          shims: ['myShim', 'otherShim'],
        };

        sandbox.on(events.HANDLER_REGISTRATION, () => {
          resolve();
        });

        sandbox.mediator.sendLocalMessage({
          nameSpace,
          event: events.HANDLER_REGISTRATION,
          data: registration,
        });
      }).then(() => {
        expect(sandbox._shimData).toHaveProperty('myShim');
        expect(sandbox._shimData).toHaveProperty('otherShim');
      });
    });

    it('should not double-register a shim STATEUPDATE handler when registration repeats', async () => {
      // The iframe re-announces IFRAMEREADY during the handshake, so
      // HANDLER_REGISTRATION can arrive twice; the shim handler must not stack,
      // or one shim update would be relayed to the consumer twice.
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      const onStateUpdate = jest.fn();
      sandbox.onStateUpdate(onStateUpdate);

      for (let i = 0; i < 2; i++) {
        sandbox.mediator.sendLocalMessage({
          nameSpace,
          event: events.HANDLER_REGISTRATION,
          data: { shims: ['myShim'] },
        });
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      sandbox.mediator.sendLocalMessage({
        nameSpace: 'myShim',
        event: events.STATEUPDATE,
        data: { state: { key: 'value' } },
      });
      // Two hops: the shim message, then the relayed local STATEUPDATE.
      await new Promise(resolve => setTimeout(resolve, 0));
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onStateUpdate).toHaveBeenCalledTimes(1);
    });

    it('should populate _shimData with existing contentState data for matching namespaces', () => {
      const existingState = {
        myShim: { savedKey: 'savedValue' },
      };

      return new Promise(resolve => {
        sandbox.mediator.sendMessage = jest.fn();
        sandbox.initialize(existingState, {}, 'http://test.com', 'testns');

        const registration = {
          shims: ['myShim'],
        };

        sandbox.on(events.HANDLER_REGISTRATION, () => {
          resolve();
        });

        sandbox.mediator.sendLocalMessage({
          nameSpace,
          event: events.HANDLER_REGISTRATION,
          data: registration,
        });
      }).then(() => {
        expect(sandbox._shimData.myShim).toEqual({ savedKey: 'savedValue' });
      });
    });
  });

  describe('progress from state updates', () => {
    beforeEach(async () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      await new Promise(resolve => setTimeout(resolve, 0));
      sandbox.mediator.sendLocalMessage({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: {
          shims: ['progressShim', 'noProgressShim'],
        },
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should extract and store progress from STATEUPDATE when progress is present', async () => {
      expect(sandbox._iframeProgress).toBeNull();

      sandbox.mediator.sendLocalMessage({
        nameSpace: 'progressShim',
        event: events.STATEUPDATE,
        data: { state: { someData: true }, progress: 0.65 },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox._iframeProgress).toBe(0.65);
    });

    it('should store state data separately from progress', async () => {
      sandbox.mediator.sendLocalMessage({
        nameSpace: 'progressShim',
        event: events.STATEUPDATE,
        data: { state: { myKey: 'myValue' }, progress: 0.5 },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox._shimData.progressShim).toEqual({ myKey: 'myValue' });
    });

    it('should return stored iframe progress from getProgress()', async () => {
      sandbox.mediator.sendLocalMessage({
        nameSpace: 'progressShim',
        event: events.STATEUPDATE,
        data: { state: {}, progress: 0.8 },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.getProgress()).toBe(0.8);
    });

    it('should handle STATEUPDATE without progress field', async () => {
      sandbox.mediator.sendLocalMessage({
        nameSpace: 'noProgressShim',
        event: events.STATEUPDATE,
        data: { state: { rawData: 'value' } },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      // Progress should remain null
      expect(sandbox._iframeProgress).toBeNull();
      // Data should be stored from state property
      expect(sandbox._shimData.noProgressShim).toEqual({ rawData: 'value' });
    });
  });

  describe('destroy method', () => {
    it('should stop handling messages so the client can be collected', async () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      await new Promise(resolve => setTimeout(resolve, 0));
      sandbox.mediator.sendLocalMessage({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { shims: ['progressShim'] },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      sandbox.destroy();

      sandbox.mediator.sendLocalMessage({
        nameSpace: 'progressShim',
        event: events.STATEUPDATE,
        data: { state: {}, progress: 0.9 },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.getProgress()).toBeNull();
    });
  });
});
