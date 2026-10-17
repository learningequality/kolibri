import { render, screen } from '@testing-library/vue';
import flushPromises from 'flush-promises';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import { UserKinds } from 'kolibri/constants';
import { createTranslator } from 'kolibri/utils/i18n';
import useUser from 'kolibri/composables/useUser';
import MeteredConnectionNotificationModal from '../MeteredConnectionNotificationModal';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: { canCheckMeteredConnection: true },
}));

const { modalTitle$ } = createTranslator(
  MeteredConnectionNotificationModal.name,
  MeteredConnectionNotificationModal.$trs,
);

function setSession(user_id, kind) {
  useUser().setSession({ session: { id: 'session', user_id, kind: [kind] } });
}

describe('MeteredConnectionNotificationModal', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    urls.__echoUrls();
    client.mockImplementation(({ url }) =>
      Promise.resolve({
        data: url.includes('check_metered_connection')
          ? true
          : { extra_settings: { allow_download_on_metered_connection: false } },
      }),
    );
  });

  afterEach(() => {
    client.__reset();
  });

  it('makes no requests for a guest', async () => {
    setSession(undefined, UserKinds.ANONYMOUS);
    render(MeteredConnectionNotificationModal);
    await flushPromises();
    expect(client).not.toHaveBeenCalled();
  });

  it('makes no requests for a signed-in learner', async () => {
    setSession('learner', UserKinds.LEARNER);
    render(MeteredConnectionNotificationModal);
    await flushPromises();
    expect(client).not.toHaveBeenCalled();
  });

  it('asks a superuser on a metered connection whether to use mobile data', async () => {
    setSession('superuser', UserKinds.SUPERUSER);
    render(MeteredConnectionNotificationModal);
    await flushPromises();
    expect(screen.getByRole('dialog', { name: modalTitle$() })).toBeInTheDocument();
  });
});
