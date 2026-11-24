/*
 * @jest-environment-options {"url": "http://kolibri.local:8080/"}
 */
import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import clientFactory from 'kolibri/utils/baseClient';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line import-x/named
import { httpPortStrings } from 'kolibri-common/strings/httpPortStrings';
import HowAreYouUsingKolibri from '../onboarding-forms/HowAreYouUsingKolibri';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/utils/baseClient', () => {
  const probe = jest.fn();
  probe.interceptors = { response: { use: jest.fn() } };
  return { __esModule: true, default: () => probe };
});

const { advancedOptionsAction$, changePortAction$, portLabel$, restartingOnPort$ } =
  httpPortStrings;

const probe = clientFactory();

function renderStep({ isAppContext = false } = {}) {
  useKResponsiveWindow.mockImplementation(() => ({ windowIsSmall: false }));
  useUser.mockImplementation(() => useUserMock({ isAppContext }));
  urls.__echoUrls();
  client.mockImplementation(({ method }) =>
    Promise.resolve({ data: method === 'POST' ? {} : { port: 8080, readonly_reason: null } }),
  );
  const wizardService = { send: jest.fn(), state: { context: {} } };
  render(HowAreYouUsingKolibri, { provide: { wizardService } });
  return wizardService;
}

function advancedToggle() {
  return screen.getByRole('button', { name: advancedOptionsAction$() });
}

describe('HowAreYouUsingKolibri', () => {
  it('reveals the port control from the advanced options toggle', async () => {
    renderStep();
    expect(advancedToggle()).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(advancedToggle());

    expect(await screen.findByRole('spinbutton', { name: portLabel$() })).toHaveValue(8080);
    expect(advancedToggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not continue the wizard on Enter in the port field', async () => {
    const wizardService = renderStep();
    await userEvent.click(advancedToggle());
    const field = await screen.findByRole('spinbutton', { name: portLabel$() });

    await userEvent.type(field, '1{Enter}');

    expect(wizardService.send).not.toHaveBeenCalled();
  });

  describe('while the port changes', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      probe.mockReset();
      redirectBrowser.mockReset();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('covers the step with a status dialog until Kolibri answers on the new port', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      probe.mockRejectedValue({ response: { status: 0 } });
      renderStep();
      await user.click(advancedToggle());
      const field = await screen.findByRole('spinbutton', { name: portLabel$() });
      await user.clear(field);
      await user.type(field, '8081');
      await user.click(screen.getByRole('button', { name: changePortAction$() }));
      await waitFor(() => expect(probe).toHaveBeenCalled());

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByRole('status')).toHaveTextContent(
        restartingOnPort$({ port: 8081 }),
      );
      await user.keyboard('{Escape}');
      expect(screen.getByRole('dialog')).toBe(dialog);

      probe.mockResolvedValue({ status: 200 });
      await jest.advanceTimersByTimeAsync(2000);
      expect(redirectBrowser).toHaveBeenCalledWith('http://kolibri.local:8081/');
    });
  });

  it('offers no advanced options in the app', () => {
    renderStep({ isAppContext: true });
    expect(
      screen.queryByRole('button', { name: advancedOptionsAction$() }),
    ).not.toBeInTheDocument();
  });
});
