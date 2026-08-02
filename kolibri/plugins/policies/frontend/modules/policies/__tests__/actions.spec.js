import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser from 'kolibri/composables/useUser';
import { updateUserProfile, updateUserProfilePassword } from '../actions';

jest.mock('kolibri-common/apiResources/FacilityUserResource', () => ({
  __esModule: true,
  default: {
    update: jest.fn(),
  },
}));
jest.mock('kolibri/composables/useUser');
jest.mock('@vueuse/core', () => ({
  get: value => value.value,
}));

describe('policies actions', () => {
  const currentUserId = { value: 'current-user-id' };
  let setSession;

  beforeEach(() => {
    jest.clearAllMocks();
    setSession = jest.fn();
    useUser.mockReturnValue({
      currentUserId,
      setSession,
    });
    FacilityUserResource.update.mockResolvedValue({});
  });

  describe('updateUserProfile', () => {
    it('updates the current user and session with profile updates', async () => {
      const updates = {
        full_name: 'Test User',
        id_number: '123',
      };

      await updateUserProfile({}, { updates });

      expect(FacilityUserResource.update).toHaveBeenCalledWith({
        id: 'current-user-id',
        data: updates,
      });
      expect(setSession).toHaveBeenCalledWith({ session: updates });
    });

    it('does not update the current user for empty profile updates', async () => {
      await updateUserProfile({}, { updates: {} });

      expect(useUser).not.toHaveBeenCalled();
      expect(FacilityUserResource.update).not.toHaveBeenCalled();
    });
  });

  describe('updateUserProfilePassword', () => {
    it('updates the current user password', async () => {
      await updateUserProfilePassword({}, 'newpassword');

      expect(FacilityUserResource.update).toHaveBeenCalledWith({
        id: 'current-user-id',
        data: { password: 'newpassword' },
      });
    });
  });
});
