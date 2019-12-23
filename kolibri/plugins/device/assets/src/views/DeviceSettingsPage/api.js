import client from 'kolibri.client';
import urls from 'kolibri.urls';

const path = urls['kolibri:core:devicesettings']();

export function getDeviceSettings() {
  return client({ path }).then(({ entity }) => {
    return {
      languageId: entity.language_id,
      landingPage: entity.landing_page,
      allowGuestAccess: entity.allow_guest_access,
      allowLearnerUnassignedResourceAccess: entity.allow_learner_unassigned_resource_access,
      allowPeerUnlistedChannelImport: entity.allow_peer_unlisted_channel_import,
    };
  });
}

// PATCH to /api/device/devicesettings with a new settings
export function saveDeviceSettings(settings) {
  return client({
    path,
    method: 'PATCH',
    entity: {
      language_id: settings.languageId,
      landing_page: settings.landingPage,
      allow_guest_access: settings.allowGuestAccess,
      allow_learner_unassigned_resource_access: settings.allowLearnerUnassignedResourceAccess,
      allow_peer_unlisted_channel_import: settings.allowPeerUnlistedChannelImport,
    },
  });
}
