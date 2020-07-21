import client from 'kolibri.client';
import urls from 'kolibri.urls';

const url = urls['kolibri:core:devicesettings']();

export function getDeviceSettings() {
  return client({ url }).then(({ data }) => {
    return {
      languageId: data.language_id,
      landingPage: data.landing_page,
      allowGuestAccess: data.allow_guest_access,
      allowLearnerUnassignedResourceAccess: data.allow_learner_unassigned_resource_access,
      allowPeerUnlistedChannelImport: data.allow_peer_unlisted_channel_import,
      allowOtherBrowsersToConnect: data.allow_other_browsers_to_connect,
    };
  });
}

// PATCH to /api/device/devicesettings with a new settings
export function saveDeviceSettings(settings) {
  return client({
    url,
    method: 'PATCH',
    data: {
      language_id: settings.languageId,
      landing_page: settings.landingPage,
      allow_guest_access: settings.allowGuestAccess,
      allow_learner_unassigned_resource_access: settings.allowLearnerUnassignedResourceAccess,
      allow_peer_unlisted_channel_import: settings.allowPeerUnlistedChannelImport,
      allow_other_browsers_to_connect: settings.allowOtherBrowsersToConnect,
    },
  });
}
