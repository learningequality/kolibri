/* eslint-env mocha */
import Vue from 'vue';
import Vuex from 'vuex';
import assert from 'assert';
import _ from 'lodash';
import * as s from '../../src/state/store';
import * as getters from '../../src/state/getters';
import * as coreActions from '../../src/state/actions';
import * as constants from '../../src/constants';
import sinon from 'sinon';
import urls from 'kolibri.urls';
import { SessionResource } from 'kolibri.resources';

Vue.use(Vuex);

function createStore() {
  return new Vuex.Store({
    state: _.cloneDeep(s.initialState),
    mutations: s.mutations,
    getters,
    actions: coreActions,
  });
}

describe('Vuex store/actions for core module', () => {
  describe('error handling', () => {
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
  });

  describe('kolibriLogin', () => {
    let store;
    const oldHandler = window.onbeforeunload;

    before(() => {
      // this prevents kolibriLogin from refreshing page
      const location = window.document.location;

      window.onbeforeunload = () => {
        var originalHashValue = location.hash;

        window.setTimeout(function () {
            location.hash = 'preventNavigation' + ~~ (9999 * Math.random());
            location.hash = originalHashValue;
        }, 0);
      };
    });

    after(() => {
      window.onbeforeunload = oldHandler;
    });

    beforeEach(() => {
      store = createStore();
    });

    it('successful login', (done) => {
      urls['kolibri:managementplugin:management'] = () => '';
      Object.assign(SessionResource, {
        createModel: () => ({
          save: () => Promise.resolve({
            // just sending subset of sessionPayload
            id: '123',
            username: 'e_fermi',
            kind: ['cool-guy-user'],
          }),
        }),
      });

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
      Object.assign(SessionResource, {
        createModel: () => ({
          save: () => Promise.reject({ status: { code: 401 } }),
        }),
      });

      coreActions.kolibriLogin(store, {})
        .then(() => {
          assert.equal(store.state.core.loginError, constants.LoginErrors.INVALID_CREDENTIALS);
        })
        .then(done, done);
    });

    it('successful logout', (done) => {
      const clearCachesSpy = sinon.spy();
      const getModelStub = sinon.stub().returns({
        delete: () => Promise.resolve('goodbye'),
      });
      Object.assign(SessionResource, {
        getModel: getModelStub,
      });

      coreActions.kolibriLogout(store)
        .then(() => {
          sinon.assert.calledWith(getModelStub, 'current');
        })
        .then(done, done);
    });
  });
});
