import isEqual from 'lodash/isEqual';
import pickBy from 'lodash/pickBy';
import client from 'kolibri/client';
import urls from 'kolibri/urls';

const url = urls['kolibri:core:devicesettings']();

const _dataCache = {};

export function getDeviceSettings() {
  return client({ url }).then(({ data }) => {
    Object.assign(_dataCache, data);
    return {
      languageId: data.language_id,
      landingPage: data.landing_page,
      allowGuestAccess: data.allow_guest_access,
      allowLearnerUnassignedResourceAccess: data.allow_learner_unassigned_resource_access,
      allowPeerUnlistedChannelImport: data.allow_peer_unlisted_channel_import,
      allowOtherBrowsersToConnect: data.allow_other_browsers_to_connect,
      extraSettings: {
        // Destructure the extra_settings object
        // to ensure we are returning a novel object
        // from the one stored in the _dataCache
        ...data.extra_settings,
      },
      primaryStorageLocation: data.primary_storage_location,
      // Spread the secondary storage locations array to ensure
      // we are returning a novel array from the one stored in the _dataCache
      secondaryStorageLocations: [...data.secondary_storage_locations],
    };
  });
}

// PATCH to /api/device/devicesettings with a new settings
export function saveDeviceSettings(settings) {
  const serverSettings = {
    language_id: settings.languageId,
    landing_page: settings.landingPage,
    allow_guest_access: settings.allowGuestAccess,
    allow_learner_unassigned_resource_access: settings.allowLearnerUnassignedResourceAccess,
    allow_peer_unlisted_channel_import: settings.allowPeerUnlistedChannelImport,
    allow_other_browsers_to_connect: settings.allowOtherBrowsersToConnect,
    extra_settings: settings.extraSettings,
    primary_storage_location: settings.primaryStorageLocation,
    secondary_storage_locations: settings.secondaryStorageLocations,
  };
  const data = pickBy(serverSettings, (value, key) => !isEqual(value, _dataCache[key]));
  if (Object.keys(data).length === 0) {
    return Promise.resolve(false);
  }
  return client({
    url,
    method: 'PATCH',
    data,
  }).then(response => {
    Object.assign(_dataCache, response.data); // Update the cache
    return true;
  });
}

export function getDeviceURLs() {
  return client({ url: urls['kolibri:core:deviceinfo']() }).then(response => {
    return {
      deviceUrls: response.data.urls,
    };
  });
}

export function getPathPermissions(path) {
  return client({
    url: `${urls['kolibri:core:pathpermission']()}`,
    params: { path },
  });
}

export function getPathsPermissions(paths) {
  const pathsInfo = [];
  for (const path of paths) {
    getPathPermissions(path).then(permissions => {
      pathsInfo.push({ path, writable: permissions.data.writable });
    });
  }
  return pathsInfo;
}
