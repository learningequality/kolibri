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
  closeTest({ id, data }) {
    return client({
      url: this.getUrlFunction('close_test')(id),
      method: 'POST',
      data: data,
    }).then(response => response.data);
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
});
