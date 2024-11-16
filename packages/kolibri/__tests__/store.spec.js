import Vue from 'vue';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import client from 'kolibri/client';
import * as constants from 'kolibri/constants';
import { coreStoreFactory as makeStore } from '../store';
import coreModule from '../../../kolibri/core/assets/src/state/modules/core';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri/utils/redirectBrowser');

describe('Vuex store/actions for core module', () => {
  describe('error handling', () => {
    const errorMessage = 'testError';
    Vue.prototype.$formatMessage = () => errorMessage;
    it('handleError action updates core state', () => {
      const store = makeStore();
      store.registerModule('core', coreModule);
      store.dispatch('handleError', 'catastrophic failure');
      expect(store.state.core.error).toEqual('catastrophic failure');
      expect(store.state.core.loading).toBeFalsy();
    });

    it('handleApiError action updates core state', () => {
      const store = makeStore();
      store.registerModule('core', coreModule);
      const apiError = { message: 'Too Bad' };
      try {
        store.dispatch('handleApiError', { error: apiError });
      } catch (e) {
        expect(e.message).toBe(apiError.message);
      }
      expect(store.state.core.error.match(/Too Bad/)).toHaveLength(1);
      expect(store.state.core.loading).toBeFalsy();
    });
  });

  describe('kolibriLogin', () => {
    stubWindowLocation(beforeAll, afterAll);

    let store;

    beforeEach(() => {
      store = makeStore();
      store.registerModule('core', coreModule);
    });

    afterEach(() => {
      redirectBrowser.mockReset();
    });

    it('successful login', async () => {
      client.__setPayload({
        // just sending subset of sessionPayload
        id: '123',
        username: 'e_fermi',
        kind: ['cool-guy-user'],
      });

      await store.dispatch('kolibriLogin', {});
      expect(redirectBrowser).toHaveBeenCalled();
    });

    it('failed login (401)', async () => {
      client.mockImplementation(() => {
        return Promise.reject({
          response: {
            data: [
              {
                id: constants.LoginErrors.INVALID_CREDENTIALS,
              },
            ],
            status: 401,
          },
        });
      });

      const error = await store.dispatch('kolibriLogin', {});
      expect(error).toEqual(constants.LoginErrors.INVALID_CREDENTIALS);
    });
  });
});
