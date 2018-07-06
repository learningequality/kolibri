import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { now } from 'kolibri.utils.serverClock';
import {
  AttemptLogResource,
  ChannelResource,
  ContentNodeResource,
  FacilityUserResource,
  ContentSummaryLogResource,
  LearnerGroupResource,
} from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { PageNames } from '../../constants';
import {
  ContentScopes,
  RECENCY_THRESHOLD_IN_DAYS,
  SortOrders,
  TableColumns,
  UserScopes,
  ViewBy,
} from '../../constants/reportConstants';
import RecentReportResourceConstructor from '../../apiResources/recentReport';
import UserReportResource from '../../apiResources/userReport';
import ContentSummaryResourceConstructor from '../../apiResources/contentSummary';
import ContentReportResourceConstructor from '../../apiResources/contentReport';
import { setClassState, handleCoachPageError } from './main';

const translator = createTranslator('coachReportPageTitles', {
  recentChannelsPageTitle: 'Recent - All channels',
  recentItemsForChannelPageTitle: 'Recent - Items',
  recentPageTitle: 'Recent',
  recentLearnerActivityReportPageTitle: 'Recent - Learners',
  recentActivityLearnerDetailsReportPageTitle: 'Recent - Learner Details',
  topicsReportAllChannelsPageTitle: 'Topics - All channels',
  topicsForChannelReportPageTitle: 'Topics - Channel',
  topicsContentItemsReportPageTitle: 'Topics - Items',
  topicsLearnersReportForContentItemPageTitle: 'Topics - Learners',
  topicsLearnerDetailReportPageTitle: 'Topics - Learner Details',
  learnersReportPageTitle: 'Learners',
  learnersReportAllChannelsPageTitle: 'Learners - All channels',
  learnersReportForChannelPageTitle: 'Learners - Channel',
  learnersReportForContentItemsPageTitle: 'Learners - Items',
  learnersItemDetailsReportPageTitle: 'Learners - Item Details',
});

const RecentReportResource = new RecentReportResourceConstructor();
const ContentSummaryResource = new ContentSummaryResourceConstructor();
const ContentReportResource = new ContentReportResourceConstructor();

const pageNameToTitleMap = {
  [PageNames.LEARNER_CHANNELS]: 'learnersReportAllChannelsPageTitle',
  [PageNames.LEARNER_CHANNEL_ROOT]: 'learnersReportForChannelPageTitle',
  [PageNames.LEARNER_ITEM_DETAILS]: 'learnersItemDetailsReportPageTitle',
  [PageNames.LEARNER_ITEM_LIST]: 'learnersReportForContentItemsPageTitle',
  [PageNames.LEARNER_LIST]: 'learnersReportPageTitle',
  [PageNames.RECENT_CHANNELS]: 'recentChannelsPageTitle',
  [PageNames.RECENT_ITEMS_FOR_CHANNEL]: 'recentItemsForChannelPageTitle',
  [PageNames.RECENT_LEARNERS_FOR_ITEM]: 'recentLearnerActivityReportPageTitle',
  [PageNames.RECENT_LEARNER_ITEM_DETAILS]: 'recentActivityLearnerDetailsReportPageTitle',
  [PageNames.TOPIC_CHANNELS]: 'topicsReportAllChannelsPageTitle',
  [PageNames.TOPIC_CHANNEL_ROOT]: 'topicsForChannelReportPageTitle',
  [PageNames.TOPIC_ITEM_LIST]: 'topicsContentItemsReportPageTitle',
  [PageNames.TOPIC_LEARNERS_FOR_ITEM]: 'topicsLearnersReportForContentItemPageTitle',
  [PageNames.TOPIC_LEARNER_ITEM_DETAILS]: 'topicsLearnerDetailReportPageTitle',
};

function preparePageNameAndTitle(store, pageName) {
  store.commit('SET_PAGE_NAME', pageName);
  store.commit('CORE_SET_TITLE', translator.$tr(pageNameToTitleMap[pageName]));
  store.commit('CORE_SET_PAGE_LOADING', true);
}

/**
 * Helper function for _showChannelList
 * @param {object} channel - to get recentActivity for
 * @param {string} classId -
 * @returns {Promise} that resolves channel with lastActive value in object:
 *   { 'channelId': dateOfLastActivity }
 */
