const router = require('kolibri.coreVue.router');
const coreActions = require('kolibri.coreVue.vuex.actions');
const PageNames = require('./state/constants').PageNames;
const ReportsOptions = require('./state/constants').ReportsOptions;
// const UserSummaryResource = require('kolibri').resources.UserSummaryResource;
// const ContentSummaryResource = require('kolibri').resources.ContentSummaryResource;
// const UserReportResource = require('kolibri').resources.UserReportResource;
const ContentReportResource = require('kolibri').resources.ContentReportResource;
// const RecentReportResource = require('kolibri').resources.RecentReportResource;
const getDefaultChannelId = require('kolibri.coreVue.vuex.getters').getDefaultChannelId;
const ChannelResource = require('kolibri').resources.ChannelResource;
const FacilityUserResource = require('kolibri').resources.FacilityUserResource;
const ConditionalPromise = require('kolibri.lib.conditionalPromise');
const samePageCheckGenerator = require('kolibri.coreVue.vuex.actions').samePageCheckGenerator;


function showCoachRoot(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', false);
  store.dispatch('SET_PAGE_NAME', 'COACH_ROOT');
}


function redirectToDefaultReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', 'REPORTS_NO_QUERY');

  const channelListPromise = ChannelResource.getCollection({}).fetch();
  const facilityIdPromise = FacilityUserResource.getCurrentFacility();

  ConditionalPromise.all([channelListPromise, facilityIdPromise]).only(
    samePageCheckGenerator(store),
    ([channelList, facilityId]) => {
      // get current channelId
      const channelId = getDefaultChannelId(channelList);

      // get contentScopeId for root
      let contentScopeId = null;
      for (let x = 0; x < channelList.length; x++) {
        if (channelList[x].id === channelId) {
          contentScopeId = channelList[x].root_pk;
        }
      }
      // get userScopeId for facility
      const userScopeId = facilityId[0];
      router.replace({
        name: PageNames.REPORTS,
        params: {
          channel_id: channelId,
          content_scope: ReportsOptions.CONTENT_SCOPE_OPTIONS[0],
          content_scope_id: contentScopeId,
          user_scope: ReportsOptions.USER_SCOPE_OPTIONS[0],
          user_scope_id: userScopeId,
          all_or_recent: ReportsOptions.ALL_OR_RECENT_OPTIONS[0],
          view_by_content_or_learners: ReportsOptions.VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS[0],
          sort_column: ReportsOptions.SORT_COLUMN_OPTIONS[0],
          sort_order: ReportsOptions.SORT_ORDER_OPTIONS[0],
        },
      });
    },
    error => {
      coreActions.handleError(store, error);
    }
  );
}

function showReports(store, params) {
  store.dispatch('CORE_SET_PAGE_LOADING', true); // does this even work since I didn't implement it?
  store.dispatch('SET_PAGE_NAME', 'REPORTS');

  // Get params.
  const channelId = params.channel_id;
  const contentScope = params.content_scope;
  const contentScopeId = params.content_scope_id;
  const userScope = params.user_scope;
  const userScopeId = params.user_scope_id;
  const allOrRecent = params.all_or_recent;
  const viewByContentOrLearners = params.view_by_content_or_learners;
  const sortColumn = params.sort_column;
  const sortOrder = params.sort_order;


  // Check if params are valid.
  if (!(ReportsOptions.CONTENT_SCOPE_OPTIONS.includes(contentScope)
    && ReportsOptions.USER_SCOPE_OPTIONS.includes(userScope)
    && ReportsOptions.ALL_OR_RECENT_OPTIONS.includes(allOrRecent)
    && ReportsOptions.VIEW_BY_CONTENT_OR_LEARNERS_OPTIONS.includes(viewByContentOrLearners)
    && ReportsOptions.SORT_COLUMN_OPTIONS.includes(sortColumn)
    && ReportsOptions.SORT_ORDER_OPTIONS.includes(sortOrder))) {
    // If invalid params, just throw an error.
    coreActions.handleError(store, 'Invalid report parameters.');
    return;
  }
  // All these are URL derived.
  store.dispatch('SET_CHANNEL_ID', channelId);
  store.dispatch('SET_CONTENT_SCOPE', contentScope);
  store.dispatch('SET_CONTENT_SCOPE_ID', contentScopeId);
  store.dispatch('SET_USER_SCOPE', userScope);
  store.dispatch('SET_USER_SCOPE_ID', userScopeId);
  store.dispatch('SET_ALL_OR_RECENT', allOrRecent);
  store.dispatch('SET_VIEW_BY_CONTENT_OR_LEARNERS', viewByContentOrLearners);
  store.dispatch('SET_SORT_COLUMN', sortColumn);
  store.dispatch('SET_SORT_ORDER', sortOrder);

  if (viewByContentOrLearners === 'content_view') {
    // content report
    const contentReportPromise = ContentReportResource.getCollection({
      channel_id: channelId,
      topic_id: contentScopeId,
      collection_kind: userScope,
      collection_pk: userScopeId,
    }).fetch();
    // const contentReportPromise = ContentReportResource.getCollection();
    ConditionalPromise.all([contentReportPromise]).only(
      samePageCheckGenerator(store),
      ([contentReport]) => {
        console.log(contentReport);
      },
      error => {
        coreActions.handleError(store, error);
      }
    );
  } else {
    // user report
    // const userReportPromise = UserReportResource.getCollection({}).fetch();
    console.log('user report promise needed');
  }
  // Figure out which 2 api endpoints to call
  // resource fetch to summary and list endpoints
  // on then:
  //   dispatch...


  // possible new resources:
  /* UserSummaryReport.getModel({
   })

   ContentSummaryReport.getModel({
   })

   ContentReport.getCollection({
   })

   UserReport.getCollection({
   })*/

  store.dispatch('CORE_SET_PAGE_LOADING', false);
}


module.exports = {
  showCoachRoot,
  redirectToDefaultReports,
  showReports,
};
