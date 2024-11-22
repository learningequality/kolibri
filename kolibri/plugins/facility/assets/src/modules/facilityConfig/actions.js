import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';

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
    },
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
  const { facilityDatasetId } = store.state;
  return client({
    url: urls['kolibri:core:facilitydataset_resetsettings'](facilityDatasetId),
    method: 'POST',
  }).then(({ data }) => {
    store.commit('CONFIG_PAGE_MODIFY_ALL_SETTINGS', {
      learner_can_edit_username: data.learner_can_edit_username,
      learner_can_edit_name: data.learner_can_edit_name,
      learner_can_edit_password: data.learner_can_edit_password,
      learner_can_sign_up: data.learner_can_sign_up,
      learner_can_delete_account: data.learner_can_delete_account,
      learner_can_login_with_no_password: data.learner_can_login_with_no_password,
      show_download_button_in_learn: data.show_download_button_in_learn,
    });
  });
}

export function setPin(store, payload) {
  const { facilityDatasetId } = store.state;
  return client({
    url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId),
    method: 'POST',
    data: payload,
  }).then(({ data }) => {
    store.commit('UPDATE_FACILITY_EXTRA_SETTINGS', { extra_fields: data.extra_fields });
    saveFacilityConfig(store);
  });
}

export function unsetPin(store) {
  const { facilityDatasetId } = store.state;
  return client({
    url: urls['kolibri:core:facilitydataset_update_pin'](facilityDatasetId),
    method: 'PATCH',
  }).then(({ data }) => {
    store.commit('UPDATE_FACILITY_EXTRA_SETTINGS', { extra_fields: data.extra_fields });
    saveFacilityConfig(store);
  });
}

export function isPinValid(store, payload) {
  const { facilityDatasetId } = store.state;
  return client({
    url: urls['kolibri:core:ispinvalid'](facilityDatasetId),
    method: 'POST',
    data: payload,
  }).then(({ data }) => {
    store.commit('SET_IS_FACILITY_PIN_VALID', data.is_pin_valid);
  });
}
