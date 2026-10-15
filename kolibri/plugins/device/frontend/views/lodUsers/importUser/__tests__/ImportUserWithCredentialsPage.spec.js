import { ref } from 'vue';
import { render, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { DemographicConstants, ERROR_CONSTANTS } from 'kolibri/constants';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import makeStore from '../../../../__tests__/utils/makeStore';
import ImportUserWithCredentialsPage from '../ImportUserWithCredentialsPage';

jest.mock('kolibri/urls');
jest.mock('kolibri/client');

const {
  usernameLabel$,
  passwordLabel$,
  continueAction$,
  requiredFieldError$,
  invalidCredentialsError$,
} = coreStrings;

const FACILITY = { id: 'facility-id', name: 'Facility', learner_can_login_with_no_password: true };
const USERNAME = 'content_manager';
const LEARNER = 'learner';
const PASSWORD = 'password';

function taskRequests() {
  return client.mock.calls.map(([request]) => request).filter(({ method }) => method === 'POST');
}

function renderComponent(taskResponses, facility = FACILITY) {
  client.mockClear();
  urls.__echoUrls();
  client.mockImplementation(({ method }) =>
    method === 'POST'
      ? taskResponses.shift()()
      : Promise.resolve({
          data: {
            facilities: [facility],
            device_name: 'Peer',
            device_id: 'device-id',
            device_address: 'http://peer.local/',
          },
        }),
  );
  render(ImportUserWithCredentialsPage, {
    store: makeStore(),
    routes: [],
    provide: {
      users: ref([]),
      importDeviceId: ref('device-id'),
      selectedFacility: ref(facility),
      importLodMachineService: { send: jest.fn() },
    },
  });
}

describe('ImportUserWithCredentialsPage', () => {
  it('asks for and focuses a password when a passwordless facility refuses the user', async () => {
    renderComponent([
      () => Promise.reject({ response: { data: [{ id: ERROR_CONSTANTS.INVALID_USERNAME }] } }),
      () => Promise.resolve({ data: { id: 'task-id', extra_metadata: { username: USERNAME } } }),
    ]);

    await userEvent.type(await screen.findByLabelText(usernameLabel$()), USERNAME);
    expect(screen.queryByLabelText(passwordLabel$())).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

    const passwordInput = await screen.findByLabelText(passwordLabel$());
    await waitFor(() => expect(passwordInput).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent(invalidCredentialsError$());
    await userEvent.type(passwordInput, PASSWORD);
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

    await waitFor(() => {
      expect(taskRequests()).toHaveLength(2);
    });
    expect(taskRequests()[1].data).toEqual(
      expect.objectContaining({ username: USERNAME, password: PASSWORD }),
    );
  });

  it('still reports invalid credentials when refused again after asking for a password', async () => {
    const refuse = () =>
      Promise.reject({ response: { data: [{ id: ERROR_CONSTANTS.INVALID_USERNAME }] } });
    renderComponent([refuse, refuse]);

    await userEvent.type(await screen.findByLabelText(usernameLabel$()), 'learnr');
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));
    await screen.findByLabelText(passwordLabel$());
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));

    expect(await screen.findByRole('alert')).toHaveTextContent(invalidCredentialsError$());
    expect(taskRequests()).toHaveLength(2);
  });

  it('keeps the password optional after a passwordless facility refuses the user', async () => {
    renderComponent([
      () => Promise.reject({ response: { data: [{ id: ERROR_CONSTANTS.INVALID_USERNAME }] } }),
      () => Promise.resolve({ data: { id: 'task-id', extra_metadata: { username: LEARNER } } }),
    ]);

    const usernameInput = await screen.findByLabelText(usernameLabel$());
    await userEvent.type(usernameInput, USERNAME);
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));
    const passwordInput = await screen.findByLabelText(passwordLabel$());
    await waitFor(() => expect(passwordInput).toHaveFocus());
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, LEARNER);
    await userEvent.click(passwordInput);

    expect(passwordInput.closest('.ui-textbox')).not.toHaveTextContent(requiredFieldError$());
    await userEvent.click(screen.getByRole('button', { name: continueAction$() }));
    await waitFor(() => {
      expect(taskRequests()).toHaveLength(2);
    });
    expect(taskRequests()[1].data).toEqual(
      expect.objectContaining({ username: LEARNER, password: DemographicConstants.NOT_SPECIFIED }),
    );
  });

  it('requires a password in a facility that requires passwords', async () => {
    renderComponent([], { ...FACILITY, learner_can_login_with_no_password: false });

    const passwordInput = await screen.findByLabelText(passwordLabel$());
    await userEvent.click(passwordInput);
    await userEvent.type(screen.getByLabelText(usernameLabel$()), USERNAME);
    await userEvent.click(passwordInput);

    expect(passwordInput.closest('.ui-textbox')).toHaveTextContent(requiredFieldError$());
  });
});
