import { FacilityResource, FacilityDatasetResource } from 'kolibri.resources';
import { notificationTypes } from '../../constants';

export function showFacilityConfigPage(store, toRoute) {
  const facilityId = toRoute.params.facility_id || store.getters.activeFacilityId;
  store.dispatch('preparePage');
  const resourceRequests = [
    FacilityResource.fetchModel({ id: facilityId }),
    FacilityDatasetResource.fetchCollection({ getParams: { facility_id: facilityId } }),
  ];

  return Promise.all(resourceRequests)
    .then(function onSuccess([facility, facilityDatasets]) {
      const dataset = facilityDatasets[0]; // assumes for now is only one facility being managed
      store.commit('facilityConfig/SET_STATE', {
        facilityDatasetId: dataset.id,
        facilityName: facility.name,
        // this part of state is mutated as user interacts with form
        settings: { ...dataset },
        // this copy is kept for the purpose of undoing if save fails
        settingsCopy: { ...dataset },
        notification: null,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    })
    .catch(function onFailure() {
      store.commit('facilityConfig/SET_STATE', {
        facilityName: '',
        settings: null,
        notification: notificationTypes.PAGELOAD_FAILURE,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    });
}
