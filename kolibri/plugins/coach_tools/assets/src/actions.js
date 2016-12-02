const coreActions = require('kolibri.coreVue.vuex.actions');
const coreApp = require('kolibri');
const getDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const router = require('kolibri.coreVue.router');

const ChannelResource = require('kolibri').resources.ChannelResource;
const FacilityUserResource = require('kolibri').resources.FacilityUserResource;
const Constants = require('./state/constants');

const logging = require('kolibri.lib.logging');
const values = require('lodash.values');


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


function showCoachRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.COACH_ROOT);
}


function redirectToDefaultReport(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', Constants.PageNames.REPORTS_NO_QUERY);

  const channelListPromise = ChannelResource.getCollection({}).fetch();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();

  ConditionalPromise.all([channelListPromise, facilityIdPromise]).only(
    coreActions.samePageCheckGenerator(store),
    ([channelList, facilityId]) => {
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
          content_scope: Constants.ContentScopes.ROOT,
          content_scope_id: contentScopeId,
          user_scope: Constants.UserScopes.FACILITY,
          user_scope_id: userScopeId,
          all_or_recent: Constants.AllOrRecent.ALL,
          view_by_content_or_learners: Constants.ViewBy.CONTENT,
          sort_column: Constants.TableColumns.NAME,
          sort_order: Constants.SortOrders.NONE,
        },
      });
    },

    error => {
      coreActions.handleError(store, error);
    }
  );
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

  const resourcePromise = require('./resourcePromise');
  const URL_ROOT = '/coach/api';
  const promises = [];

  // REPORT
  if (userScope === Constants.UserScopes.USER && contentScope === Constants.ContentScopes.CONTENT) {
    promises.push([]); // don't retrieve a report for a single-user, single-item page
  } else {
    let reportUrl = `${URL_ROOT}/${channelId}/${contentScopeId}/${userScope}/${userScopeId}`;
    if (allOrRecent === Constants.AllOrRecent.RECENT) {
      reportUrl += '/recentreport/';
    } else if (viewByContentOrLearners === Constants.ViewBy.CONTENT) {
      reportUrl += '/contentreport/';
    } else if (viewByContentOrLearners === Constants.ViewBy.LEARNERS) {
      reportUrl += '/userreport/';
    } else {
      logging.error('unhandled input parameters');
    }
    promises.push(resourcePromise(reportUrl));
  }


  // CONTENT SUMMARY
  const contentSummaryUrl =
    `${URL_ROOT}/${channelId}/${userScope}/${userScopeId}/contentsummary/${contentScopeId}/`;
  promises.push(resourcePromise(contentSummaryUrl));

  // USER SUMMARY
  if (userScope === Constants.UserScopes.USER) {
    const userSummaryUrl
      = `${URL_ROOT}/${channelId}/${contentScopeId}/usersummary/${userScopeId}/`;
    promises.push(resourcePromise(userSummaryUrl));
  } else {
    promises.push({}); // don't retrieve a summary for a group of users
  }

  // CHANNELS
  const channelPromise = coreActions.setChannelInfo(store, coreApp);
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
    store.dispatch('SET_TABLE_DATA', report);
    store.dispatch('SET_CONTENT_SCOPE_SUMMARY', contentSummary);
    store.dispatch('SET_USER_SCOPE_SUMMARY', userSummary);
    store.dispatch('CORE_SET_PAGE_LOADING', false);

    const titleElems = ['Coach Reports'];
    if (userScope === Constants.UserScopes.USER) {
      titleElems.push(`${userSummary.full_name}`);
    } else if (userScope === Constants.UserScopes.FACILITY) {
      titleElems.push('All Learners');
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

module.exports = {
  showCoachRoot,
  redirectToDefaultReport,
  showReport,
};
