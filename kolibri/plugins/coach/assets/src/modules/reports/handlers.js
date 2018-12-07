import { now } from 'kolibri.utils.serverClock';
import { ChannelResource, FacilityUserResource, LearnerGroupResource } from 'kolibri.resources';
import { PageNames } from '../../constants';
import {
  ContentScopes,
  RECENCY_THRESHOLD_IN_DAYS,
  SortOrders,
  TableColumns,
  UserScopes,
  ViewBy,
} from '../../constants/reportConstants';
import ContentSummaryResource from '../../apiResources/contentSummary';

function preparePageNameAndTitle(store, pageName) {
  store.commit('SET_PAGE_NAME', pageName);
  store.commit('CORE_SET_PAGE_LOADING', true);
}

function _showChannelList(store, classId, userId = null, showRecentOnly = false) {
  const userScope = userId ? UserScopes.USER : UserScopes.CLASSROOM;
  const userScopeId = userId || classId;

  const channels = store.getters.getChannels;
  const promises = [
    store.dispatch('reports/setChannelsTableData', {
      channels,
      collectionKind: userScope,
      collectionId: userScopeId,
    }),
    store.dispatch('setClassState', classId),
  ];

  if (userId) {
    promises.push(FacilityUserResource.fetchModel({ id: userId }));
  }

  return Promise.all(promises).then(
    ([, , user]) => {
      const defaultSortCol = showRecentOnly ? TableColumns.DATE : TableColumns.NAME;
      setReportSorting(store, { sortColumn: defaultSortCol, sortOrder: SortOrders.DESCENDING });
      store.commit('reports/SET_REPORT_PROPERTIES', {
        showRecentOnly,
        userScope,
        userScopeId,
        userScopeName: userId ? user.full_name : store.state.className,
        viewBy: ViewBy.CHANNEL,
      });
      store.commit('CORE_SET_PAGE_LOADING', false);
      store.commit('CORE_SET_ERROR', null);
    },
    error => {
      store.dispatch('handleCoachPageError', error);
    }
  );
}

export function _appendGroupNameToReports(reports, groupData) {
  return reports.map(report => {
    const group = groupData.find(g => g.user_ids.includes(report.id));
    return {
      ...report,
      groupName: group ? group.name : undefined,
    };
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
    ContentSummaryResource.fetchModel({ id: options.contentScopeId, getParams: reportPayload }),
    store.dispatch('reports/setItemsForTopicTableData', { reportPayload }),
    store.dispatch('setClassState', options.classId),
  ];
  const isUser = options.userScope === UserScopes.USER;
  if (isUser) {
    promises.push(FacilityUserResource.fetchModel({ id: options.userScopeId }));
  }
  Promise.all(promises).then(
    ([contentSummary, , , user]) => {
      setReportSorting(store, { sortColumn: TableColumns.NAME, sortOrder: SortOrders.DESCENDING });
      store.commit('reports/SET_REPORT_CONTENT_SUMMARY', contentSummary);
      store.commit('reports/SET_REPORT_PROPERTIES', {
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
      store.dispatch('handleCoachPageError', error);
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
    ContentSummaryResource.fetchModel({ id: options.contentScopeId, getParams: reportPayload }),
    store.dispatch('reports/setLearnersForItemTableData', { reportPayload }),
    store.dispatch('setClassState', options.classId),
  ];
  Promise.all(promises).then(
    ([contentSummary]) => {
      setReportSorting(store, { sortColumn: TableColumns.NAME, sortOrder: SortOrders.DESCENDING });
      store.commit('reports/SET_REPORT_CONTENT_SUMMARY', contentSummary);
      store.commit('reports/SET_REPORT_PROPERTIES', {
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

function clearReportSorting(store) {
  store.commit('reports/CLEAR_REPORT_SORTING');
}

function setReportSorting(store, { sortColumn, sortOrder }) {
  store.commit('reports/SET_REPORT_SORTING', { sortColumn, sortOrder });
}

export function showRecentItemsForChannel(store, params) {
  const { classId, channelId } = params;
  preparePageNameAndTitle(store, PageNames.RECENT_ITEMS_FOR_CHANNEL);
  const channelPromise = ChannelResource.fetchModel({ id: channelId });

  Promise.all([channelPromise, store.dispatch('setClassState', classId)]).then(
    ([channel]) => {
      const threshold = now();
      threshold.setDate(threshold.getDate() - RECENCY_THRESHOLD_IN_DAYS);
      return store
        .dispatch('reports/setRecentItemsForChannelTableData', {
          channelId,
          channelRootId: channel.root,
          lastActiveTime: threshold.toISOString(),
          classId,
        })
        .then(
          () => {
            store.commit('reports/SET_REPORT_PROPERTIES', {
              channelId,
              showRecentOnly: true,
              channelRootId: channel.root,
              userScope: UserScopes.CLASSROOM,
              userScopeId: classId,
              userScopeName: store.state.className,
              viewBy: ViewBy.RECENT,
              lastActiveTime: threshold.toISOString(),
            });
            setReportSorting(store, {
              sortColumn: TableColumns.DATE,
              sortOrder: SortOrders.DESCENDING,
            });
            store.commit('CORE_SET_PAGE_LOADING', false);
            store.commit('CORE_SET_ERROR', null);
          },
          error => store.dispatch('handleCoachPageError', error)
        );
    },
    error => store.dispatch('handleCoachPageError', error)
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
    FacilityUserResource.fetchCollection({ getParams: { member_of: classId }, force: true }),
    LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
    store.dispatch('setClassState', classId),
  ];

  Promise.all(promises).then(
    ([userData, groupData]) => {
      store.commit('reports/SET_REPORT_TABLE_DATA', _appendGroupNameToReports(userData, groupData));
      setReportSorting(store, { sortColumn: TableColumns.NAME, sortOrder: SortOrders.DESCENDING });
      store.commit('reports/SET_REPORT_PROPERTIES', {
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
  return ChannelResource.fetchModel({ id: channelId }).then(
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
    error => store.dispatch('handleCoachPageError', error)
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
