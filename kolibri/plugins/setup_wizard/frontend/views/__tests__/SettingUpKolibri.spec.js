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

const { onMyOwnDeviceName$, onMyOwnFacilityName$ } = createTranslator(
  SettingUpKolibri.name,
  SettingUpKolibri.$trs,
);

async function provisionOnMyOwn({ isAppContext, context = {} }) {
  useUser.mockImplementation(() => useUserMock({ isAppContext }));
  urls.__echoUrls();
  client.mockImplementation(({ method }) => {
    if (method === 'POST') {
      return Promise.resolve({ data: {} });
    }
    return new Promise(() => {});
  });

  render(SettingUpKolibri, {
    provide: {
      wizardService: {
        send: jest.fn(),
        state: { context: { onMyOwnOrGroup: Presets.PERSONAL, ...context } },
      },
    },
  });

  await waitFor(() =>
    expect(client).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' })),
  );
  return client.mock.calls.find(([{ method }]) => method === 'POST')[0].data;
}

describe('SettingUpKolibri', () => {
  afterEach(() => {
    client.mockReset();
  });

  it('leaves naming the device and facility to the server for an OS user', async () => {
    const data = await provisionOnMyOwn({ isAppContext: true });

    expect(data).not.toHaveProperty('device_name');
    expect(data.facility).toEqual({});
  });

  it('names the device and facility after the superuser in the browser', async () => {
    const name = 'Jane Doe';
    const data = await provisionOnMyOwn({
      isAppContext: false,
      context: { superuser: { full_name: name, username: 'jane', password: 'pass' } },
    });

    expect(data.device_name).toBe(onMyOwnDeviceName$({ name }));
    expect(data.facility).toEqual({ name: onMyOwnFacilityName$({ name }) });
  });
});
