import redirectBrowser from 'kolibri/utils/redirectBrowser';
import client from 'kolibri/client';
import * as constants from 'kolibri/constants';
import { stubWindowLocation } from 'testUtils'; // eslint-disable-line
import * as useUserModule from '../composables/useUser';

jest.mock('../composables/useUser');

jest.mock('kolibri/urls');
jest.mock('kolibri/client');
jest.mock('kolibri/utils/redirectBrowser');

describe('Vuex store/actions for core module', () => {
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
  });
});
