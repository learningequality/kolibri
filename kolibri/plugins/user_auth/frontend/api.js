import urls from 'kolibri/urls';
import client from 'kolibri/client';

export function setUnspecifiedPassword({ username, password, facility }) {
  return client({
    url: urls['kolibri:core:setnonspecifiedpassword'](),
    data: {
      username,
      password,
      facility,
    },
    method: 'post',
  });
}
