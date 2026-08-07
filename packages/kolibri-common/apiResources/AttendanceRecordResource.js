import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'attendancerecord',
  bulkUpdate(data) {
    return this.postListEndpoint('bulk_update', data);
  },
  async bulkUpdate_v2(data) {
    const response = await this.request({ method: 'POST', action: 'bulk_update', data });
    return response.data;
  },
});
