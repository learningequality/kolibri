import client from 'kolibri.client';
import urls from 'kolibri.urls';
import { StaticNetworkLocationResource, FacilityTaskResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

// Strings that might be shared among syncing-related UIs across plugins.
// See taskStrings mixin for strings relating to the Facility-Syncing Async Task.
const syncStrings = createTranslator('CommonSyncStrings', {
  selectSourceTitle: {
    message: 'Select a source',
    context: 'Title of menu where the user selects the source from where to import a facility',
  },
  selectNetworkAddressTitle: {
    message: 'Select network address',
    context:
      'Title of menu where user selects a device at an address in order to communicate with it',
  },
  newAddressTitle: {
    message: 'New address',
    context:
      'Title of the menu where the user manually adds a new device address from where to import a facility',
  },
  addNewAddressAction: {
    message: 'Add new address',
    context: 'Label for a button that open menu to save a new network address',
  },
  selectFacilityTitle: {
    message: 'Select facility',
    context:
      'Title of the modal window where the user selects a facility to import from the source device',
  },
  adminCredentialsTitle: {
    message: 'Enter admin credentials',
    context: 'Title of the menu where the user provides credentials before importing facility',
  },
  nameWithIdFragment: {
    message: '{name} ({id})',
    context: 'Template for strings of the form "Name (1234)"',
  },
  importFacilityAction: {
    message: 'Import facility',
    context: 'Label for a button used to import a facility on the device',
  },
  distinctFacilityNameExplanation: {
    message:
      "This facility is different from '{facilities}'. These facilities will not be synced with each other.",

    context:
      'When two facilities have the same name but different IDs, they will just sync in parallel and not be integrated with each other in any way.',
  },
});

export default {
  methods: {
    getCommonSyncString(...args) {
      return syncStrings.$tr(...args);
    },
    formatNameAndId(name, id) {
      // TODO switch to using the last 4 characters
      return this.getCommonSyncString('nameWithIdFragment', { name, id: id.slice(0, 4) });
    },
    createStaticNetworkLocation({ base_url, device_name }) {
      return StaticNetworkLocationResource.createModel({
        base_url,
        nickname: device_name,
      }).save();
    },
    fetchNetworkLocationFacilities(locationId) {
      return client({
        url: urls['kolibri:core:networklocation_facilities-detail'](locationId),
      })
        .then(response => {
          return response.data;
        })
        .catch(() => {
          return [];
        });
    },
    startKdpSyncTask({ id, name }) {
      return FacilityTaskResource.dataportalsync({ id, name }).then(response => {
        return response.data;
      });
    },
    startPeerSyncTask(data) {
      return FacilityTaskResource.startpeerfacilitysync(data).then(response => {
        return response.data;
      });
    },
    startPeerImportTask(data) {
      const { facility, facility_name, baseurl, username, password, device_name, device_id } = data;
      return FacilityTaskResource.startpeerfacilityimport({
        device_name,
        device_id,
        facility,
        facility_name,
        baseurl,
        username,
        password,
      }).then(response => {
        return response.data;
      });
    },
  },
};
