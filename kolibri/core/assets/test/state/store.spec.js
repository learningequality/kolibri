/* eslint-env mocha */
const Vue = require('vue');
const Vuex = require('vuex');
const assert = require('assert');
const _ = require('lodash');
const s = require('../../src/state/store');
const getters = require('../../src/state/getters');
const coreActions = require('../../src/state/actions');
const kolibri = require('kolibri');

Vue.use(Vuex);

function createStore() {
  return new Vuex.Store({
    state: _.cloneDeep(s.initialState),
    mutations: s.mutations,
    getters,
    actions: coreActions,
  });
}

describe('Vuex store for core module', () => {
  it('handleError action updates core state', () => {
    const store = createStore();
    coreActions.handleError(store, 'catastrophic failure');
    assert.equal(store.state.core.error, 'catastrophic failure');
    assert.equal(store.state.core.loading, false);
    assert.equal(store.state.core.title, 'Error');
  });

  it('handleApiError action updates core state', () => {
    const store = createStore();
    const apiError = { message: 'Too Bad' };
    coreActions.handleApiError(store, apiError);
    assert(store.state.core.error.match(/Too Bad/));
    assert.equal(store.state.core.loading, false);
    assert.equal(store.state.core.title, 'Error');
  });

  describe('kolibriLogin', () => {
    // this prevents kolibriLogin from refreshing page
    const oldHandler = window.onbeforeunload;

    before(() => {
      window.onbeforeunload = () => true;
    });

    after(() => {
      window.onbeforeunload = oldHandler;
    });

    it('happy path', (done) => {
      // mock the SessionResource
      kolibri.resources = {
        SessionResource: {
          createModel: () => ({
            save: () => Promise.resolve({
              // just sending subset of sessionPayload
              id: '123',
              username: 'e_fermi',
              kind: ['cool-guy-user'],
            })
          })
        }
      };

      const store = createStore();

      function runAssertions() {
        const { session } = store.state.core;
        assert.equal(session.id, '123');
        assert.equal(session.username, 'e_fermi');
        assert.deepEqual(session.kind, ['cool-guy-user']);
      }

      function cleanup() {
        delete kolibri.resources;
      }

      coreActions.kolibriLogin(store, {})
        .then(runAssertions)
        .then(cleanup)
        .then(done, done);
    });
  });
});
