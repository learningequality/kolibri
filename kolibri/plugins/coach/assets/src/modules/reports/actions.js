import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { LearnerGroupResource } from 'kolibri.resources';
import { UserScopes } from '../../constants/reportConstants';
import ContentReportResource from '../../apiResources/contentReport';
import ContentSummaryResource from '../../apiResources/contentSummary';
import RecentReportResource from '../../apiResources/recentReport';
import UserReportResource from '../../apiResources/userReport';
import { _appendGroupNameToReports } from './handlers';

export function setRecentItemsForChannelTableData(store, params) {
  const { channelId, channelRootId, classId, lastActiveTime } = params;
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);
  return RecentReportResource.fetchCollection({
    getParams: {
      channel_id: channelId,
      content_node_id: channelRootId,
      collection_kind: UserScopes.CLASSROOM,
      collection_id: classId,
      last_active_time: lastActiveTime,
    },
    force: true,
  }).then(recentReports => {
    if (isSamePage()) {
      store.commit('SET_REPORT_TABLE_DATA', [...recentReports]);
    }
  });
}

export function setLearnersForItemTableData(store, params) {
  const { reportPayload } = params;
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);
  const promises = [
    UserReportResource.fetchCollection({ getParams: reportPayload, force: true }),
    LearnerGroupResource.fetchCollection({ getParams: { parent: reportPayload.collection_id } }),
  ];
  return Promise.all(promises).then(([userReports, learnerGroups]) => {
    if (isSamePage()) {
      store.commit('SET_REPORT_TABLE_DATA', _appendGroupNameToReports(userReports, learnerGroups));
    }
  });
}

export function setItemsForTopicTableData(store, params) {
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);
  return ContentReportResource.fetchCollection({
    getParams: params.reportPayload,
    force: true,
  }).then(contentReports => {
    if (isSamePage()) {
      store.commit('SET_REPORT_TABLE_DATA', [...contentReports]);
    }
  });
}

export function setChannelsTableData(store, params) {
  const { channels, collectionKind, collectionId } = params;
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);
  const promises = channels.map(channel => {
    return ContentSummaryResource.fetchModel({
      id: channel.root_id,
      getParams: {
        channel_id: channel.id,
        collection_kind: collectionKind,
        collection_id: collectionId,
      },
      force: true,
    });
  });
  return Promise.all(promises).then(contentSummaries => {
    if (isSamePage()) {
      store.commit('SET_REPORT_TABLE_DATA', [...contentSummaries]);
    }
  });
}
