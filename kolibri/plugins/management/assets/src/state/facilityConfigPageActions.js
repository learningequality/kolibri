const preparePage = require('./preparePage');
const { PageNames } = require('../constants');

function showFacilityConfigPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.FACILITY_CONFIG_PAGE,
    title: 'Configure Facility',
  });
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

module.exports = {
  showFacilityConfigPage,
};
