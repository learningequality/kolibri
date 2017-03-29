/* eslint-env mocha */
const Vue = require('vue');
const Vuex = require('vuex');
const assert = require('assert');
const _ = require('lodash');
const s = require('../../src/state/store');
const getters = require('../../src/state/getters');
const coreActions = require('../../src/state/actions');
const kolibri = require('kolibri');
const sinon = require('sinon');

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
    let store;
    const oldHandler = window.onbeforeunload;

    before(() => {
      // this prevents kolibriLogin from refreshing page
      window.onbeforeunload = () => true;
    });

    after(() => {
      window.onbeforeunload = oldHandler;
      delete kolibri.resources;
    });

    beforeEach(() => {
      store = createStore();
      kolibri.resources = {};
    });

    it('successful login', (done) => {
      kolibri.resources.SessionResource = {
        createModel: () => ({
          save: () => Promise.resolve({
            // just sending subset of sessionPayload
            id: '123',
            username: 'e_fermi',
            kind: ['cool-guy-user'],
          }),
        }),
      };

      function runAssertions() {
        const { session } = store.state.core;
        assert.equal(session.id, '123');
        assert.equal(session.username, 'e_fermi');
        assert.deepEqual(session.kind, ['cool-guy-user']);
      }

      coreActions.kolibriLogin(store, {})
        .then(runAssertions)
        .then(done, done);
    });

    it('failed login (401)', (done) => {
      kolibri.resources.SessionResource = {
        createModel: () => ({
          save: () => Promise.reject({ status: { code: 401 } }),
        }),
      };

      coreActions.kolibriLogin(store, {})
        .then(() => {
          assert.equal(store.state.core.loginError, 401);
        })
        .then(done, done);
    });

    it('successful logout', (done) => {
      const clearCachesSpy = sinon.spy();
      const getModelStub = sinon.stub().returns({
        delete: () => Promise.resolve('goodbye'),
      });
      kolibri.resources = {
        SessionResource: {
          getModel: getModelStub,
        },
        clearCaches: clearCachesSpy,
      };
      // fake a session
      store.state.core.session.id = '123';
      store.state.core.session.username = 'l_organa';

      coreActions.kolibriLogout(store)
        .then(() => {
          assert.equal(store.state.core.session.id, undefined);
          assert.equal(store.state.core.session.username, '');
          sinon.assert.calledWith(getModelStub, 'current');
          sinon.assert.calledOnce(clearCachesSpy);
        })
        .then(done, done);
    });
  });
});
