import client from 'kolibri/client';
import { addOrUpdateUserPermissions } from '../actions';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const PAYLOAD = {
  userId: 'user_1',
  is_superuser: true,
  can_manage_content: true,
};

const SAVED_USER = { id: 'user_1', username: 'user1' };

function makeContext(permissions) {
  return { state: { permissions }, commit: jest.fn() };
}

describe('addOrUpdateUserPermissions', () => {
  it('PATCHes the existing row when the user already has device permissions', async () => {
    client.__setPayload(SAVED_USER);
    const context = makeContext({
      user: 'user_1',
      is_superuser: false,
      can_manage_content: false,
    });

    const user = await addOrUpdateUserPermissions(context, PAYLOAD);

    expect(client.mock.calls[0][0].method).toEqual('PATCH');
    // The pk travels in the URL, so `user` must not be in the body
    expect(client.mock.calls[0][0].data).toEqual({ is_superuser: true, can_manage_content: true });
    expect(user).toEqual(SAVED_USER);
  });

  it('POSTs a new row when the user has no device permissions', async () => {
    client.__setPayload({});
    // showUserPermissionsPage substitutes this shape - no `user` key - on a 404
    const context = makeContext({ is_superuser: false, can_manage_content: false });

    await addOrUpdateUserPermissions(context, PAYLOAD);

    expect(client.mock.calls[0][0].method).toEqual('POST');
    expect(client.mock.calls[0][0].data).toEqual({
      user: 'user_1',
      is_superuser: true,
      can_manage_content: true,
    });
  });
});
