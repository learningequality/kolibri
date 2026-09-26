import { render, waitFor } from '@testing-library/vue';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { createTranslator } from 'kolibri/utils/i18n';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { Presets } from 'kolibri/constants';
import SettingUpKolibri from '../onboarding-forms/SettingUpKolibri';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { canGetOSUser: true },
}));

const { onMyOwnDeviceName$, onMyOwnFacilityName$ } = createTranslator(
  SettingUpKolibri.name,
  SettingUpKolibri.$trs,
);

describe('SettingUpKolibri', () => {
  it('names the device and facility after the OS user', async () => {
    const name = 'Jane Doe';
    useUser.mockImplementation(() => useUserMock({ isAppContext: true }));
    urls.__echoUrls();
    client.mockImplementation(({ url, method }) => {
      if (url.endsWith('setupwizard_osuser')) {
        return Promise.resolve({ data: { name } });
      }
      if (method === 'POST') {
        return Promise.resolve({ data: {} });
      }
      // Never resolves, so the component stays on the provisioning screen
      return new Promise(() => {});
    });

    render(SettingUpKolibri, {
      provide: {
        wizardService: {
          send: jest.fn(),
          state: { context: { onMyOwnOrGroup: Presets.PERSONAL } },
        },
      },
    });

    await waitFor(() =>
      expect(client).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' })),
    );
    expect(client).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        data: expect.objectContaining({
          device_name: onMyOwnDeviceName$({ name }),
          facility: { name: onMyOwnFacilityName$({ name }) },
        }),
      }),
    );
  });
});