function channelLastActivePromise(channel, userScope, userScopeId) {
  // workaround for conditionalPromise.then() misbehaving
  return new Promise((resolve, reject) => {
    ContentSummaryResource.getModel(channel.root_id, {
      channel_id: channel.id,
      collection_kind: userScope,
      collection_id: userScopeId,
    })
      .fetch()
      .then(
        channelSummary => {
          const obj = Object.assign({}, channelSummary, {
            channelId: channel.id,
          });
          resolve(obj);
        },
        error => reject(error)
      );
  });
}

function getAllChannelsLastActivePromise(channels, userScope, userScopeId) {
  const promises = channels.map(channel =>
    channelLastActivePromise(channel, userScope, userScopeId)
  );
  return Promise.all(promises);
}

function _channelReportState(data) {
  if (!data) {
    return [];
  }
  return data.map(row => ({
    lastActive: row.last_active,
    id: row.channelId,
    num_coach_contents: row.num_coach_contents,
    progress: row.progress.map(progressData => ({
      kind: progressData.kind,
      nodeCount: progressData.node_count,
      totalProgress: progressData.total_progress,
    })),
    title: row.title,
  }));
}

function _showChannelList(store, classId, userId = null, showRecentOnly = false) {
  const userScope = userId ? UserScopes.USER : UserScopes.CLASSROOM;
  const userScopeId = userId || classId;

  const channels = store.getters.getChannels;
  const promises = [
    getAllChannelsLastActivePromise(channels, userScope, userScopeId),
    // Get the ContentNode for the ChannelRoot for getting num_coach_contents
    ContentNodeResource.getCollection({ ids: channels.map(({ root_id }) => root_id) }).fetch(),
    setClassState(store, classId),
  ];

  if (userId) {
    promises.push(FacilityUserResource.getModel(userId).fetch());
  }

  return Promise.all(promises).then(
    ([allChannelLastActive, , , user]) => {
      const defaultSortCol = showRecentOnly ? TableColumns.DATE : TableColumns.NAME;
      setReportSorting(store, { sortColumn: defaultSortCol, sortOrder: SortOrders.DESCENDING });
      // HACK: need to append this to make pageState more consistent between pages
      store.commit('SET_REPORT_CONTENT_SUMMARY', {});
      store.commit('SET_REPORT_PROPERTIES', {
        showRecentOnly,
        userScope,
        userScopeId,
        userScopeName: userId ? user.full_name : store.state.className,
        viewBy: ViewBy.CHANNEL,
      });
      store.commit('SET_REPORT_TABLE_DATA', _channelReportState(allChannelLastActive));
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => {
      handleCoachPageError(store, error);
    }
  );
}

function _contentReportState(data) {
  if (!data) {
    return [];
  }
  return data.map(row => ({
    contentId: row.content_id,
    kind: row.kind,
    lastActive: row.last_active,
    id: row.pk,
    num_coach_contents: row.num_coach_contents,
    progress: row.progress.map(progressData => ({
      kind: progressData.kind,
      nodeCount: progressData.node_count,
      totalProgress: progressData.total_progress,
    })),
    title: row.title,
  }));
}

function _recentReportState(data) {
  if (!data) {
    return [];
  }
  return data.map(row => ({
    num_coach_contents: row.num_coach_contents,
    contentId: row.content_id,
    kind: row.kind,
    lastActive: row.last_active,
    id: row.pk,
    progress: row.progress.map(progressData => ({
      logCountComplete: progressData.log_count_complete,
      logCountTotal: progressData.log_count_total,
      totalProgress: progressData.total_progress,
    })),
    title: row.title,
  }));
}

function _getGroupName(userId, groupData) {
  const group = groupData.find(g => g.user_ids.includes(userId));
  return group ? group.name : undefined;
}

function _rootLearnerReportState(userData, groupData) {
  return userData.map(row => ({
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    groupName: _getGroupName(row.id, groupData),
  }));
}

function _learnerReportState(userReportData, groupData) {
  if (!userReportData) {
    return [];
  }
  return userReportData.map(row => ({
    id: row.pk,
    fullName: row.full_name,
    username: row.username,
    lastActive: row.last_active,
    groupName: _getGroupName(row.pk, groupData),
    progress: row.progress.map(progressData => ({
      kind: progressData.kind,
      timeSpent: progressData.time_spent,
      totalProgress: progressData.total_progress,
    })),
  }));
}

function _contentSummaryState(data) {
  if (!data) {
    return {};
  }
  const kind = !data.ancestors.length ? ContentNodeKinds.CHANNEL : data.kind;
  return {
    num_coach_contents: data.num_coach_contents,
    ancestors: data.ancestors.map(item => ({
      id: item.pk,
      title: item.title,
    })),
    contentId: data.content_id,
    kind,
    lastActive: data.last_active,
    numUsers: data.num_users,
    id: data.pk,
    progress: data.progress.map(progressData => ({
      kind: progressData.kind,
      nodeCount: progressData.node_count,
      totalProgress: progressData.total_progress,
    })),
    title: data.title,
  };
}

function _setContentReport(store, reportPayload) {
  return ContentReportResource.getCollection(reportPayload)
    .fetch()
    .then(report => {
      store.commit('SET_REPORT_TABLE_DATA', _contentReportState(report));
    });
}

function _setLearnerReport(store, reportPayload, classId) {
  const promises = [
    UserReportResource.getCollection(reportPayload).fetch(),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
  ];
  return Promise.all(promises).then(([usersReport, learnerGroups]) => {
    store.commit('SET_REPORT_TABLE_DATA', _learnerReportState(usersReport, learnerGroups));
  });
}

function _setContentSummary(store, contentScopeId, reportPayload) {
  return ContentSummaryResource.getModel(contentScopeId, reportPayload)
    .fetch()
    .then(contentSummary => {
      store.commit('SET_REPORT_CONTENT_SUMMARY', _contentSummaryState(contentSummary));
    });
}

function _showContentList(store, options) {
  const reportPayload = {
    channel_id: options.channelId,
    content_node_id: options.contentScopeId,
    collection_kind: options.userScope,
    collection_id: options.userScopeId,
  };
  const promises = [
    _setContentSummary(store, options.contentScopeId, reportPayload),
    _setContentReport(store, reportPayload),
    setClassState(store, options.classId),
  ];
  const isUser = options.userScope === UserScopes.USER;
  if (isUser) {
    promises.push(FacilityUserResource.getModel(options.userScopeId).fetch());
  }
  Promise.all(promises).then(
    ([, , , user]) => {
      setReportSorting(store, { sortColumn: TableColumns.NAME, sortOrder: SortOrders.DESCENDING });
      store.commit('SET_REPORT_PROPERTIES', {
        channelId: options.channelId,
        contentScope: options.contentScope,
        contentScopeId: options.contentScopeId,
        userScope: options.userScope,
        userScopeId: options.userScopeId,
        userScopeName: isUser ? user.full_name : store.state.className,
        viewBy: ViewBy.CONTENT,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      handleCoachPageError(store, error);
    }
  );
}

function _showClassLearnerList(store, options) {
  const contentScope = ContentScopes.CONTENT;
  const userScope = UserScopes.CLASSROOM;

  const reportPayload = {
    channel_id: options.channelId,
    content_node_id: options.contentScopeId,
    collection_kind: userScope,
    collection_id: options.classId,
  };
  const promises = [
    _setContentSummary(store, options.contentScopeId, reportPayload),
    _setLearnerReport(store, reportPayload, options.classId),
    setClassState(store, options.classId),
  ];
  Promise.all(promises).then(
    () => {
      setReportSorting(store, { sortColumn: TableColumns.NAME, sortOrder: SortOrders.DESCENDING });
      store.commit('SET_REPORT_PROPERTIES', {
        channelId: options.channelId,
        contentScope: contentScope,
        contentScopeId: options.contentScopeId,
        showRecentOnly: options.showRecentOnly,
        userScope: userScope,
        userScopeId: options.userScopeId,
        userScopeName: store.state.className,
        viewBy: ViewBy.LEARNER,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => store.dispatch('handleError', error)
  );
}

// needs exercise, attemptlog. Pass answerstate into contentrender to display answer
export function showExerciseDetailView(
  store,
  classId,
  userId,
  channelId,
  contentId,
  attemptLogIndex,
  interactionIndex
) {
  return ContentNodeResource.getModel(contentId)
    .fetch()
    ._promise.then(
      exercise => {
        return Promise.all([
          AttemptLogResource.getCollection({
            user: userId,
            content: exercise.content_id,
          }).fetch(),
          ContentSummaryLogResource.getCollection({
            user_id: userId,
            content_id: exercise.content_id,
          }).fetch(),
          FacilityUserResource.getModel(userId).fetch(),
          ContentNodeResource.fetchAncestors(contentId),
          setClassState(store, classId),
        ]).then(([attemptLogs, summaryLog, user, ancestors]) => {
          attemptLogs.sort(
            (attemptLog1, attemptLog2) =>
              new Date(attemptLog2.end_timestamp) - new Date(attemptLog1.end_timestamp)
          );
          const exerciseQuestions = assessmentMetaDataState(exercise).assessmentIds;
          // SECOND LOOP: Add their question number
          if (exerciseQuestions && exerciseQuestions.length) {
            attemptLogs.forEach(attemptLog => {
              attemptLog.questionNumber = exerciseQuestions.indexOf(attemptLog.item) + 1;
            });
          }

          const currentAttemptLog = attemptLogs[attemptLogIndex] || {};
          let currentInteractionHistory = currentAttemptLog.interaction_history || [];
          // filter out interactions without answers but keep hints and errors
          currentInteractionHistory = currentInteractionHistory.filter(interaction =>
            Boolean(
              interaction.answer || interaction.type === 'hint' || interaction.type === 'error'
            )
          );
          Object.assign(exercise, { ancestors });
          const pageState = {
            // hack, allows caryover of custom state
            ...store.state.pageState,
            // because this is info returned from a collection
            user,
            exercise,
            attemptLogs,
            currentAttemptLog,
            interactionIndex,
            currentInteractionHistory,
            currentInteraction: currentInteractionHistory[interactionIndex],
            summaryLog: summaryLog[0],
            channelId, // not really needed
            attemptLogIndex,
          };

          store.commit('SET_PAGE_STATE', pageState);
          store.commit('CORE_SET_PAGE_LOADING', false);
          return pageState;
        });
      },
      error => {
        handleCoachPageError(store, error);
      }
    );
}

function clearReportSorting(store) {
  store.commit('CLEAR_REPORT_SORTING');
}

export function setReportSorting(store, { sortColumn, sortOrder }) {
  store.commit('SET_REPORT_SORTING', { sortColumn, sortOrder });
}

export function showRecentItemsForChannel(store, params) {
  const { classId, channelId } = params;
  preparePageNameAndTitle(store, PageNames.RECENT_ITEMS_FOR_CHANNEL);
  const channelPromise = ChannelResource.getModel(channelId).fetch();

  Promise.all([channelPromise, setClassState(store, classId)]).then(
    ([channelData]) => {
      const threshold = now();
      threshold.setDate(threshold.getDate() - RECENCY_THRESHOLD_IN_DAYS);
      const recentReportsPromise = RecentReportResource.getCollection({
        channel_id: channelId,
        content_node_id: channelData.root,
        collection_kind: UserScopes.CLASSROOM,
        collection_id: classId,
        last_active_time: threshold,
      }).fetch();

      recentReportsPromise.then(
        reports => {
          store.commit('SET_REPORT_TABLE_DATA', _recentReportState(reports));
          store.commit('SET_REPORT_PROPERTIES', {
            channelId,
            showRecentOnly: true,
            userScope: UserScopes.CLASSROOM,
            userScopeId: classId,
            userScopeName: store.state.className,
            viewBy: ViewBy.RECENT,
          });
          setReportSorting(store, {
            sortColumn: TableColumns.DATE,
            sortOrder: SortOrders.DESCENDING,
          });
          store.commit('CORE_SET_PAGE_LOADING', false);
          store.commit('CORE_SET_ERROR', null);
          store.commit('CORE_SET_TITLE', translator.$tr('recentPageTitle'));
        },
        error => handleCoachPageError(store, error)
      );
    },
    error => handleCoachPageError(store, error)
  );
}

export function showChannelListForReports(store, params) {
  const { classId, showRecentOnly } = params;
  clearReportSorting(store);
  const pageName = showRecentOnly ? PageNames.RECENT_CHANNELS : PageNames.TOPIC_CHANNELS;
  preparePageNameAndTitle(store, pageName);
  _showChannelList(store, classId, null, showRecentOnly);
}

export function showLearnerReportsForItem(store, params) {
  const { classId, channelId, contentId, showRecentOnly } = params;
  clearReportSorting(store);
  const pageName = showRecentOnly
    ? PageNames.RECENT_LEARNERS_FOR_ITEM
    : PageNames.TOPIC_LEARNERS_FOR_ITEM;
  preparePageNameAndTitle(store, pageName);
  _showClassLearnerList(store, {
    classId,
    channelId,
    contentScopeId: contentId,
    userScopeId: classId,
    showRecentOnly,
  });
}

export function showLearnerList(store, classId) {
  preparePageNameAndTitle(store, PageNames.LEARNER_LIST);
  const promises = [
    FacilityUserResource.getCollection({ member_of: classId }).fetch({}, true),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    setClassState(store, classId),
  ];

  Promise.all(promises).then(
    ([userData, groupData]) => {
      store.commit('SET_REPORT_TABLE_DATA', _rootLearnerReportState(userData, groupData));
      setReportSorting(store, { sortColumn: TableColumns.NAME, sortOrder: SortOrders.DESCENDING });
      store.commit('SET_REPORT_CONTENT_SUMMARY', {});
      store.commit('SET_REPORT_PROPERTIES', {
        contentScope: ContentScopes.ALL,
        showRecentOnly: false,
        userScope: UserScopes.CLASSROOM,
        userScopeId: classId,
        userScopeName: store.state.className,
        viewBy: ViewBy.LEARNER,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
    },
    error => store.dispatch('handleError', error)
  );
}

export function showLearnerChannels(store, params) {
  const { classId, userId } = params;
  preparePageNameAndTitle(store, PageNames.LEARNER_CHANNELS);
  _showChannelList(store, classId, userId, false);
}

export function showChannelRootReport(store, params) {
  const { classId, channelId, userId } = params;
  let scopeOptions;
  let pageName;
  clearReportSorting(store);
  // For a single Learner
  if (userId) {
    pageName = PageNames.LEARNER_CHANNEL_ROOT;
    scopeOptions = {
      userScope: UserScopes.USER,
      userScopeId: userId,
    };
  } else {
    // For the entire Classroom
    pageName = PageNames.TOPIC_CHANNEL_ROOT;
    scopeOptions = {
      userScope: UserScopes.CLASSROOM,
      userScopeId: classId,
    };
  }
  preparePageNameAndTitle(store, pageName);
  // NOTE: Almost exactly the same as showItemListReports, except for this API call
  return ChannelResource.getModel(channelId)
    .fetch()
    .then(
      channel => {
        _showContentList(store, {
          classId,
          channelId,
          contentScope: ContentScopes.ROOT,
          contentScopeId: channel.root,
          showRecentOnly: false,
          ...scopeOptions,
        });
      },
      error => handleCoachPageError(store, error)
    );
}

export function showItemListReports(store, params) {
  const { classId, channelId, topicId, userId } = params;
  let scopeOptions;
  let pageName;
  clearReportSorting(store);
  // For single Learner
  if (userId) {
    pageName = PageNames.LEARNER_ITEM_LIST;
    scopeOptions = {
      userScope: UserScopes.USER,
      userScopeId: userId,
    };
  } else {
    // For entire Classroom
    pageName = PageNames.TOPIC_ITEM_LIST;
    scopeOptions = {
      userScope: UserScopes.CLASSROOM,
      userScopeId: classId,
    };
  }
  preparePageNameAndTitle(store, pageName);
  _showContentList(store, {
    classId,
    channelId,
    contentScope: ContentScopes.TOPIC,
    contentScopeId: topicId,
    showRecentOnly: false,
    ...scopeOptions,
  });
}

// Consolidates the duplicated logic for the item detail pages
function _showItemDetailPage(pageName, ...args) {
  const store = args[0];
  if (store.state.pageName !== pageName) {
    preparePageNameAndTitle(store, pageName);
  }
  showExerciseDetailView(...args);
}

export function showLearnerItemDetails(...args) {
  _showItemDetailPage(PageNames.LEARNER_ITEM_DETAILS, ...args);
}

export function showRecentLearnerItemDetails(...args) {
  _showItemDetailPage(PageNames.RECENT_LEARNER_ITEM_DETAILS, ...args);
}

export function showTopicLearnerItemDetails(...args) {
  _showItemDetailPage(PageNames.TOPIC_LEARNER_ITEM_DETAILS, ...args);
}
