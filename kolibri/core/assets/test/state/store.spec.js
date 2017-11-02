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
import * as browser from '../../src/utils/browser';
import ConditionalPromise from '../../src/conditionalPromise';

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
    let assignStub;

    beforeEach(() => {
      store = createStore();
      assignStub = sinon.stub(browser, 'redirectBrowser');
    });

    afterEach(() => {
      assignStub.restore();
    });

    it('successful login', done => {
      urls['kolibri:managementplugin:management'] = () => '';
      Object.assign(SessionResource, {
        createModel: () => ({
          save: () =>
            Promise.resolve({
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
        sinon.assert.called(assignStub);
      }

      coreActions
        .kolibriLogin(store, {})
        .then(runAssertions)
        .then(done, done);
    });

    it('failed login (401)', done => {
      Object.assign(SessionResource, {
        createModel: () => ({
          save: () => Promise.reject({ status: { code: 401 } }),
        }),
      });

      coreActions
        .kolibriLogin(store, {})
        .then(() => {
          assert.equal(store.state.core.loginError, constants.LoginErrors.INVALID_CREDENTIALS);
        })
        .then(done, done);
    });

    it('successful logout', done => {
      const clearCachesSpy = sinon.spy();
      const getModelStub = sinon.stub().returns({
        delete: () => Promise.resolve('goodbye'),
      });
      Object.assign(SessionResource, {
        getModel: getModelStub,
      });

      coreActions
        .kolibriLogout(store)
        .then(() => {
          sinon.assert.calledWith(getModelStub, 'current');
          sinon.assert.called(assignStub);
        })
        .then(done, done);
    });
  });
});

describe('Vuex core logging actions', () => {
  describe('attempt log saving', () => {
    it('saveAndStoreAttemptLog does not overwrite state if item id has changed', done => {
      const store = createStore();
      kolibri.resources = {};
      kolibri.resources.AttemptLog = {
        createModel: obj => ({ attributes: obj }),
      };
      coreActions.createAttemptLog(store, 'first');
      let externalResolve;
      const firstState = Object.assign({}, store.state.core.logging.attempt);
      coreActions.__set__(
        'saveAttemptLog',
        () =>
          new ConditionalPromise(resolve => {
            externalResolve = resolve;
          })
      );
      const promise = coreActions.saveAndStoreAttemptLog(store);
      coreActions.createAttemptLog(store, 'second');
      store.state.core.logging.attempt.id = 'assertion';
      externalResolve(firstState);
      promise.then(() => {
        assert.equal(store.state.core.logging.attempt.id, 'assertion');
        assert.equal(store.state.core.logging.attempt.item, 'second');
        done();
      });
    });
  });
});
