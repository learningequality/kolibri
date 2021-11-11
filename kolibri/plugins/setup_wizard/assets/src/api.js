import { Resource } from 'kolibri.lib.apiResource';
import pickBy from 'lodash/pickBy';
import urls from 'kolibri.urls';
import redirectBrowser from 'kolibri.utils.redirectBrowser';
import clientFactory from 'kolibri.utils.clientFactory';

export const FacilityImportResource = new Resource({
  name: 'facilityimport',
  namespace: 'kolibri.plugins.setup_wizard',
  grantsuperuserpermissions({ user_id, password }) {
    return this.postListEndpoint('grantsuperuserpermissions', { user_id, password });
  },
  createsuperuser({ username, full_name, password }) {
    return this.postListEndpoint('createsuperuser', { username, full_name, password });
  },
  provisiondevice({ device_name, language_id }) {
    return this.postListEndpoint('provisiondevice', { device_name, language_id });
  },
  facilityadmins() {
    return this.getListEndpoint('facilityadmins').then(response => {
      return response.data;
    });
  },
  listfacilitylearners(params) {
    return this.postListEndpoint('listfacilitylearners', params).then(response => {
      return response.data;
    });
  },
});

export const SetupTasksResource = new Resource({
  name: 'tasks',
  namespace: 'kolibri.plugins.setup_wizard',
  // Use SetupTasksResource.fetchCollection to get tasks
  canceltask(task_id) {
    return this.postListEndpoint('canceltask', { task_id });
  },
  cleartasks() {
    return this.postListEndpoint('cleartasks');
  },
});

export const SetupSoUDTasksResource = new Resource({
  name: 'soudtasks',
  namespace: 'kolibri.plugins.setup_wizard',
  canceltask(task_id) {
    return this.postListEndpoint('canceltask', { task_id });
  },
  cleartasks() {
    return this.postListEndpoint('cleartasks');
  },
  /**
   * Params for to create a new task
   * @param {string} task - name of the task to be created
   * @param {object} params - should contain the parameters the task needs
   */
  createTask(task, params) {
    const args = { task: task, ...pickBy(params) };
    // use baseClient to  avoid interceptors from client:
    this.client = clientFactory();
    return this.postListEndpoint('list', args).then(response => {
      return response.data;
    });
  },
});

export const FinishSoUDSyncingResource = new Resource({
  name: 'restartzeroconf',
  namespace: 'kolibri.plugins.setup_wizard',
  finish() {
    const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';
    const device_url = urls['kolibri:kolibri.plugins.device:device_management'];
    window.sessionStorage.setItem(welcomeDimissalKey, false);
    this.postListEndpoint('restart');
    redirectBrowser(device_url ? device_url() : null);
    return '';
  },
});
