const coreApp = require('kolibri');
const RecentReportResourceConstructor = require('../../apiResources/recentReport');
const coreActions = require('kolibri.coreVue.vuex.actions');
const Constants = require('../../constants');

const RecentReportResource = new RecentReportResourceConstructor(coreApp);
const ChannelResource = coreApp.resources.ChannelResource;

// ================================
// RECENT ACTIONS

function showChannelSelect(store, classID) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_RECENT_PAGE);
  const channelPromise = ChannelResource.getCollection();
  channelPromise.fetch().then(
    channels => {
      const pageState = {
        subPageName: Constants.PageNames.COACH_RECENT_PAGE_CHANNEL_SELECT,
        channels,
        class_id: classID,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', 'Recents');
    },
    error => { coreActions.handleApiError(store, error); }
  );
}
function showReports(store, classID, channelID) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_RECENT_PAGE);

  // should be cached if navigated to this point
  const channelPromise = ChannelResource.getModel(channelID).fetch();

  channelPromise.then(
    channelData => {
      const reportPayload = {
        channel_id: channelID,
        content_node_id: channelData.root_pk,
        collection_kind: Constants.UserScopes.CLASSROOM,
        collection_id: classID,
      };
      const recentReportsPromise = RecentReportResource.getCollection(reportPayload).fetch();

      recentReportsPromise.then(
        reports => {
          const pageState = {
            reports,
            class_id: classID,
            channel_id: channelID,
          };
          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', 'Recents');
        },
        error => { coreActions.handleApiError(store, error); }
      );
    },
  error => { coreActions.handleApiError(store, error); }
  );
}

module.exports = {
  showChannelSelect,
  showReports,
};
