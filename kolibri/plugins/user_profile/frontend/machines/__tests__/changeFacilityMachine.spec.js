import { interpret } from 'xstate';
import { waitFor } from '@testing-library/vue';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { changeFacilityMachine } from '../changeFacilityMachine';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const USERNAME = 'content_manager';
const TARGET_FACILITY = {
  id: 'target-facility',
  name: 'Target',
  url: 'http://target',
  learner_can_login_with_no_password: true,
};

describe('changeFacilityMachine', () => {
  it('asks for credentials when a passwordless facility refuses the existing account', async () => {
    urls.__echoUrls();
    client.mockImplementation(({ url }) =>
      url === '/kolibri:core:remotefacilityuser'
        ? Promise.resolve({ data: [{ id: 'user-id', username: USERNAME }] })
        : Promise.reject({ response: { status: 401 } }),
    );
    const service = interpret(changeFacilityMachine).start();

    service.send({
      type: 'SETCONTEXT',
      value: { facility: 'source-facility', username: USERNAME, role: 'learner' },
    });
    service.send({ type: 'SELECTFACILITY', value: TARGET_FACILITY });
    await waitFor(() => expect(service.getSnapshot().context.accountExists).toBe(true));
    service.send('CONTINUE');
    service.send('MERGE');
    expect(service.getSnapshot().value).toBe('usernameExists');
    service.send('MERGE');

    await waitFor(() => expect(service.getSnapshot().value).toBe('requireAccountCreds'));
    service.stop();
  });
});
