import { Resource } from 'kolibri.lib.apiResource';
import urls from 'kolibri.urls';

export const PortalResource = new Resource({
  name: 'portal',
  validateToken(token) {
    const path = urls['kolibri:core:portal-validate-token']();
    return this.client({
      path,
      method: 'GET',
      params: { token },
    });
  },
  registerFacility({ facility_id, token }) {
    const path = urls['kolibri:core:portal-register']();
    return this.client({
      path,
      method: 'POST',
      entity: { facility_id, token },
    });
  },
});
