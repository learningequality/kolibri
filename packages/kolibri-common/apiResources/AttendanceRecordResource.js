import { Resource } from 'kolibri/apiResource';

export default new Resource({
  name: 'attendancerecord',
  async bulkUpdate(data) {
    const response = await this.request({ method: 'POST', action: 'bulk_update', data });
    return response.data;
  },
});
