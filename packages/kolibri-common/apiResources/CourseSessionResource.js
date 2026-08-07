import { Resource } from 'kolibri/apiResource';
import client from 'kolibri/client';

export default new Resource({
  name: 'coursesession',
  activateTest({ id, data }) {
    return client({
      url: this.getUrlFunction('activate_test')(id),
      method: 'POST',
      data: data,
    }).then(response => response.data);
  },
  async activateTest_v2({ id, data }) {
    const response = await this.request({
      method: 'POST',
      action: 'activate_test',
      routeParams: id,
      data,
    });
    return response.data;
  },
  closeTest({ id, data }) {
    return client({
      url: this.getUrlFunction('close_test')(id),
      method: 'POST',
      data: data,
    }).then(response => response.data);
  },
  async closeTest_v2({ id, data }) {
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
  lastUnitTest({ id }) {
    return client({
      url: this.getUrlFunction('last_unit_test')(id),
      method: 'GET',
    }).then(response => response.data);
  },
  async lastUnitTest_v2({ id }) {
    const response = await this.request({ action: 'last_unit_test', routeParams: id });
    return response.data;
  },
});
