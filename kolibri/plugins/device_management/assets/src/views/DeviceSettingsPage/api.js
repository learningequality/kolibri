import client from 'kolibri.client';
import urls from 'kolibri.urls';

const path = urls['kolibri:core:devicelanguage']();

export function getDeviceLanguageSetting() {
  return client({ path }).then(({ entity }) => {
    return entity.language_id;
  });
}

// PATCH to /api/device/devicelanguage with a new language ID
export function saveDeviceLanguageSetting(languageId) {
  return client({
    path,
    method: 'PATCH',
    entity: {
      language_id: languageId,
    },
  });
}
