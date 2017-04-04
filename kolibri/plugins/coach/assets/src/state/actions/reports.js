const values = require('lodash.values');

const coreApp = require('kolibri');
const coreActions = require('kolibri.coreVue.vuex.actions');
const logging = require('kolibri.lib.logging');
const router = require('kolibri.coreVue.router');
const getDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');

const Constants = require('../../constants');
const ContentNodeKinds = require('kolibri.coreVue.vuex.constants').ContentNodeKinds;
const ReportConstants = require('../../reportConstants');

const RecentReportResourceConstructor = require('../../apiResources/recentReport');
const ContentReportResourceConstructor = require('../../apiResources/contentReport');
const UserReportResourceConstructor = require('../../apiResources/userReport');
const UserSummaryResourceConstructor = require('../../apiResources/userSummary');
const ContentSummaryResourceConstructor = require('../../apiResources/contentSummary');

const UserSummaryResource = new UserSummaryResourceConstructor(coreApp);
const UserReportResource = new UserReportResourceConstructor(coreApp);
const ContentSummaryResource = new ContentSummaryResourceConstructor(coreApp);
const RecentReportResource = new RecentReportResourceConstructor(coreApp);
const ContentReportResource = new ContentReportResourceConstructor(coreApp);

const ChannelResource = coreApp.resources.ChannelResource;
const FacilityUserResource = coreApp.resources.FacilityUserResource;


// helper function for showRecent, provides list of channels with recent activity
function _showRecentChannels(store, classId) {
  function __getChannelLastActive(channel) {
    // helper function for _showRecentChannels
    // @param channel to get recentActivity for
    // @returns promise that resolves channel with lastActive value in object:
    // {
    //   'channelId': {
    //     amount: 'int',
    //     measure: 'month or day',
    //   },
    // }
    function ___timePassedSince(lastActiveTime) {
      // helper function for __getChannelLastActive
      // @param lastActiveTime --  date in string format
      // @returns object representing time passed since input in days or months:
      // {
      //   amount: 'int',
      //   measure: 'month or day',
      // }
      const dayMeasure = (ms) => Math.round(ms / (8.64e+7));
      const monthMeasure = (ms) => Math.round(ms / (2.628e+9));

      const currentDate = new Date();
      const lastActiveDate = new Date(lastActiveTime);
      // subtracting dates returns time interval in milliseconds
      const millisecondsEllapsed = currentDate - lastActiveDate;

      const monthsAgo = monthMeasure(millisecondsEllapsed);
      // returns months amount of days has surpassed a month
      if (monthsAgo) {
        return {
          amount: monthsAgo,
          measure: 'month',
          raw: millisecondsEllapsed,
        };
      }
      // and days otherwise
      return {
        amount: dayMeasure(millisecondsEllapsed),
        measure: 'day',
        raw: millisecondsEllapsed,
      };
    }
    const summaryPayload = {
      channel_id: channel.id,
      collection_kind: ReportConstants.UserScopes.FACILITY,
      collection_id: store.state.core.session.facility_id,
    };

    // workaround for conditionalPromise.then() misbehaving
    return new Promise(
      (resolve, reject) => {
        const getSumm = ContentSummaryResource.getModel(channel.root_id, summaryPayload).fetch();
        getSumm.then(
          channelSummary => {
            const channelLastActive = {};
            channelLastActive[channel.id] = ___timePassedSince(channelSummary.last_active);
            resolve(channelLastActive);
          },
          error => reject(error)
        );
      }
    );
  }

  const channelLastActivePromises = [];

  store.state.core.channels.list.forEach(
    channel => {
      channelLastActivePromises.push(__getChannelLastActive(channel));
    }
  );

  Promise.all(channelLastActivePromises).then(
    allChannelLastActive => {
      const lastActive = {};

      allChannelLastActive.forEach(
        channelLastActive => {
          Object.assign(lastActive, channelLastActive);
        }
      );

      const pageState = {
        lastActive,
        classId,
      };

      store.dispatch('SET_PAGE_STATE', pageState);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      store.dispatch('CORE_SET_ERROR', null);
    }
  );
}


