import Vuex from 'vuex';
import client from 'kolibri.client';
import pluginModule from '../pluginModule';

jest.mock('kolibri.client');
jest.mock('kolibri.urls');

// Since kolibriLogin is the only core action used, we just
// add this mock to the setup wizard module, instead of using
// coreStoreFactory with the full core module
pluginModule.actions.kolibriLogin = () => {};

function makeStore() {
  const store = new Vuex.Store({
    state: pluginModule.state(),
    actions: pluginModule.actions,
    getters: pluginModule.getters,
    mutations: pluginModule.mutations,
  });
  return store;
}

describe('Setup Wizard Vuex module', () => {
  beforeAll(() => {
    client.mockResolvedValue({ data: { facility: {} } });
  });

  it('sets the correct default facility name', async () => {
    const store = makeStore();
    store.commit('SET_FACILITY_PRESET', 'informal');
    store.commit('SET_SUPERUSER_CREDENTIALS', {
      full_name: 'Kolibri Admin',
    });
    await store.dispatch('provisionDevice');
    const payload = client.mock.calls[0][0];
    expect(payload.data.facility.name).toEqual('Home Facility for Kolibri Admin');
  });
});
