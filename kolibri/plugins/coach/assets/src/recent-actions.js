const coreApp = require('kolibri');
const RecentReportResourceConstructor = require('./apiResources/recentReport');
const coreActions = require('kolibri.coreVue.vuex.actions');
const Constants = require('./state/constants');

const RecentReportResource = new RecentReportResourceConstructor(coreApp);
const ChannelResource = coreApp.resources.ChannelResource;

// ================================
// RECENT ACTIONS

function showChannelSelect(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_RECENT_PAGE);
  const channelPromise = ChannelResource.getCollection();
  channelPromise.fetch().then(
    (channels) => {
      const pageState = {
        subPageName: Constants.PageNames.COACH_RECENT_PAGE_CHANNEL_SELECT,
        channels,
        classID: params.classID,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', 'Recents');
    },
    error => { coreActions.handleApiError(store, error); }
  );
}
function showReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_RECENT_PAGE);

  const channelPayload = {
    channel_id: params.channelID,
  };

  // should be cached if navigated to this point
  const channelPromise = ChannelResource.getModel(channelPayload).fetch();

  channelPromise.then(
    channelData => {
      const reportPayload = {
        channel_id: params.channelID,
        content_node_id: channelData.root_pk,
        collection_kind: Constants.UserScopes.CLASSROOM,
        collection_id: params.classID,
      };
      const recentReportsPromise = RecentReportResource.getCollection(reportPayload).fetch();

      recentReportsPromise.then(
        (reports) => {
          const pageState = {
            reports,
            class_id: params.classID,
            channel_id: params.channelID,
          };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', 'Recents');
        },
        error => { coreActions.handleApiError(store, error); }
      );
    },
    error => {

    }
  );
}

module.exports = {
  showChannelSelect,
  showReports,
};