function _showRecentReports(store, classId, channelId) {
  // should be cached if navigated to this point
  const channelPromise = ChannelResource.getModel(channelId).fetch();
  function __reportPropsGen(report) {
    function ___descriptor(kind) {
      switch (kind) {
        case ContentNodeKinds.AUDIO:
          return 'Listened';
        case ContentNodeKinds.DOCUMENT:
          return 'Opened';
        case ContentNodeKinds.VIDEO:
          return 'Watched';
        case ContentNodeKinds.EXERCISE:
          return 'Mastered';
        case ContentNodeKinds.HTML5:
          return 'Mastered';
        default:
          return 'Mastered';
      }
    }
    const progress = report.progress[0];
    const completed = `${progress.log_count_complete} / ${progress.log_count_total}`;
    const descriptor = ___descriptor(report.kind);

    return {
      completed,
      descriptor,
    };
  }
  channelPromise.then(
    channelData => {
      const sevenDaysAgo = new Date();
      // this is being set by default in the backend
      // backend date data might be unreliable, though
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const reportPayload = {
        channel_id: channelId,
        content_node_id: channelData.root_pk,
        collection_kind: ReportConstants.UserScopes.CLASSROOM,
        collection_id: classId,
        last_active_time: sevenDaysAgo,
      };
      const recentReportsPromise = RecentReportResource.getCollection(reportPayload).fetch();

      recentReportsPromise.then(
        reports => {
          // add progressProps to each report, for string generation
          reports.forEach(
            report => {
              report.reportProps = __reportPropsGen(report);
            }
          );

          // sort the reports in order of most recent
          // might want to put this together with the above loop
          reports.sort(
            (report1, report2) => {
              const report1Date = new Date(report1.last_active);
              const report2Date = new Date(report2.last_active);

              if (report1Date < report2Date) {
                return -1;
              } else if (report1Date > report2Date) {
                return 1;
              }
              return 0;
            }
          );

          const pageState = {
            reports,
            classId,
            channelId,
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


function showRecent(store, classId, channelId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.RECENT);
  // Handled by coach index
  // store.dispatch('CORE_SET_TITLE', 'Coach Recents');

  if (channelId) {
    _showRecentReports(store, classId, channelId);
  } else {
    _showRecentChannels(store, classId);
  }
}


function redirectToChannelReport(store, params) {
  const channelId = params.channel_id;
  const channelListPromise = ChannelResource.getCollection().fetch();

  ConditionalPromise.all([channelListPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([channelList]) => {
      if (!(channelList.some((channel) => channel.id === channelId))) {
        router.getInstance().replace({ name: Constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      coreActions.setChannelInfo(store, channelId).then(
        () => {
          router.getInstance().replace({ name: Constants.PageNames.REPORTS_NO_QUERY });
        }
      );
    },
    error => {
      coreActions.handleError(store, error);
    }
  );
}


function redirectToDefaultReport(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.REPORTS_NO_QUERY);

  const channelListPromise = ChannelResource.getCollection().fetch();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();

  ConditionalPromise.all([channelListPromise, facilityIdPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([channelList, facilityId]) => {
      // If no channels exist
      if (channelList.length === 0) {
        router.getInstance().replace({ name: Constants.PageNames.CONTENT_UNAVAILABLE });
        return;
      }
      /* get current channelId */
      const channelId = getDefaultChannelId(channelList);

      /* get contentScopeId for root */
      const contentScopeId = channelList.find((channel) => channel.id === channelId).root_pk;

      /* get userScopeId for facility */
      const userScopeId = facilityId[0];
      router.getInstance().replace({
        name: Constants.PageNames.REPORTS,
        params: {
          channel_id: channelId,
          content_scope: ReportConstants.ContentScopes.ROOT,
          content_scope_id: contentScopeId,
          user_scope: ReportConstants.UserScopes.FACILITY,
          user_scope_id: userScopeId,
          all_or_recent: ReportConstants.AllOrRecent.ALL,
          view_by_content_or_learners: ReportConstants.ViewBy.CONTENT,
          sort_column: ReportConstants.TableColumns.NAME,
          sort_order: ReportConstants.SortOrders.NONE,
        },
      });
    },

    error => {
      coreActions.handleError(store, error);
    }
  );
}


/* find the keys that differ between the old and new params */
function _diffKeys(newParams, oldParams) {
  if (!oldParams) {
    return Object.keys(newParams);
  }
  const diffKeys = [];
  Object.entries(newParams).forEach(([key, value]) => {
    if (oldParams[key] !== value) {
      diffKeys.push(key);
    }
  });
  return diffKeys;
}


function showReport(store, params, oldParams) {
  /* get params from url. */
  const channelId = params.channel_id;
  const contentScope = params.content_scope;
  const contentScopeId = params.content_scope_id;
  const userScope = params.user_scope;
  const userScopeId = params.user_scope_id;
  const allOrRecent = params.all_or_recent;
  const viewByContentOrLearners = params.view_by_content_or_learners;
  const sortColumn = params.sort_column;
  const sortOrder = params.sort_order;


  /* check if params are semi-valid. */
  if (!(values(Constants.ContentScopes).includes(contentScope)
    && values(Constants.UserScopes).includes(userScope)
    && values(Constants.AllOrRecent).includes(allOrRecent)
    && values(Constants.ViewBy).includes(viewByContentOrLearners)
    && values(Constants.TableColumns).includes(sortColumn)
    && values(Constants.SortOrders).includes(sortOrder))) {
    /* if invalid params, just throw an error. */
    coreActions.handleError(store, 'Invalid report parameters.');
    return;
  }

  const diffKeys = _diffKeys(params, oldParams);

  store.dispatch('SET_PAGE_NAME', Constants.PageNames.REPORTS);

  // these don't require updates from the server
  const localUpdateParams = ['sort_column', 'sort_order'];
  if (diffKeys.every(key => localUpdateParams.includes(key))) {
    store.dispatch('SET_SORT_COLUMN', sortColumn);
    store.dispatch('SET_SORT_ORDER', sortOrder);
    return;
  }

  const promises = [];

  const reportPayload = {
    channel_id: channelId,
    content_node_id: contentScopeId,
    collection_kind: userScope,
    collection_id: userScopeId,
  };

  // REPORT
  let reportPromise;
  if (!(userScope === Constants.UserScopes.USER &&
    contentScope === Constants.ContentScopes.CONTENT)) {
    if (allOrRecent === Constants.AllOrRecent.RECENT) {
      reportPromise = RecentReportResource.getCollection(reportPayload).fetch();
    } else if (viewByContentOrLearners === Constants.ViewBy.CONTENT) {
      reportPromise = ContentReportResource.getCollection(reportPayload).fetch();
    } else if (viewByContentOrLearners === Constants.ViewBy.LEARNERS) {
      reportPromise = UserReportResource.getCollection(reportPayload).fetch();
    } else {
      logging.error('unhandled input parameters');
    }
  }

  promises.push(reportPromise);


  // CONTENT SUMMARY
  const contentPromise = ContentSummaryResource.getModel(contentScopeId, reportPayload).fetch();
  promises.push(contentPromise);

  // USER SUMMARY
  let userPromise;
  if (userScope === Constants.UserScopes.USER) {
    userPromise = UserSummaryResource.getModel(userScopeId, reportPayload).fetch();
  }
  promises.push(userPromise);

  // CHANNELS
  const channelPromise = coreActions.setChannelInfo(store);
  promises.push(channelPromise);

  // API response handlers
  Promise.all(promises).then(([report, contentSummary, userSummary]) => {
    // save URL params to store
    store.dispatch('SET_CHANNEL_ID', channelId);
    store.dispatch('SET_CONTENT_SCOPE', contentScope);
    store.dispatch('SET_CONTENT_SCOPE_ID', contentScopeId);
    store.dispatch('SET_USER_SCOPE', userScope);
    store.dispatch('SET_USER_SCOPE_ID', userScopeId);
    store.dispatch('SET_ALL_OR_RECENT', allOrRecent);
    store.dispatch('SET_VIEW_BY_CONTENT_OR_LEARNERS', viewByContentOrLearners);
    store.dispatch('SET_SORT_COLUMN', sortColumn);
    store.dispatch('SET_SORT_ORDER', sortOrder);

    // save results of API request
    store.dispatch('SET_TABLE_DATA', report || {});
    store.dispatch('SET_CONTENT_SCOPE_SUMMARY', contentSummary);
    store.dispatch('SET_USER_SCOPE_SUMMARY', userSummary || {});
    store.dispatch('CORE_SET_PAGE_LOADING', false);

    const titleElems = ['Coach Reports'];
    if (userScope === Constants.UserScopes.USER) {
      titleElems.push(`${userSummary.full_name}`);
    } else if (userScope === Constants.UserScopes.FACILITY) {
      titleElems.push('All learners');
    }
    titleElems.push(`${contentSummary.title}`);
    if (allOrRecent === Constants.AllOrRecent.RECENT) {
      titleElems.push('Recent');
    } else if (viewByContentOrLearners === Constants.ViewBy.CONTENT) {
      titleElems.push('Contents');
    } else if (viewByContentOrLearners === Constants.ViewBy.LEARNERS) {
      titleElems.push('Learners');
    }
    store.dispatch('CORE_SET_TITLE', titleElems.join(' - '));
  },
    error => { coreActions.handleError(store, error); }
  );
}


function showTopics(store) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.TOPICS);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}


function showLearners(store) {
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.LEARNERS);
  store.dispatch('CORE_SET_PAGE_LOADING', false);
}


module.exports = {
  showRecent,
  redirectToChannelReport,
  redirectToDefaultReport,
  showReport,
  showTopics,
  showLearners,
};
