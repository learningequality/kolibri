import Vue from 'vue';
import Vuex from 'vuex';
import urls from 'kolibri.urls';
import { SessionResource, AttemptLogResource } from 'kolibri.resources';
import coreStore from '../../src/state/store';
import * as coreActions from '../../src/state/actions';
import * as constants from '../../src/constants';
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
      expect(store.state.core.error).toEqual('catastrophic failure');
      expect(store.state.core.loading).toBeFalsy();
      expect(store.state.core.title).toEqual(errorMessage);
    });

    it('handleApiError action updates core state', () => {
      const store = coreStore.factory();
      const apiError = { message: 'Too Bad' };
      coreActions.handleApiError(store, apiError);
      expect(store.state.core.error.match(/Too Bad/)).toHaveLength(1);
      expect(store.state.core.loading).toBeFalsy();
      expect(store.state.core.title).toEqual(errorMessage);
    });
  });

  describe('kolibriLogin', () => {
    let store;
    let assignStub;

    beforeEach(() => {
      store = coreStore.factory();
      assignStub = jest.spyOn(browser, 'redirectBrowser');
    });

    afterEach(() => {
      assignStub.mockRestore();
    });

    it('successful login', async () => {
      urls['kolibri:facilitymanagementplugin:facility_management'] = () => '';
      urls['kolibri:devicemanagementplugin:device_management'] = () => '';
      urls['kolibri:coach:coach'] = () => '';
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

      await coreActions.kolibriLogin(store, {});
      const { session } = store.state.core;
      expect(session.id).toEqual('123');
      expect(session.username).toEqual('e_fermi');
      expect(session.kind).toEqual(['cool-guy-user']);
      expect(assignStub).toHaveBeenCalled();
    });

    it('failed login (401)', async () => {
      Object.assign(SessionResource, {
        createModel: () => ({
          save: () => Promise.reject({ status: { code: 401 } }),
        }),
      });

      await coreActions.kolibriLogin(store, {});
      expect(store.state.core.loginError).toEqual(constants.LoginErrors.INVALID_CREDENTIALS);
    });

    it('successful logout', async () => {
      const getModelStub = jest.fn().mockReturnValue({
        delete: () => Promise.resolve('goodbye'),
      });
      Object.assign(SessionResource, {
        getModel: getModelStub,
      });

      await coreActions.kolibriLogout(store);
      expect(getModelStub).toHaveBeenCalledWith('current');
      expect(assignStub).toHaveBeenCalled();
    });
  });
});

describe('Vuex core logging actions', () => {
  describe('attempt log saving', () => {
    it('saveAndStoreAttemptLog does not overwrite state if item id has changed', async () => {
      const store = coreStore.factory();
      coreActions.createAttemptLog(store, 'first');
      let externalResolve;
      const firstState = Object.assign({}, store.state.core.logging.attempt);
      const findModelStub = jest.spyOn(AttemptLogResource, 'findModel');
      findModelStub.mockReturnValue({
        save: () =>
          new ConditionalPromise(resolve => {
            externalResolve = resolve;
          }),
      });
      const promise = coreActions.saveAndStoreAttemptLog(store);
      coreActions.createAttemptLog(store, 'second');
      store.state.core.logging.attempt.id = 'assertion';
      externalResolve(firstState);
      await promise;
      expect(store.state.core.logging.attempt.id).toEqual('assertion');
      expect(store.state.core.logging.attempt.item).toEqual('second');
    });
  });
});
