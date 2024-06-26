import urls from 'kolibri.urls';
import client from 'kolibri.client';
import { Resource } from 'kolibri.lib.apiResource';

export default new Resource({
  name: 'facilityuser',
  removeImportedUser(user_id) {
    return client({
      url: urls['kolibri:core:deleteimporteduser'](),
      method: 'POST',
      data: {
        user_id,
      },
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
