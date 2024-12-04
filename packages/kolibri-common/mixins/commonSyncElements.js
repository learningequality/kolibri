import client from 'kolibri/client';
import urls from 'kolibri/urls';
import TaskResource from 'kolibri/apiResources/TaskResource';
import { createTranslator } from 'kolibri/utils/i18n';

// Strings that might be shared among syncing-related UIs across plugins.
// See taskStrings mixin for strings relating to the Facility-Syncing Async Task.
const syncStrings = createTranslator('CommonSyncStrings', {
  selectSourceTitle: {
    message: 'Select a source',
    context: 'Title of menu where the user selects the source from where to import a facility',
  },
  selectNetworkAddressTitle: {
    message: 'Select device',
    context:
      'Title of menu where user selects a device at an device in order to communicate with it',
  },
  newAddressTitle: {
    message: 'New device',
    context:
      'Title of the menu where the user manually adds a new device device from where to import a facility',
  },
  addNewAddressAction: {
    message: 'Add new device',
    context: 'Label for a button that opens a menu to save a new device.',
  },
  selectFacilityTitle: {
    message: 'Select learning facility',
    context:
      'Title of the modal window where the user selects a facility to import from the source device, if there are multiple facilities available to import.',
  },
  adminCredentialsTitle: {
    message: 'Enter admin credentials',
    context: 'Title of the menu where the user provides credentials before importing a facility.',
  },
  nameWithIdFragment: {
    message: '{name} ({id})',
    context:
      'Template for strings of the form "Name (1234)"\nDO NOT TRANSLATE\nCopy the source string.',
  },
  importFacilityAction: {
    message: 'Import learning facility',
    context: 'Label for a button used to import a facility on the device',
  },
  distinctFacilityNameExplanation: {
    message:
      "This facility is different from '{facilities}'. These facilities will not be synced with each other.",

    context:
      'When two facilities have the same name but different IDs, they will just sync in parallel and not be integrated with each other in any way.',
  },
  warningFirstImportedIsSuperuser: {
    message:
      'Please note: The first user you choose to import will be given super admin permissions on this device, and be able to manage all channels and device settings.',
    context:
      'A note at the top of the page for importing a user explaining that the first user imported will be given the permissions of a superuser',
  },
  howAreYouUsingKolibri: {
    message: 'How are you using Kolibri?',
    context: 'Page title for the device setup step.',
  },
  onMyOwn: {
    message: 'For homeschooling and other personal use.',
    context: "Option description text for 'Quick start'.",
  },
  changeLater: {
    message: 'You can change this in your learning facility settings later.',
    context: '',
  },
  superAdminPermissionsDescription: {
    message:
      'This super admin account allows you to manage all facilities, resources, and users on this device.',
    context: 'Explanation of what the super admin account is used for on device.',
  },
  devicesUnreachable: {
    message: 'Some devices are not responding. Please check the connection and try again.',
    context:
      "Error message that displays when some devices aren't reachable and their selection is disabled",
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
    fetchNetworkLocationFacilities(locationId) {
      return client({
        url: urls['kolibri:core:networklocation_facilities_detail'](locationId),
      })
        .then(response => {
          return response.data;
        })
        .catch(() => {
          return [];
        });
    },
    startKdpSyncTask(facility) {
      return TaskResource.startTask({ type: 'kolibri.core.auth.tasks.dataportalsync', facility });
    },
    startPeerSyncTask({ facility, device_id }) {
      return TaskResource.startTask({
        type: 'kolibri.core.auth.tasks.peerfacilitysync',
        facility,
        device_id,
      });
    },
    startPeerImportTask({ facility, username, facility_name, password, device_id }) {
      return TaskResource.startTask({
        type: 'kolibri.core.auth.tasks.peerfacilityimport',
        device_id,
        facility,
        facility_name,
        username,
        password,
      });
    },
  },
};
