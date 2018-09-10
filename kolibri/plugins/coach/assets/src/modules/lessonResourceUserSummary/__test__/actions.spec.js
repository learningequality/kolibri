import UserReportResource from '../../../apiResources/userReport';
import makeStore from '../../../../test/makeStore';

describe('lessonResourceUserSummary actions', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it('setAttemptLogs updates Vuex correctly', async () => {
    jest.spyOn(UserReportResource, 'fetchCollection').mockResolvedValue([]);
    store.state.lessonResourceUserSummary.currentLesson = {
      learner_ids: [],
    };
    await store.dispatch('lessonResourceUserSummary/setUserData', {
      channelId: 'channel_1',
      classId: 'classroom_1',
      contentNodeId: 'contentnode_1',
    });
    expect(store.state.lessonResourceUserSummary.userData).toEqual([]);
    UserReportResource.fetchCollection.mockRestore();
  });
});
