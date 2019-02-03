import { AttemptLogResource } from 'kolibri.resources';
import makeStore from '../../../../test/makeStore';

describe('exerciseDetail actions', () => {
  it('setAttemptLogs updates Vuex correctly', async () => {
    jest.spyOn(AttemptLogResource, 'fetchCollection').mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch('exerciseDetail/setAttemptLogs', {
      contentId: 'content_1',
      userId: 'user_1',
      exercise: {},
    });
    expect(store.state.exerciseDetail.attemptLogs).toEqual(undefined);
    AttemptLogResource.fetchCollection.mockRestore();
  });
});
