import { FacilityDatasetResource, FacilityResource } from 'kolibri.resources';

export function saveFacilityName(store, payload) {
  return FacilityResource.saveModel({
    id: payload.id,
    data: {
      name: payload.name,
    },
  }).then(
    facility => {
      // Refresh facility list to get new name
      store.dispatch('getFacilities', null, { root: true });
      store.commit('UPDATE_FACILITIES', {
        oldName: store.state.facilityName,
        newName: facility.name,
      });
      store.commit('FACILITY_NAME_SAVED', facility.name);
    },
    error => {
      store.commit('FACILITY_NAME_NOT_SAVED', error);
    }
  );
}

export function saveFacilityConfig(store) {
  const { facilityDatasetId, settings } = store.state;
  const resourceRequests = [
    FacilityDatasetResource.saveModel({
      id: facilityDatasetId,
      data: settings,
    }),
  ];
  return Promise.all(resourceRequests).then(function onSuccess() {
    store.commit('CONFIG_PAGE_COPY_SETTINGS');
  });
}

export function resetFacilityConfig(store) {
  store.commit('CONFIG_PAGE_MODIFY_ALL_SETTINGS', {
    learner_can_edit_username: true,
    learner_can_edit_name: true,
    learner_can_edit_password: true,
    learner_can_sign_up: true,
    learner_can_delete_account: true,
    learner_can_login_with_no_password: false,
    show_download_button_in_learn: false,
  });
  return saveFacilityConfig(store);
}
