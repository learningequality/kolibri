/* eslint-env mocha */
import Vue from 'vue';
import Vuex from 'vuex';
import assert from 'assert';
import coreStore from '../../src/state/store';
import * as coreActions from '../../src/state/actions';
import * as constants from '../../src/constants';
import sinon from 'sinon';
import urls from 'kolibri.urls';
import { SessionResource, AttemptLogResource } from 'kolibri.resources';
import * as browser from '../../src/utils/browser';
import ConditionalPromise from '../../src/conditionalPromise';

Vue.use(Vuex);

describe('Vuex store/actions for core module', () => {
  describe('error handling', () => {
    const errorMessage = 'testError';
    Vue.prototype.$formatMessage = () => errorMessage;
    it('handleError action updates core state', () => {
      const store = coreStore.factory();
      coreActions.handleError(store, 'catastrophic failure');
      assert.equal(store.state.core.error, 'catastrophic failure');
      assert.equal(store.state.core.loading, false);
      assert.equal(store.state.core.title, errorMessage);
    });

    it('handleApiError action updates core state', () => {
      const store = coreStore.factory();
      const apiError = { message: 'Too Bad' };
      coreActions.handleApiError(store, apiError);
      assert(store.state.core.error.match(/Too Bad/));
      assert.equal(store.state.core.loading, false);
      assert.equal(store.state.core.title, errorMessage);
    });
  });

  describe('kolibriLogin', () => {
    let store;
    let assignStub;

    beforeEach(() => {
      store = coreStore.factory();
      assignStub = sinon.stub(browser, 'redirectBrowser');
    });

    afterEach(() => {
      assignStub.restore();
    });

    it('successful login', done => {
      urls['kolibri:managementplugin:management'] = () => '';
      urls['kolibri:managementplugin:device_management'] = () => '';
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
      const store = coreStore.factory();
      coreActions.createAttemptLog(store, 'first');
      let externalResolve;
      const firstState = Object.assign({}, store.state.core.logging.attempt);
      const findModelStub = sinon.stub(AttemptLogResource, 'findModel');
      findModelStub.returns({
        save: () =>
          new ConditionalPromise(resolve => {
            externalResolve = resolve;
          }),
      });
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
