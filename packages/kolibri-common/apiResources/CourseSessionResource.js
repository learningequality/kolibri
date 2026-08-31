import { Resource } from 'kolibri/apiResource';
import client from 'kolibri/client';

export default new Resource({
  name: 'coursesession',
  async activateTest({ id, data }) {
    const response = await this.request({
      method: 'POST',
      action: 'activate_test',
      routeParams: id,
      data,
    });
    return response.data;
  },
  async closeTest({ id, data }) {
    const response = await this.request({
      method: 'POST',
      action: 'close_test',
      routeParams: id,
      data,
    });
    return response.data;
  },
  activeTest({ id }) {
    return client({
      url: this.getUrlFunction('active_test')(id),
      method: 'GET',
    }).then(response => response.data);
  },
  async lastUnitTest({ id }) {
    const response = await this.request({ action: 'last_unit_test', routeParams: id });
    return response.data;
  },
});
