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


describe.only('Vuex store for core module', () => {
  it('handleError action works', () => {
    const store = createStore();
    coreActions.handleError(store, 'catastrophic failure');
    assert.equal(store.state.core.error, 'catastrophic failure');
    assert.equal(store.state.core.loading, false);
    assert.equal(store.state.core.title, 'Error');
  });

  it('handleApiError action works', () => {
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

      kolibri.resources = {
        SessionResource: {
          createModel: () => ({
            save: () => Promise.resolve({
              // just sending subset of sessionPayload
              id: '123',
              username: 'e_fermi',
              kind: ['cool-guy-user'], // will fall into normal user branch
            })
          })
        }
      };
      const store = createStore();
      const promise = coreActions.kolibriLogin(store, {}); // sessionPromise is mocked
      promise.then(() => {
        assert.equal(store.state.core.session.id, '123');
        assert.equal(store.state.core.session.username, 'e_fermi');
        assert.equal(store.state.core.session.kind, ['cool-guy-user']);
        delete kolibri.resources;
        done();
      });
    });
  });
});
