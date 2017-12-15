import Vuex from 'vuex';
import initialState from '../../src/state/initialState';

export default function makeStore() {
  return new Vuex.Store({
    state: {
      core: {
        connection: {
          connected: true,
        },
        facilityConfig: {},
        session: {
          kind: [],
          facilities: [],
        },
      },
      ...initialState,
    },
  });
}
