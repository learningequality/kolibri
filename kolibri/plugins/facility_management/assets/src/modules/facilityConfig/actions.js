import { FacilityDatasetResource } from 'kolibri.resources';
import { defaultFacilityConfig, notificationTypes } from '../../constants';

export function saveFacilityConfig(store) {
  store.commit('CONFIG_PAGE_NOTIFY', null);
  const { facilityDatasetId, settings } = store.state;
  const resourceRequests = [
    FacilityDatasetResource.saveModel({
      id: facilityDatasetId,
      data: settings,
    }),
  ];
  return Promise.all(resourceRequests)
    .then(function onSuccess() {
      store.commit('CONFIG_PAGE_NOTIFY', notificationTypes.SAVE_SUCCESS);
      store.commit('CONFIG_PAGE_COPY_SETTINGS');
    })
    .catch(function onFailure() {
      store.commit('CONFIG_PAGE_NOTIFY', notificationTypes.SAVE_FAILURE);
      store.commit('CONFIG_PAGE_UNDO_SETTINGS_CHANGE');
    });
}

export function resetFacilityConfig(store) {
  store.commit('CONFIG_PAGE_MODIFY_ALL_SETTINGS', defaultFacilityConfig);
  return saveFacilityConfig(store);
}
