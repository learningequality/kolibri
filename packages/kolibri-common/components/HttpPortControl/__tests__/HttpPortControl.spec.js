/*
 * @jest-environment-options {"url": "http://kolibri.local:8080/"}
 */
import { render, screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import client from 'kolibri/client';
import heartbeat from 'kolibri/heartbeat';
import urls from 'kolibri/urls';
import clientFactory from 'kolibri/utils/baseClient';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { httpPortStrings } from 'kolibri-common/strings/httpPortStrings';
import HttpPortControl from '../index.vue';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('kolibri/heartbeat', () => ({
  stopPolling: jest.fn(),
}));
jest.mock('kolibri/utils/baseClient', () => {
  const probe = jest.fn();
  probe.interceptors = { response: { use: jest.fn() } };
  return { __esModule: true, default: () => probe };
});

const {
  browserPortMismatch$,
  changePortAction$,
  portChangeUnconfirmed$,
  portFetchError$,
  portInUseByProcess$,
  portLabel$,
  portOutOfRange$,
  portPermissionDenied$,
  restartingOnPort$,
  setByEnvironmentVariable$,
  stillOnPort$,
} = httpPortStrings;

const probe = clientFactory();

function serve({ port = 8080, readonlyReason = null, post = acceptPort } = {}) {
  client.mockImplementation(({ method }) => {
    if (method === 'POST') {
      return post();
    }
    return Promise.resolve({ data: { port, readonly_reason: readonlyReason } });
  });
}

function rejectWith(id, message = '') {
  return () =>
    Promise.reject({
      response: { status: 400, data: [{ id, metadata: { field: 'port', message } }] },
    });
}

function acceptPort() {
  return Promise.resolve({ data: {} });
}

function portField() {
  return screen.findByRole('spinbutton', { name: portLabel$() });
}

function postedPorts() {
  return client.mock.calls.filter(([{ method }]) => method === 'POST').map(([{ data }]) => data);
}

async function enterPort(user, port) {
  const field = await portField();
  await user.clear(field);
  await user.type(field, String(port));
}

describe('HttpPortControl', () => {
  let user;

  beforeEach(() => {
    jest.useFakeTimers();
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    urls.__echoUrls();
    client.mockReset();
    probe.mockReset();
    redirectBrowser.mockReset();
    heartbeat.stopPolling.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the port Kolibri is served on', async () => {
    serve();
    render(HttpPortControl);
    expect(await portField()).toHaveValue(8080);
  });

  it('says what holds the port when the claim fails, and keeps the current port', async () => {
    serve({ post: rejectWith('PORT_IN_USE_BY_PROCESS', 'nginx (nginx.service)') });
    render(HttpPortControl);
    await enterPort(user, 80);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      portInUseByProcess$({ port: 80, process: 'nginx (nginx.service)' }),
    );
    expect(await portField()).toHaveValue(8080);
    expect(redirectBrowser).not.toHaveBeenCalled();
  });

  it.each([
    [
      'an unidentified program',
      rejectWith('PORT_IN_USE'),
      () => httpPortStrings.portInUse$({ port: 80 }),
    ],
    [
      'the user running a program',
      rejectWith('PORT_IN_USE_BY_USER', 'root'),
      () => httpPortStrings.portInUseByUser$({ port: 80, user: 'root' }),
    ],
    [
      'the operating system error',
      rejectWith('PORT_UNAVAILABLE', 'Address not available'),
      () => httpPortStrings.portUnavailable$({ port: 80, detail: 'Address not available' }),
    ],
    [
      'a refused permission',
      rejectWith('PORT_PERMISSION_DENIED'),
      () => portPermissionDenied$({ port: 80 }),
    ],
  ])('names %s when the claim fails', async (_, post, expected) => {
    serve({ post });
    render(HttpPortControl);
    await enterPort(user, 80);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      `${expected()} ${stillOnPort$({ port: 8080 })}`,
    );
  });

  it.each([
    ['a server error', { response: { status: 500 } }],
    ['a network error', { response: { status: 0 } }],
  ])('does not claim the old port is kept after %s', async (_, error) => {
    serve({ post: () => Promise.reject(error) });
    render(HttpPortControl);
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      portChangeUnconfirmed$({ port: 8081 }),
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(stillOnPort$({ port: 8080 }));
  });

  it('says the port is unchanged when the request is refused', async () => {
    serve({
      post: () =>
        Promise.reject({
          response: {
            status: 403,
            data: [{ id: 'PERMISSION_DENIED', metadata: { view: 'Http Port' } }],
          },
        }),
    });
    render(HttpPortControl);
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    expect(await screen.findByRole('alert')).toHaveTextContent(stillOnPort$({ port: 8080 }));
    expect(screen.getByRole('alert')).not.toHaveTextContent(portChangeUnconfirmed$({ port: 8081 }));
  });

  it('offers no field when the browser reaches Kolibri through another port', async () => {
    serve({ port: 9000 });
    render(HttpPortControl);

    await waitFor(() =>
      expect(screen.getByTestId('http-port-readonly')).toHaveTextContent(
        browserPortMismatch$({ port: 9000 }),
      ),
    );
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('does not change the port when the preceding step fails', async () => {
    serve();
    render(HttpPortControl, { props: { beforeChange: () => Promise.reject(new Error()) } });
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));
    await jest.advanceTimersByTimeAsync(0);

    expect(postedPorts()).toEqual([]);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('explains why the port cannot be changed instead of offering the field', async () => {
    serve({ readonlyReason: 'ENVIRONMENT_VARIABLE' });
    render(HttpPortControl);

    await waitFor(() =>
      expect(screen.getByTestId('http-port-readonly')).toHaveTextContent(
        setByEnvironmentVariable$({ port: 8080 }),
      ),
    );
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('shows a loader until the port is known', async () => {
    let respond;
    client.mockReturnValue(new Promise(resolve => (respond = resolve)));
    render(HttpPortControl);

    expect(screen.getByTestId('http-port-loading')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();

    respond({ data: { port: 8080, readonly_reason: null } });
    expect(await portField()).toHaveValue(8080);
    expect(screen.queryByTestId('http-port-loading')).not.toBeInTheDocument();
  });

  it('says so when the port cannot be loaded', async () => {
    client.mockRejectedValue({ response: { status: 500 } });
    render(HttpPortControl);

    expect(await screen.findByRole('alert')).toHaveTextContent(portFetchError$());
    expect(screen.queryByTestId('http-port-loading')).not.toBeInTheDocument();
  });

  it('offers Change only for a valid port other than the served one', async () => {
    serve();
    render(HttpPortControl);
    const change = () => screen.getByRole('button', { name: changePortAction$() });
    await portField();
    expect(change()).toBeDisabled();
    expect(screen.queryByText(portOutOfRange$())).not.toBeInTheDocument();

    for (const port of [0, 1.5, 70000]) {
      await enterPort(user, port);
      expect(change()).toBeDisabled();
      expect(screen.getByText(portOutOfRange$())).toBeInTheDocument();
    }
    await enterPort(user, 8080);
    await user.keyboard('{Enter}');
    await jest.advanceTimersByTimeAsync(0);
    expect(postedPorts()).toEqual([]);

    await enterPort(user, 1);
    expect(change()).toBeEnabled();
  });

  it('returns focus to the field when the preceding step fails', async () => {
    serve();
    render(HttpPortControl, { props: { beforeChange: () => Promise.reject(new Error()) } });
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveFocus());
  });

  it('tells its parent when the claim fails', async () => {
    serve({ post: rejectWith('PORT_PERMISSION_DENIED') });
    const { emitted } = render(HttpPortControl);
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));
    await screen.findByRole('alert');

    expect(emitted().failed).toHaveLength(1);
  });

  it('clears the earlier reason when a retry succeeds', async () => {
    let post = rejectWith('PORT_PERMISSION_DENIED');
    serve({ post: () => post() });
    probe.mockReturnValue(new Promise(() => {}));
    render(HttpPortControl);
    await enterPort(user, 80);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));
    await screen.findByRole('alert');

    post = acceptPort;
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    expect(await screen.findByRole('status')).toHaveTextContent(restartingOnPort$({ port: 8081 }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stops the heartbeat once the port change is accepted', async () => {
    serve();
    probe.mockReturnValue(new Promise(() => {}));
    render(HttpPortControl);
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    await screen.findByRole('status');
    await waitFor(() => expect(heartbeat.stopPolling).toHaveBeenCalled());
  });

  it('keeps the heartbeat when the claim fails', async () => {
    serve({ post: rejectWith('PORT_PERMISSION_DENIED') });
    render(HttpPortControl);
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));
    await screen.findByRole('alert');

    expect(heartbeat.stopPolling).not.toHaveBeenCalled();
  });

  it('submits the port when Enter is pressed in the field', async () => {
    serve();
    probe.mockReturnValue(new Promise(() => {}));
    render(HttpPortControl);
    await enterPort(user, 8081);
    await user.keyboard('{Enter}');

    await waitFor(() => expect(postedPorts()).toEqual([{ port: 8081 }]));
  });

  it('opens the new address only once Kolibri answers on it', async () => {
    serve();
    probe.mockRejectedValue({ response: { status: 0 } });
    render(HttpPortControl);
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    await waitFor(() =>
      expect(probe).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://kolibri.local:8081/static/assets/favicons/logo.ico',
        }),
      ),
    );
    expect(screen.getByRole('status')).toHaveTextContent(restartingOnPort$({ port: 8081 }));
    await jest.advanceTimersByTimeAsync(5000);
    expect(redirectBrowser).not.toHaveBeenCalled();

    probe.mockResolvedValue({ status: 200 });
    await jest.advanceTimersByTimeAsync(5000);
    expect(redirectBrowser).toHaveBeenCalledWith('http://kolibri.local:8081/');
    expect(redirectBrowser).toHaveBeenCalledTimes(1);
  });

  it('asks the new address for a fresh copy on every probe', async () => {
    serve();
    probe.mockRejectedValue({ response: { status: 0 } });
    render(HttpPortControl);
    await enterPort(user, 8081);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));
    await waitFor(() => expect(probe).toHaveBeenCalled());
    await jest.advanceTimersByTimeAsync(1000);

    const [[first], [second]] = probe.mock.calls;
    expect(first.params).not.toEqual(second.params);
  });

  it('drops the port from the address when it is the default', async () => {
    serve();
    probe.mockResolvedValue({ status: 200 });
    render(HttpPortControl);
    await enterPort(user, 80);
    await user.click(screen.getByRole('button', { name: changePortAction$() }));

    await waitFor(() => expect(redirectBrowser).toHaveBeenCalledWith('http://kolibri.local/'));
  });

  describe('with requireConfirmation', () => {
    it('changes the port only once confirmed', async () => {
      serve();
      probe.mockReturnValue(new Promise(() => {}));
      render(HttpPortControl, { props: { requireConfirmation: true } });
      await enterPort(user, 8081);
      await user.click(screen.getByRole('button', { name: changePortAction$() }));

      const dialog = await screen.findByRole('dialog');
      expect(postedPorts()).toEqual([]);

      await user.click(within(dialog).getByRole('button', { name: changePortAction$() }));
      await waitFor(() => expect(postedPorts()).toEqual([{ port: 8081 }]));
    });

    it('leaves the port unchanged when cancelled', async () => {
      serve();
      render(HttpPortControl, { props: { requireConfirmation: true } });
      await enterPort(user, 8081);
      await user.click(screen.getByRole('button', { name: changePortAction$() }));
      await user.click(
        within(await screen.findByRole('dialog')).getByRole('button', {
          name: coreStrings.cancelAction$(),
        }),
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(postedPorts()).toEqual([]);
    });
  });

  describe('while the port changes', () => {
    async function startChange({ requireConfirmation, beforeChange }) {
      render(HttpPortControl, { props: { requireConfirmation, beforeChange } });
      await enterPort(user, 8081);
      await user.click(screen.getByRole('button', { name: changePortAction$() }));
      if (requireConfirmation) {
        await user.click(
          within(await screen.findByRole('dialog')).getByRole('button', {
            name: changePortAction$(),
          }),
        );
      }
    }

    async function expectBlockingStatus() {
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByRole('status')).toBeInTheDocument();
      expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
      expect(dialog).toContainElement(document.activeElement);
      await user.keyboard('{Escape}');
      expect(screen.getByRole('dialog')).toBe(dialog);
      expect(within(dialog).getByRole('status')).toBeInTheDocument();
      return dialog;
    }

    it.each([false, true])(
      'shows the restart in a dialog that cannot be dismissed (requireConfirmation %s)',
      async requireConfirmation => {
        serve();
        probe.mockReturnValue(new Promise(() => {}));
        await startChange({ requireConfirmation });

        await waitFor(() => expect(postedPorts()).toEqual([{ port: 8081 }]));
        const dialog = await expectBlockingStatus();
        expect(within(dialog).getByRole('status')).toHaveTextContent(
          restartingOnPort$({ port: 8081 }),
        );
      },
    );

    it.each([false, true])(
      'blocks the page while the preceding step runs (requireConfirmation %s)',
      async requireConfirmation => {
        serve();
        await startChange({ requireConfirmation, beforeChange: () => new Promise(() => {}) });

        await expectBlockingStatus();
        expect(postedPorts()).toEqual([]);
      },
    );

    it.each([false, true])(
      'returns focus to the field when the claim fails (requireConfirmation %s)',
      async requireConfirmation => {
        serve({ post: rejectWith('PORT_PERMISSION_DENIED') });
        await startChange({ requireConfirmation });
        await screen.findByRole('alert');

        await waitFor(() => expect(screen.getByRole('spinbutton')).toHaveFocus());
      },
    );

    it('removes the dialog and shows the reason when the claim fails', async () => {
      serve({ post: rejectWith('PORT_PERMISSION_DENIED') });
      await startChange({ requireConfirmation: true });

      expect(await screen.findByRole('alert')).toHaveTextContent(
        portPermissionDenied$({ port: 8081 }),
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
