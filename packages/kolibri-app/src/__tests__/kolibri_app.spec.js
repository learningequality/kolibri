import heartbeat from 'kolibri/heartbeat';
import KolibriApp from '../index';
import coreModule from '../../../../kolibri/core/frontend/state/modules/core';

jest.mock(
  'kolibri',
  () => {
    return {
      registerKolibriModuleSync: jest.fn(),
    };
  },
  { virtual: true },
);

jest.mock('kolibri/heartbeat', () => ({
  startPolling() {
    return Promise.resolve();
  },
  pollSessionEndPoint: jest.fn(),
}));

jest.mock('kolibri/router', () => {
  const VueRouter = jest.requireActual('vue-router');
  return {
    _vueRouter: null,
    initRouter() {
      if (!this._vueRouter) {
        this._vueRouter = new VueRouter();
      }
    },
    initRoutes() {
      this.initRouter();
      return this._vueRouter;
    },
  };
});

class TestApp extends KolibriApp {
  get pluginModule() {
    return {
      state() {
        return {
          count: 0,
        };
      },
      getters: {
        countGetter(state) {
          return state.count;
        },
      },
      actions: {
        incrementTwice(store) {
          store.commit('increment');
          store.commit('increment');
        },
      },
      mutations: {
        increment(state) {
          return (state.count = state.count + 1);
        },
      },
    };
  }
}

describe('KolibriApp', function () {
  // Track pageshow handlers registered by ready() so each test can remove them
  // afterwards — preventing accumulated listeners from firing in subsequent tests.
  const pagesShowHandlers = [];
  const _origAddEventListener = window.addEventListener.bind(window);

  beforeAll(() => {
    window.addEventListener = (type, handler, ...rest) => {
      if (type === 'pageshow') pagesShowHandlers.push(handler);
      _origAddEventListener(type, handler, ...rest);
    };
  });

  afterEach(() => {
    pagesShowHandlers.forEach(h => window.removeEventListener('pageshow', h));
    pagesShowHandlers.length = 0;
  });

  afterAll(() => {
    window.addEventListener = _origAddEventListener;
  });

  it('should register the plugin vuex components', async function () {
    const app = new TestApp();
    app.store.registerModule('core', coreModule);
    app.store.hotUpdate({
      modules: {
        core: {
          actions: {
            getCurrentSession: jest.fn().mockResolvedValue(),
          },
        },
      },
    });
    await app.ready();
    app.store.dispatch('incrementTwice');
    expect(app.store.getters.countGetter).toEqual(2);
  });

  it('boots when pluginModule provides no state (Vuex is optional)', async function () {
    // The default pluginModule getter returns {} with no state() — an app that
    // does not use Vuex should still boot without error.
    await expect(new KolibriApp().ready()).resolves.toBeUndefined();
  });

  describe('pageshow session refresh', () => {
    let getEntriesByTypeMock;
    let originalGetEntriesByType;

    function firePageshow(persisted) {
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted }));
    }

    beforeEach(async () => {
      heartbeat.pollSessionEndPoint.mockClear();
      // jsdom does not implement performance.getEntriesByType; assign a stub directly
      // since jest.spyOn requires the property to already exist on the object.
      originalGetEntriesByType = performance.getEntriesByType;
      getEntriesByTypeMock = jest.fn().mockReturnValue([]);
      performance.getEntriesByType = getEntriesByTypeMock;
      // A bare TestApp.ready() is sufficient — no need to pre-register the core
      // Vuex module, which would trigger a duplicate-registration warning on the
      // singleton store shared across tests.
      await new TestApp().ready();
    });

    afterEach(() => {
      performance.getEntriesByType = originalGetEntriesByType;
    });

    it('calls pollSessionEndPoint when the page is restored from bfcache', () => {
      firePageshow(true);
      expect(heartbeat.pollSessionEndPoint).toHaveBeenCalledTimes(1);
    });

    it('calls pollSessionEndPoint on back_forward navigation', () => {
      getEntriesByTypeMock.mockReturnValueOnce([{ type: 'back_forward' }]);
      firePageshow(false);
      expect(heartbeat.pollSessionEndPoint).toHaveBeenCalledTimes(1);
    });

    it('does not call pollSessionEndPoint on normal navigation', () => {
      getEntriesByTypeMock.mockReturnValueOnce([{ type: 'navigate' }]);
      firePageshow(false);
      expect(heartbeat.pollSessionEndPoint).not.toHaveBeenCalled();
    });
  });
});
