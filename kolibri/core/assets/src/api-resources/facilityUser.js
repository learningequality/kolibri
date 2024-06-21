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
});
