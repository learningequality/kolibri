import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';
import client from 'kolibri.client';

export const SignUpResource = new Resource({
  name: 'signup',
});

// Returns Promise<Boolean>
export function getUsernameExists({ facilityId, username }) {
  return client({
    url: urls['kolibri:core:usernameexists'](),
    method: 'GET',
    params: {
      facility: facilityId,
      username: username,
    },
  })
    .then(response => {
      return response.data.username_exists;
    })
    .catch(() => {
      // Just fail silently
      return false;
    });
}
