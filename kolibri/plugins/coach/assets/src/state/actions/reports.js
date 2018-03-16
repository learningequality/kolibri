import { handleError, handleApiError } from 'kolibri.coreVue.vuex.actions';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { getChannels } from 'kolibri.coreVue.vuex.getters';
import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
import { PageNames } from '../../constants';
import {
  ContentScopes,
  RECENCY_THRESHOLD_IN_DAYS,
  SortOrders,
  TableColumns,
  UserScopes,
  ViewBy,
} from '../../constants/reportConstants';
import { className } from '../getters/classes';
import { setClassState } from './main';
import { now } from 'kolibri.utils.serverClock';
import {
  AttemptLogResource,
  ChannelResource,
  ContentNodeResource,
  FacilityUserResource,
  ContentSummaryLogResource,
  LearnerGroupResource,
} from 'kolibri.resources';
import RecentReportResourceConstructor from '../../apiResources/recentReport';
import UserReportResource from '../../apiResources/userReport';
import ContentSummaryResourceConstructor from '../../apiResources/contentSummary';
import ContentReportResourceConstructor from '../../apiResources/contentReport';
import { createTranslator } from 'kolibri.utils.i18n';

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
    progress: row.progress.map(progressData => ({
      kind: progressData.kind,
      nodeCount: progressData.node_count,
      totalProgress: progressData.total_progress,
    })),
    title: row.title,
  }));
}

function _showChannelList(store, classId, userId = null, showRecentOnly = false) {
  const scope = userId ? UserScopes.USER : UserScopes.CLASSROOM;
  const scopeId = userId || classId;

  const promises = [
    getAllChannelsLastActivePromise(getChannels(store.state), scope, scopeId),
    setClassState(store, classId),
  ];

  if (userId) {
    promises.push(FacilityUserResource.getModel(userId).fetch());
  }

  return Promise.all(promises).then(([allChannelLastActive, , user]) => {
    const defaultSortCol = showRecentOnly ? TableColumns.DATE : TableColumns.NAME;
    store.dispatch('SET_REPORT_SORTING', defaultSortCol, SortOrders.DESCENDING);
    store.dispatch('SET_REPORT_PROPERTIES', {
      userScope: scope,
      userScopeId: scopeId,
      userScopeName: userId ? user.username : className(store.state),
      viewBy: ViewBy.CHANNEL,
      showRecentOnly,
    });
    store.dispatch('SET_REPORT_TABLE_DATA', _channelReportState(allChannelLastActive));
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('CORE_SET_ERROR', null);
  });
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
      store.dispatch('SET_REPORT_TABLE_DATA', _contentReportState(report));
    });
}

function _setLearnerReport(store, reportPayload, classId) {
  const promises = [
    UserReportResource.getCollection(reportPayload).fetch(),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
  ];
  return Promise.all(promises).then(([usersReport, learnerGroups]) => {
    store.dispatch('SET_REPORT_TABLE_DATA', _learnerReportState(usersReport, learnerGroups));
  });
}

