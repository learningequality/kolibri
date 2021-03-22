import { Resource } from 'kolibri.lib.apiResource';

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
