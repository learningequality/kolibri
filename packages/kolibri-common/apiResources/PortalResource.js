import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'portal',
  async validateToken(token) {
    const response = await this.request({ action: 'validate_token', params: { token } });
    return response.data;
  },
  async registerFacility({ facility_id, token }) {
    const response = await this.request({
      method: 'POST',
      action: 'register',
      data: { facility_id, token },
    });
    return response.data;
  },
});