function _setContentSummary(store, contentScopeId, reportPayload) {
  return ContentSummaryResource.getModel(contentScopeId, reportPayload)
    .fetch()
    .then(contentSummary => {
      store.dispatch('SET_REPORT_CONTENT_SUMMARY', _contentSummaryState(contentSummary));
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
      store.dispatch('SET_REPORT_SORTING', TableColumns.NAME, SortOrders.DESCENDING);
      store.dispatch('SET_REPORT_PROPERTIES', {
        channelId: options.channelId,
        contentScope: options.contentScope,
        contentScopeId: options.contentScopeId,
        userScope: options.userScope,
        userScopeId: options.userScopeId,
        userScopeName: isUser ? user.username : className(store.state),
        viewBy: ViewBy.CONTENT,
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => handleError(store, error)
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
      store.dispatch('SET_REPORT_SORTING', TableColumns.NAME, SortOrders.DESCENDING);
      store.dispatch('SET_REPORT_PROPERTIES', {
        channelId: options.channelId,
        contentScope: contentScope,
        contentScopeId: options.contentScopeId,
        userScope: userScope,
        userScopeId: options.userScopeId,
        userScopeName: className(store.state),
        viewBy: ViewBy.LEARNER,
        showRecentOnly: options.showRecentOnly,
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => handleError(store, error)
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
          const currentInteractionHistory = currentAttemptLog.interaction_history || [];
          Object.assign(exercise, { ancestors });
          const pageState = {
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
            // hack, allows caryover of custom state
            ...store.state.pageState,
          };

          store.dispatch('SET_PAGE_STATE', pageState);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          return pageState;
        });
      },
      error => {
        handleApiError(store, error);
      }
    );
}

function clearReportSorting(store) {
  store.dispatch('SET_REPORT_SORTING');
}

export function setReportSorting(store, sortColumn, sortOrder) {
  store.dispatch('SET_REPORT_SORTING', sortColumn, sortOrder);
}

export function showRecentChannels(store, classId) {
  store.dispatch('SET_PAGE_NAME', PageNames.RECENT_CHANNELS);
  store.dispatch('CORE_SET_TITLE', translator.$tr('recentChannelsPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId, null, true);
}

export function showRecentItemsForChannel(store, classId, channelId) {
  store.dispatch('SET_PAGE_NAME', PageNames.RECENT_ITEMS_FOR_CHANNEL);
  store.dispatch('CORE_SET_TITLE', translator.$tr('recentItemsForChannelPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);
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
          store.dispatch('SET_REPORT_TABLE_DATA', _recentReportState(reports));
          store.dispatch('SET_REPORT_PROPERTIES', {
            channelId,
            userScope: UserScopes.CLASSROOM,
            userScopeId: classId,
            userScopeName: className(store.state),
            viewBy: ViewBy.RECENT,
            showRecentOnly: true,
          });
          store.dispatch('SET_REPORT_SORTING', TableColumns.DATE, SortOrders.DESCENDING);
          store.dispatch('CORE_SET_PAGE_LOADING', false);
          store.dispatch('CORE_SET_ERROR', null);
          store.dispatch('CORE_SET_TITLE', translator.$tr('recentPageTitle'));
        },
        error => handleApiError(store, error)
      );
    },
    error => handleApiError(store, error)
  );
}

export function showRecentLearnersForItem(store, classId, channelId, contentId) {
  store.dispatch('SET_PAGE_NAME', PageNames.RECENT_LEARNERS_FOR_ITEM);
  store.dispatch('CORE_SET_TITLE', translator.$tr('recentLearnerActivityReportPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  _showClassLearnerList(store, {
    classId,
    channelId,
    contentScopeId: contentId,
    userScopeId: classId,
    showRecentOnly: true,
  });
}

export function showRecentLearnerItemDetails(
  store,
  classId,
  userId,
  channelId,
  contentId,
  questionNumber,
  interactionIndex
) {
  if (store.state.pageName !== PageNames.RECENT_LEARNER_ITEM_DETAILS) {
    store.dispatch('SET_PAGE_NAME', PageNames.RECENT_LEARNER_ITEM_DETAILS);
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }
  store.dispatch('CORE_SET_TITLE', translator.$tr('recentActivityLearnerDetailsReportPageTitle'));
  showExerciseDetailView(
    store,
    classId,
    userId,
    channelId,
    contentId,
    questionNumber,
    interactionIndex
  );
}

export function showTopicChannels(store, classId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPIC_CHANNELS);
  store.dispatch('CORE_SET_TITLE', translator.$tr('topicsReportAllChannelsPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId, null, false);
}

export function showTopicChannelRoot(store, classId, channelId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPIC_CHANNEL_ROOT);
  store.dispatch('CORE_SET_TITLE', translator.$tr('topicsForChannelReportPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  const channelPromise = ChannelResource.getModel(channelId).fetch();
  channelPromise.then(
    channelData => {
      _showContentList(store, {
        classId,
        channelId,
        contentScope: ContentScopes.ROOT,
        contentScopeId: channelData.root,
        userScope: UserScopes.CLASSROOM,
        userScopeId: classId,
        showRecentOnly: false,
      });
    },
    error => handleError(store, error)
  );
}

export function showTopicItemList(store, classId, channelId, topicId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPIC_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', translator.$tr('topicsContentItemsReportPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  _showContentList(store, {
    classId,
    channelId,
    contentScope: ContentScopes.ROOT,
    contentScopeId: topicId,
    userScope: UserScopes.CLASSROOM,
    userScopeId: classId,
    showRecentOnly: false,
  });
}

export function showTopicLearnersForItem(store, classId, channelId, contentId) {
  clearReportSorting(store);
  store.dispatch('SET_PAGE_NAME', PageNames.TOPIC_LEARNERS_FOR_ITEM);
  store.dispatch('CORE_SET_TITLE', translator.$tr('topicsLearnersReportForContentItemPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  _showClassLearnerList(store, {
    classId,
    channelId,
    contentScopeId: contentId,
    userScopeId: classId,
    showRecentOnly: false,
  });
}

export function showTopicLearnerItemDetails(
  store,
  classId,
  userId,
  channelId,
  contentId,
  questionNumber,
  interactionIndex
) {
  if (store.state.pageName !== PageNames.TOPIC_LEARNER_ITEM_DETAILS) {
    store.dispatch('SET_PAGE_NAME', PageNames.TOPIC_LEARNER_ITEM_DETAILS);
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }
  store.dispatch('CORE_SET_TITLE', translator.$tr('topicsLearnerDetailReportPageTitle'));
  showExerciseDetailView(
    store,
    classId,
    userId,
    channelId,
    contentId,
    questionNumber,
    interactionIndex
  );
}

export function showLearnerList(store, classId) {
  store.dispatch('SET_PAGE_NAME', PageNames.LEARNER_LIST);
  store.dispatch('CORE_SET_TITLE', translator.$tr('learnersReportPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  const promises = [
    FacilityUserResource.getCollection({ member_of: classId }).fetch({}, true),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    setClassState(store, classId),
  ];

  Promise.all(promises).then(
    ([userData, groupData]) => {
      store.dispatch('SET_REPORT_TABLE_DATA', _rootLearnerReportState(userData, groupData));
      store.dispatch('SET_REPORT_SORTING', TableColumns.NAME, SortOrders.DESCENDING);
      store.dispatch('SET_REPORT_CONTENT_SUMMARY', {});
      store.dispatch('SET_REPORT_PROPERTIES', {
        contentScope: ContentScopes.ALL,
        userScope: UserScopes.CLASSROOM,
        userScopeId: classId,
        userScopeName: className(store.state),
        viewBy: ViewBy.LEARNER,
        showRecentOnly: false,
      });
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => handleError(store, error)
  );
}

export function showLearnerChannels(store, classId, userId) {
  store.dispatch('SET_PAGE_NAME', PageNames.LEARNER_CHANNELS);
  store.dispatch('CORE_SET_TITLE', translator.$tr('learnersReportAllChannelsPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showChannelList(store, classId, userId, false);
}

export function showLearnerChannelRoot(store, classId, userId, channelId) {
  store.dispatch('SET_PAGE_NAME', PageNames.LEARNER_CHANNEL_ROOT);
  store.dispatch('CORE_SET_TITLE', translator.$tr('learnersReportForChannelPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  const channelPromise = ChannelResource.getModel(channelId).fetch();
  channelPromise.then(
    channelData => {
      _showContentList(store, {
        classId,
        channelId,
        contentScope: ContentScopes.ROOT,
        contentScopeId: channelData.root,
        userScope: UserScopes.USER,
        userScopeId: userId,
        showRecentOnly: false,
      });
    },
    error => handleError(store, error)
  );
}

export function showLearnerItemList(store, classId, userId, channelId, topicId) {
  store.dispatch('SET_PAGE_NAME', PageNames.LEARNER_ITEM_LIST);
  store.dispatch('CORE_SET_TITLE', translator.$tr('learnersReportForContentItemsPageTitle'));
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  _showContentList(store, {
    classId,
    channelId,
    contentScope: ContentScopes.TOPIC,
    contentScopeId: topicId,
    userScope: UserScopes.USER,
    userScopeId: userId,
    showRecentOnly: false,
  });
}

export function showLearnerItemDetails(
  store,
  classId,
  userId,
  channelId,
  contentId,
  questionNumber,
  interactionIndex
) {
  if (store.state.pageName !== PageNames.LEARNER_ITEM_DETAILS) {
    store.dispatch('SET_PAGE_NAME', PageNames.LEARNER_ITEM_DETAILS);
    store.dispatch('CORE_SET_PAGE_LOADING', true);
  }
  store.dispatch('CORE_SET_TITLE', translator.$tr('learnersItemDetailsReportPageTitle'));
  showExerciseDetailView(
    store,
    classId,
    userId,
    channelId,
    contentId,
    questionNumber,
    interactionIndex
  );
}
