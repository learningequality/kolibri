import Sandbox from '../src/mainClient';
import { events, nameSpace } from '../src/base';

// The client only hears its own iframe, and jsdom's postMessage leaves source null.
function fromIframe(data) {
  window.dispatchEvent(new MessageEvent('message', { data, source: window }));
}

function shimStateFromIframe(data) {
  fromIframe({ nameSpace, event: events.SHIMSTATEUPDATE, data });
}

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
    it('should store contentState', () => {
      const data = { myShim: { key: 'value' } };
      const userData = {};
      sandbox.initialize(data, userData);
      expect(sandbox.data).toEqual({ myShim: { key: 'value' } });
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
        fromIframe({ nameSpace, event: events.IFRAMEREADY, data: true });
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
    it('should send the current state and user data when iframe ready fires again', () => {
      const data = {};
      const userData = {};
      const updatedUserData = { userId: 'test' };
      sandbox.mediator.sendMessage = jest.fn();
      sandbox.initialize(data, userData, 'http://start.url', 'testns');
      return new Promise(resolve => {
        shimStateFromIframe({ shim: 'localStorage', state: { test: 'this' } });
        sandbox.updateData({ userData: updatedUserData });
        sandbox.on(events.IFRAMEREADY, () => {
          resolve();
        });
        fromIframe({ nameSpace, event: events.IFRAMEREADY, data: true });
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
    it('should send new user data to the sandbox', () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      sandbox.mediator.sendMessage = jest.fn();

      sandbox.updateData({ userData: { userId: 'newUser' } });

      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.USERDATAUPDATE,
        data: { userId: 'newUser' },
      });
    });
    it('should resend the latest user data, and no state, once the handler registers', async () => {
      // MAINREADY has already carried its snapshot by then, so an update in the
      // window between the two is only ever sent here.
      sandbox.initialize({ shimOne: { saved: true } }, {}, 'http://test.com', 'testns');
      sandbox.updateData({ userData: { userId: 'newUser' } });
      sandbox.mediator.sendMessage = jest.fn();

      fromIframe({ nameSpace, event: events.HANDLER_REGISTRATION, data: { progress: null } });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.mediator.sendMessage).toHaveBeenCalledWith({
        nameSpace,
        event: events.USERDATAUPDATE,
        data: { userId: 'newUser' },
      });
      expect(sandbox.mediator.sendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ event: events.STATEUPDATE }),
      );
    });
  });
  describe('data getter', () => {
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
    it('should relay a shim state update once however often the handler registers', async () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      const onStateUpdate = jest.fn();
      sandbox.onStateUpdate(onStateUpdate);

      for (let i = 0; i < 2; i++) {
        fromIframe({ nameSpace, event: events.HANDLER_REGISTRATION, data: { progress: null } });
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      shimStateFromIframe({ shim: 'myShim', state: { key: 'value' } });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(onStateUpdate).toHaveBeenCalledTimes(1);
    });

    it('should keep the saved contentState once the handler registers', () => {
      const existingState = {
        myShim: { savedKey: 'savedValue' },
      };

      return new Promise(resolve => {
        sandbox.mediator.sendMessage = jest.fn();
        sandbox.initialize(existingState, {}, 'http://test.com', 'testns');

        sandbox.on(events.HANDLER_REGISTRATION, () => {
          resolve();
        });

        fromIframe({
          nameSpace,
          event: events.HANDLER_REGISTRATION,
          data: { progress: null },
        });
      }).then(() => {
        expect(sandbox.data.myShim).toEqual({ savedKey: 'savedValue' });
      });
    });
  });

  describe('progress from registration', () => {
    it('should report the progress restored with the handler registration', async () => {
      // Before the content first reports, this is the only progress main has.
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      fromIframe({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { progress: 0.5 },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.getProgress()).toBe(0.5);
    });

    it('should leave progress unknown when the registration restores none', async () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      fromIframe({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { progress: null },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.getProgress()).toBeNull();
    });

    it('should ignore a restored progress that is not a finite number', async () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      fromIframe({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { progress: NaN },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.getProgress()).toBeNull();
    });

    it('should keep the progress already reported when a registration restores none', async () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');
      fromIframe({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { progress: null },
      });
      await new Promise(resolve => setTimeout(resolve, 0));
      shimStateFromIframe({ shim: 'SCORM', state: {}, progress: 0.4 });
      await new Promise(resolve => setTimeout(resolve, 0));

      fromIframe({
        nameSpace,
        event: events.HANDLER_REGISTRATION,
        data: { progress: null },
      });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.getProgress()).toBe(0.4);
    });
  });

  describe('state updates from shims', () => {
    beforeEach(() => {
      sandbox.initialize({ savedShim: { saved: true } }, {}, 'http://test.com', 'testns');
    });

    it('should record each shim state under its name and notify state update listeners', () => {
      const onStateUpdate = jest.fn();
      sandbox.onStateUpdate(onStateUpdate);

      shimStateFromIframe({ shim: 'myShim', state: { key: 'value' } });

      const expected = { savedShim: { saved: true }, myShim: { key: 'value' } };
      expect(sandbox.data).toEqual(expected);
      expect(onStateUpdate).toHaveBeenCalledWith(expected);
    });

    it('should report the progress a state update carries', () => {
      expect(sandbox.getProgress()).toBeNull();

      shimStateFromIframe({ shim: 'progressShim', state: { someData: true }, progress: 0.65 });

      expect(sandbox.getProgress()).toBe(0.65);
    });

    it('should store state data separately from progress', () => {
      shimStateFromIframe({ shim: 'progressShim', state: { myKey: 'myValue' }, progress: 0.5 });

      expect(sandbox.data.progressShim).toEqual({ myKey: 'myValue' });
    });

    it('should handle a state update without progress', () => {
      shimStateFromIframe({ shim: 'noProgressShim', state: { rawData: 'value' } });

      expect(sandbox.getProgress()).toBeNull();
      expect(sandbox.data.noProgressShim).toEqual({ rawData: 'value' });
    });
  });

  describe('with another client on the same window', () => {
    it('should not hand its state updates to the other client', async () => {
      // A custom channel and the content overlay opened from it each hold a client.
      const otherIframe = document.createElement('iframe');
      document.body.appendChild(otherIframe);
      const other = new Sandbox({ iframe: otherIframe, now: () => 1234 });
      try {
        other.initialize({}, {}, 'http://other.com', 'otherns');
        const otherStateUpdate = jest.fn();
        other.onStateUpdate(otherStateUpdate);
        const ownStateUpdate = jest.fn();
        sandbox.onStateUpdate(ownStateUpdate);
        sandbox.initialize({}, {}, 'http://test.com', 'testns');

        shimStateFromIframe({ shim: 'myShim', state: { key: 'value' } });
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(ownStateUpdate).toHaveBeenCalledWith({ myShim: { key: 'value' } });
        expect(otherStateUpdate).not.toHaveBeenCalled();
        expect(other.data).toEqual({});
      } finally {
        other.destroy();
        otherIframe.remove();
      }
    });
  });

  describe('destroy method', () => {
    it('should stop handling messages so the client can be collected', async () => {
      sandbox.initialize({}, {}, 'http://test.com', 'testns');

      sandbox.destroy();

      shimStateFromIframe({ shim: 'progressShim', state: {}, progress: 0.9 });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(sandbox.getProgress()).toBeNull();
    });
  });
});
