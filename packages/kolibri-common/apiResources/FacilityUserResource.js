import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';
import client from 'kolibri/client';

export default new Resource({
  name: 'facilityuser',
  removeImportedUser(user_id) {
    return client({
      url: urls['kolibri:core:deleteimporteduser'](user_id),
      method: 'DELETE',
    });
  },
  rotateQrToken(user_id) {
    return client({
      url: urls['kolibri:core:facilityuser_rotate_qr_token'](user_id),
      method: 'POST',
    });
  },
  assignQrToken(user_id) {
    return client({
      url: urls['kolibri:core:facilityuser_assign_qr_token'](user_id),
      method: 'POST',
    });
  },
  assignQrTokens(user_ids) {
    return client({
      url: urls['kolibri:core:facilityuser_assign_qr_tokens'](),
      method: 'POST',
      data: { user_ids },
    });
  },
  async listRemoteFacilityLearners(params) {
    const { data } = await client({
      url: urls['kolibri:core:remotefacilityauthenticateduserinfo'](),
      method: 'POST',
      data: params,
    });

    const admin = data.find(user => user.username === params.username);
    const students = data.filter(user => !user.roles || !user.roles.length);

    return {
      admin,
      students,
    };
  },
});
