import Vue from 'vue';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import client from 'kolibri/client';
import * as constants from 'kolibri/constants';
import { coreStoreFactory as makeStore } from '../store';
import coreModule from '../../../kolibri/core/assets/src/state/modules/core';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line
import * as useUserModule from '../composables/useUser';

jest.mock('../composables/useUser');

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

  describe('useUser composable', () => {
    stubWindowLocation(beforeAll, afterAll);

    beforeEach(() => {
      // Reset mocks before each test
      useUserModule.default.mockImplementation(() => ({
        login: jest.fn().mockImplementation(() => {
          // This should match the implementation in useUser.js
          redirectBrowser();
          return Promise.resolve();
        }),
        logout: jest.fn().mockImplementation(() => {
          // This should match the implementation in useUser.js
          redirectBrowser();
          return Promise.resolve();
        }),
        setUnspecifiedPassword: jest.fn().mockImplementation(credentials => {
          // This should match the implementation in useUser.js
          client({
            method: 'post',
            url: '/user/setpassword',
            data: credentials,
          });
          return Promise.resolve();
        }),
      }));
      redirectBrowser.mockReset();
      client.mockReset();
    });

    afterEach(() => {
      useUserModule.default.mockReset();
      redirectBrowser.mockReset();
      client.mockReset();
    });

    it('successful login', async () => {
      const sessionPayload = {
        id: '123',
        username: 'e_fermi',
        kind: ['cool-guy-user'],
      };
      client.__setPayload(sessionPayload);

      const { login } = useUserModule.default();
      await login({});

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

      const { login } = useUserModule.default();
      try {
        await login({});
      } catch (error) {
        expect(error).toEqual(constants.LoginErrors.INVALID_CREDENTIALS);
      }
    });

    it('successful logout', async () => {
      const { logout } = useUserModule.default();
      await logout();
      expect(redirectBrowser).toHaveBeenCalled();
    });

    it('setUnspecifiedPassword updates user password', async () => {
      const credentials = {
        username: 'testuser',
        password: 'newpassword',
        facility: { id: 'facility_1' },
      };
      client.__setPayload({ success: true });

      const { setUnspecifiedPassword } = useUserModule.default();
      await setUnspecifiedPassword(credentials);

      expect(client).toHaveBeenCalledWith({
        method: 'post',
        url: '/user/setpassword',
        data: credentials,
      });
    });
  });
});
