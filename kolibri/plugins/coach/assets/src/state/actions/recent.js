const coreApp = require('kolibri');
const RecentReportResourceConstructor = require('../../apiResources/recentReport');
const coreActions = require('kolibri.coreVue.vuex.actions');
const Constants = require('../../constants');
const ReportConstants = require('../../reportConstants');

const RecentReportResource = new RecentReportResourceConstructor(coreApp);
const ChannelResource = coreApp.resources.ChannelResource;


function _showChannels(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);
  const channelPromise = ChannelResource.getCollection();
  channelPromise.fetch().then(
    channels => {
      const pageState = {
        channels,
        classId,
      };
      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
      store.dispatch('CORE_SET_TITLE', 'Recents');
    },
    error => { coreActions.handleApiError(store, error); }
  );
}

function _showReports(store, classId, channelID) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);

  // should be cached if navigated to this point
  const channelPromise = ChannelResource.getModel(channelID).fetch();

  channelPromise.then(
    channelData => {
      const reportPayload = {
        channel_id: channelID,
        content_node_id: channelData.root_pk,
        collection_kind: ReportConstants.UserScopes.CLASSROOM,
        collection_id: classId,
      };
      const recentReportsPromise = RecentReportResource.getCollection(reportPayload).fetch();

      recentReportsPromise.then(
        reports => {
          const pageState = {
            reports,
            classId,
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

function show(store, classId, channelID) {
  if (channelID) {
    _showReports(store, classId, channelID);
  } else {
    _showChannels(store, classId);
  }
}

module.exports = {
  show,
};
