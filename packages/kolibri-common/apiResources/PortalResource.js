import { Resource } from 'kolibri/apiResource';
import urls from 'kolibri/urls';

export default new Resource({
  name: 'portal',
  validateToken(token) {
    const url = urls['kolibri:core:portal_validate_token']();
    return this.client({
      url,
      method: 'get',
      params: { token },
    });
  },
  registerFacility({ facility_id, token }) {
    const url = urls['kolibri:core:portal_register']();
    return this.client({
      url,
      method: 'post',
      data: { facility_id, token },
    });
  },
});
