import heartbeat from 'kolibri/heartbeat';
import KolibriApp from '../index';

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

  it('mounts without a store when RootVue supplies none', async function () {
    const app = new KolibriApp();
    await app.ready();
    expect(app.rootvue.$store).toBeUndefined();
  });

  it('passes a store supplied through RootVue to the root Vue instance', async function () {
    // A sentinel object rather than a real Vuex.Store — the `vuexInit` mixin that the
    // shared Jest setup installs assigns `options.store` to `$store` verbatim.
    const store = { state: {} };
    class StoreApp extends KolibriApp {
      get RootVue() {
        return { render: h => h('div'), store };
      }
    }
    const app = new StoreApp();
    await app.ready();
    expect(app.rootvue.$store).toBe(store);
  });

  // Asserted against startRootVue() rather than ready(), because apps that override
  // ready() — the setup wizard — mount by calling startRootVue() directly.
  it('waits for the DOM to be ready before mounting', async function () {
    const readyState = jest.spyOn(document, 'readyState', 'get');
    readyState.mockReturnValue('loading');

    const app = new KolibriApp();
    const mounted = app.startRootVue();
    await global.flushPromises();
    expect(app.rootvue).toBeUndefined();

    readyState.mockReturnValue('complete');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await mounted;
    expect(app.rootvue).toBeDefined();

    readyState.mockRestore();
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
      await new KolibriApp().ready();
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
