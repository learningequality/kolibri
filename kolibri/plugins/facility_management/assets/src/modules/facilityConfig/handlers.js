import { FacilityResource, FacilityDatasetResource } from 'kolibri.resources';
import { convertKeysToCamelCase } from 'kolibri.coreVue.vuex.mappers';
import { PageNames, notificationTypes } from '../../constants';

export function showFacilityConfigPage(store) {
  const FACILITY_ID = store.state.core.session.facility_id;
  store.dispatch('preparePage', {
    name: PageNames.FACILITY_CONFIG_PAGE,
  });
  const resourceRequests = [
    FacilityResource.fetchModel({ id: FACILITY_ID }),
    FacilityDatasetResource.fetchCollection({ getParams: { facility_id: FACILITY_ID } }),
  ];

  return Promise.all(resourceRequests)
    .then(function onSuccess([facility, facilityDatasets]) {
      const dataset = facilityDatasets[0]; // assumes for now is only one facility being managed
      store.commit('facilityConfig/SET_STATE', {
        facilityDatasetId: dataset.id,
        facilityName: facility.name,
        // this part of state is mutated as user interacts with form
        settings: convertKeysToCamelCase(dataset),
        // this copy is kept for the purpose of undoing if save fails
        settingsCopy: convertKeysToCamelCase(dataset),
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
