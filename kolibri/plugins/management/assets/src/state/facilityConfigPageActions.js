/* eslint-disable prefer-arrow-callback */
const CoreMappers = require('kolibri.coreVue.vuex.mappers');

const {
  FacilityResource,
  FacilityDatasetResource,
} = require('kolibri').resources;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const { samePageCheckGenerator } = require('kolibri.coreVue.vuex.actions');
const preparePage = require('./preparePage');
const { PageNames, defaultFacilityConfig, notificationTypes } = require('../constants');

// Utility that wraps the ubiquitous "don't resolve if not on same page" logic.
// The `_promise` property is accessed because the thenable returned by
// ConditionalPromise does not chain with `catch` in the expected way
function resolveOnlyIfOnSamePage(promises, store) {
  const ident = x => x;
  return ConditionalPromise.all(promises)
  .only(samePageCheckGenerator(store), ident, ident)._promise;
}

function showNotification(store, notificationType) {
  store.dispatch('CONFIG_PAGE_NOTIFY', notificationType);
}

function showFacilityConfigPage(store) {
  const FACILITY_ID = store.state.core.session.facility_id;
  preparePage(store.dispatch, {
    name: PageNames.FACILITY_CONFIG_PAGE,
    title: 'Configure Facility',
  });
  const resourceRequests = [
    FacilityResource.getModel(FACILITY_ID).fetch(),
    FacilityDatasetResource.getCollection({ facility_id: FACILITY_ID }).fetch(),
  ];

  return resolveOnlyIfOnSamePage(resourceRequests, store)
  .then(function onSuccess([facility, facilityDatasets]) {
    const dataset = facilityDatasets[0]; // assumes for now is only one facility being managed
    store.dispatch('SET_PAGE_STATE', {
      facilityDatasetId: dataset.id,
      facilityName: facility.name,
      // this part of state is mutated as user interacts with form
      settings: CoreMappers.convertKeysToCamelCase(dataset),
      // this copy is kept for the purpose of undoing if save fails
      settingsCopy: CoreMappers.convertKeysToCamelCase(dataset),
      notification: null
    });
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  })
  .catch(function onFailure(err) {
    store.dispatch('SET_PAGE_STATE', {
      facilityName: '',
      settings: null,
      notification: notificationTypes.PAGELOAD_FAILURE,
    });
    store.dispatch('CORE_SET_PAGE_LOADING', false);
  });
}

function saveFacilityConfig(store) {
  showNotification(store, null);
  const { facilityDatasetId, settings } = store.state.pageState;
  const resourceRequests = [
    FacilityDatasetResource
      .getModel(facilityDatasetId)
      .save(CoreMappers.convertKeysToSnakeCase(settings)),
  ];
  return resolveOnlyIfOnSamePage(resourceRequests, store)
  .then(function onSuccess(x) {
    showNotification(store, notificationTypes.SAVE_SUCCESS);
    store.dispatch('CONFIG_PAGE_COPY_SETTINGS');
  })
  .catch(function onFailure(err) {
    showNotification(store, notificationTypes.SAVE_FAILURE);
    store.dispatch('CONFIG_PAGE_UNDO_SETTINGS_CHANGE');
  });
}

function resetFacilityConfig(store) {
  store.dispatch('CONFIG_PAGE_MODIFY_ALL_SETTINGS', defaultFacilityConfig);
  return saveFacilityConfig(store);
}

module.exports = {
  resetFacilityConfig,
  saveFacilityConfig,
  showFacilityConfigPage,
};
