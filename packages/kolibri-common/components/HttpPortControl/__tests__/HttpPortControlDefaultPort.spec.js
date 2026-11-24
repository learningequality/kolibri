/*
 * @jest-environment-options {"url": "http://kolibri.local/en/device/#/settings"}
 */
import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import clientFactory from 'kolibri/utils/baseClient';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import { httpPortStrings } from 'kolibri-common/strings/httpPortStrings';
import HttpPortControl from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/utils/baseClient', () => {
  const probe = jest.fn();
  probe.interceptors = { response: { use: jest.fn() } };
  return { __esModule: true, default: () => probe };
});

const { changePortAction$, portLabel$ } = httpPortStrings;

describe('HttpPortControl served on the default port', () => {
  it('moves the current page to the new port', async () => {
    const user = userEvent.setup();
    urls.__echoUrls();
    client.mockImplementation(({ method }) =>
      Promise.resolve({ data: method === 'POST' ? {} : { port: 80, readonly_reason: null } }),
    );
    clientFactory().mockResolvedValue({ status: 200 });
    render(HttpPortControl);

    const field = await screen.findByRole('spinbutton', { name: portLabel$() });
    expect(field).toHaveValue(80);
    await user.clear(field);
    await user.type(field, '8081');
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    await waitFor(() =>
      expect(redirectBrowser).toHaveBeenCalledWith(
        'http://kolibri.local:8081/en/device/#/settings',
      ),
    );
  });
});
