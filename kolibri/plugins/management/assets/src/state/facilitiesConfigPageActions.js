const preparePage = require('./preparePage');
const { PageNames } = require('../constants');

function showFacilitiesConfigPage(store) {
  preparePage(store.dispatch, {
    name: PageNames.FACILITIES_CONFIG_PAGE,
    title: 'Configure Facilities',
  });
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}

module.exports = {
  showFacilitiesConfigPage,
};
