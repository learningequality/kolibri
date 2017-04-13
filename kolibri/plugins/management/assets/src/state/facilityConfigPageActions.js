/* eslint-disable prefer-arrow-callback */
const {
  FacilityResource,
  FacilityDatasetResource,
} = require('kolibri').resources;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const preparePage = require('./preparePage');
const { PageNames } = require('../constants');

// When app is installed, the Facility is assigned id of `1`.
// Hardcoded here for now.
const FACILITY_ID = 1;

function showFacilityConfigPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.FACILITY_CONFIG_PAGE,
    title: 'Configure Facility',
  });
  const resourceRequests = [
    FacilityResource.getModel(FACILITY_ID),
    FacilityDatasetResource.getCollection({ facility_id: FACILITY_ID }),
  ];
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  return ConditionalPromise.all(resourceRequests)
  .only(
    () => true,
    function onSuccess([facility, facilityDataset]) {
      store.dispatch('SET_PAGE_STATE', {
        facilityName: facility.name,
        settings: facilityDataset[0],
        notification: {},
      });
    },
    function onFailure() {
      return '';
    }
  );
}

module.exports = {
  showFacilityConfigPage,
};
