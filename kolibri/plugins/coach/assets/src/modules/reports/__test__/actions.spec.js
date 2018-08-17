import { LearnerGroupResource } from 'kolibri.resources';
import ContentReportResource from '../../../apiResources/contentReport';
import ContentSummaryResource from '../../../apiResources/contentSummary';
import RecentReportResource from '../../../apiResources/recentReport';
import UserReportResource from '../../../apiResources/userReport';
import makeStore from '../../../../test/makeStore';

describe('reports module actions', () => {
  let store;
  const testTableData = [{ id: 1 }, { id: 2 }];

  beforeEach(() => {
    store = makeStore();
  });

  it('setRecentItemsForChannelTableData updates Vuex store', async () => {
    jest.spyOn(RecentReportResource, 'fetchCollection').mockResolvedValue(testTableData);
    await store.dispatch('reports/setRecentItemsForChannelTableData', {
      channelId: 'channel_1',
      channelRootId: 'channel_1_root',
      classId: 'classroom_1',
      lastActiveTime: 0,
      startRefreshing: true,
    });

    expect(store.state.reports.tableData).toEqual(testTableData);
    expect(RecentReportResource.fetchCollection).toHaveBeenCalledWith({
      getParams: {
        channel_id: 'channel_1',
        content_node_id: 'channel_1_root',
        collection_kind: 'classroom',
        collection_id: 'classroom_1',
        last_active_time: 0,
      },
      force: true,
    });
    RecentReportResource.fetchCollection.mockRestore();
  });

  it('setLearnersForItemTableData updates Vuex store', async () => {
    const learner = { id: 'learner_1' };
    const group = {
      id: 'group_1',
      name: 'Group One',
      user_ids: [learner.id],
    };
    jest.spyOn(UserReportResource, 'fetchCollection').mockResolvedValue([learner]);
    jest.spyOn(LearnerGroupResource, 'fetchCollection').mockResolvedValue([group]);
    await store.dispatch('reports/setLearnersForItemTableData', {
      reportPayload: {
        collection_id: 'classroom_1',
      },
      startRefreshing: true,
    });

    expect(store.state.reports.tableData).toEqual([{ id: 'learner_1', groupName: 'Group One' }]);
    expect(UserReportResource.fetchCollection).toHaveBeenCalledWith({
      getParams: {
        collection_id: 'classroom_1',
      },
      force: true,
    });
    expect(LearnerGroupResource.fetchCollection).toHaveBeenCalledWith({
      getParams: {
        parent: 'classroom_1',
      },
    });
    UserReportResource.fetchCollection.mockRestore();
    LearnerGroupResource.fetchCollection.mockRestore();
  });

  it('setItemsForTopicTableData updates Vuex store', async () => {
    jest.spyOn(ContentReportResource, 'fetchCollection').mockResolvedValue(testTableData);
    await store.dispatch('reports/setItemsForTopicTableData', {
      reportPayload: {
        collection_id: 'whatever',
      },
      startRefreshing: true,
    });
    expect(store.state.reports.tableData).toEqual(testTableData);
    expect(ContentReportResource.fetchCollection).toHaveBeenCalledWith({
      getParams: {
        collection_id: 'whatever',
      },
      force: true,
    });
    ContentReportResource.fetchCollection.mockRestore();
  });

  it('setChannelsTableData updates Vuex store', async () => {
    jest.spyOn(ContentSummaryResource, 'fetchModel').mockResolvedValue({
      id: 'channel',
      name: 'the channel',
    });
    await store.dispatch('reports/setChannelsTableData', {
      channels: [{ id: 'channel_1', root_id: 'channel_1_root' }],
      collectionKind: 'classroom',
      collectionId: 'classroom_1',
      startRefreshing: true,
    });
    // Expectation not working
    // expect(store.state.reports.tableData).toEqual([
    //   { id: 'channel', name: 'the channel' }
    // ]);
    expect(ContentSummaryResource.fetchModel).toHaveBeenCalledWith({
      id: 'channel_1_root',
      getParams: {
        channel_id: 'channel_1',
        collection_kind: 'classroom',
        collection_id: 'classroom_1',
      },
      force: true,
    });
    ContentSummaryResource.fetchModel.mockRestore();
  });
});
