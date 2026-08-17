import { get } from '@vueuse/core';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import useTotalProgress from '../useTotalProgress';
import UserProgressResource from '../internal/UserProgressResource';

jest.mock('kolibri/composables/useUser');
jest.mock('../internal/UserProgressResource');

describe('useTotalProgress', () => {
  it('fetches the logged-in user’s progress by id and exposes it', async () => {
    useUser.mockImplementation(() =>
      useUserMock({ isUserLoggedIn: true, currentUserId: 'user-1' }),
    );
    UserProgressResource.retrieve.mockResolvedValue({ progress: 3 });

    const { totalProgress, fetchPoints } = useTotalProgress();
    fetchPoints();
    await global.flushPromises();

    expect(UserProgressResource.retrieve).toHaveBeenCalledWith('user-1');
    expect(get(totalProgress)).toBe(3);
  });
});
