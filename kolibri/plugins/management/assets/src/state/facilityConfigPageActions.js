/* eslint-disable prefer-arrow-callback */
const {
  FacilityResource,
  FacilityDatasetResource,
} = require('kolibri').resources;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const { samePageCheckGenerator } = require('kolibri.coreVue.vuex.actions');
const preparePage = require('./preparePage');
const { PageNames } = require('../constants');

// When app is installed, the Facility is assigned id of `1`.
// Hardcoded here for now.
const FACILITY_ID = 1;

function resolveOnlyIfOnSamePage(promises, store) {
  const ident = x => x;
  return ConditionalPromise.all(promises)
  .only(samePageCheckGenerator(store), ident, ident)._promise;
}

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
  return resolveOnlyIfOnSamePage(resourceRequests, store)
  .then(function onSuccess([facility, facilityDataset]) {
    store.dispatch('SET_PAGE_STATE', {
      facilityName: facility.name,
      settings: facilityDataset[0],
      // Need to see if we can distinguish between source of error
      errors: false,
    });
  })
  .catch(function onFailure(err) {
    store.dispatch('SET_PAGE_STATE', {
      facilityName: '',
      settings: {},
      errors: true,
    });
  });
}

module.exports = {
  showFacilityConfigPage,
};
