import client from 'kolibri/client';
import { UserKinds } from 'kolibri/constants';
import { updateFacilityUserDetails } from '../actions';

jest.mock('kolibri/client');
jest.mock('kolibri/urls');

const userId = 'user-1';

describe('updateFacilityUserDetails', () => {
  beforeEach(() => {
    client.__reset();
  });

  it('reads the user back instead of patching nothing when only the role changed', async () => {
    client.__setPayload({ id: userId, facility: 'facility-1', roles: [] });

    await updateFacilityUserDetails(
      {},
      {
        userId,
        updates: { facilityUserUpdates: {}, roleUpdates: { kind: UserKinds.ADMIN } },
      },
    );

    // The GET is the read-back that gives `updateFacilityLevelRoles` the user's current roles;
    // the POST is the new facility role. An empty PATCH in between would be the bug.
    expect(client.mock.calls.map(([{ method }]) => method)).toEqual(['GET', 'POST']);
  });

  it('patches the edited fields when details changed alongside the role', async () => {
    client.__setPayload({ id: userId, facility: 'facility-1', roles: [] });

    await updateFacilityUserDetails(
      {},
      {
        userId,
        updates: {
          facilityUserUpdates: { full_name: 'Edited Name' },
          roleUpdates: { kind: UserKinds.ADMIN },
        },
      },
    );

    expect(client.mock.calls.map(([{ method }]) => method)).toEqual(['PATCH', 'POST']);
    expect(client.mock.calls[0][0].data).toEqual({ full_name: 'Edited Name' });
  });
});
