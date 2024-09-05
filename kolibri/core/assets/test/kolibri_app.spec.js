import KolibriApp from '../src/kolibri_app';
import coreModule from '../src/state/modules/core';

jest.mock('vuex-router-sync', () => ({
  sync() {},
}));

jest.mock(
  'kolibri',
  () => {
    return {
      registerKolibriModuleSync: jest.fn(),
    };
  },
  { virtual: true },
);

jest.mock('kolibri.heartbeat', () => ({
  startPolling() {
    return Promise.resolve();
  },
}));

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
  it('it should register the plugin vuex components', async function () {
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
});
