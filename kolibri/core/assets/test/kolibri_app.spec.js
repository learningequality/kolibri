import KolibriApp from '../src/kolibri_app';
import coreModule from '../src/state/modules/core';

jest.mock(
  'kolibri',
  () => {
    return {
      registerKolibriModuleSync: jest.fn(),
    };
  },
  { virtual: true }
);

jest.mock('kolibri.heartbeat', () => ({
  startPolling() {
    return Promise.resolve();
  },
}));

class TestApp extends KolibriApp {
  get pluginModule() {
    return {
      state: {
        count: 0,
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

describe('KolibriApp', function() {
  it('it should register the core vuex component', () => {
    const app = new TestApp();
    expect(app.store.state.core).toMatchObject(coreModule.state);
    // just checking on keys, since vuex transforms the actions
    expect(Object.keys(app.store._actions)).toEqual(Object.keys(coreModule.actions));
    // only checks intersection with core getters; doesn't include sub-modules
    expect(Object.keys(app.store.getters)).toEqual(
      expect.arrayContaining(Object.keys(coreModule.getters))
    );
  });

  it('it should register the plugin vuex components', async function() {
    const app = new TestApp();
    app.store.hotUpdate({
      modules: {
        core: {
          actions: {
            getCurrentSession: jest.fn().mockResolvedValue(),
            getNotifications: jest.fn().mockResolvedValue(),
          },
        },
      },
    });
    await app.ready();
    app.store.dispatch('incrementTwice');
    expect(app.store.getters.countGetter).toEqual(2);
  });
});
