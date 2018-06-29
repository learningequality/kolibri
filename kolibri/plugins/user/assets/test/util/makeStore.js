import Vuex from 'vuex';
import initialState from '../../src/state/initialState';
import mutations from '../../src/state/mutations';

export default function makeStore() {
  return new Vuex.Store({
    state: {
      core: {
        connection: {
          connected: true,
        },
        facilities: [],
        facilityConfig: {},
        session: {
          kind: [],
        },
      },
      ...initialState,
    },
    mutations: {
      ...mutations,
    },
  });
}
