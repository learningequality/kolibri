import { computed, ref } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { FacilitiesStore } from 'kolibri-common/composables/useFacilities';
import {
  useFacilitySelect,
  useFacilityConfig,
  // eslint-disable-next-line import-x/named
  useFacilitySelectMock,
  // eslint-disable-next-line import-x/named
  useFacilityConfigMock,
} from 'kolibri-common/composables/useFacility';
import { OptionsForSignIn } from 'kolibri-common/constants/Auth';
import { handleApiError } from 'kolibri/utils/appError';
import useAuthFlow from '../useAuthFlow';

jest.mock('kolibri-common/composables/useFacility');
jest.mock('@vueuse/core', () => ({
  ...jest.requireActual('@vueuse/core'),
  useLocalStorage: jest.fn(),
}));
jest.mock('kolibri/utils/appError');

FacilitiesStore.stub();

describe('useAuthFlow', () => {
  const persistentSignInMethod = ref(null);
  const facilitiesStore = FacilitiesStore.use();

  function createAuthFlow() {
    return useAuthFlow();
  }

  function mockFacilities(facilities, facility) {
    FacilitiesStore.mock({ _facilities: facilities });
    if (facility !== undefined) {
      facilitiesStore.getFacility.mockReturnValue(facility);
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();

    persistentSignInMethod.value = null;
    useLocalStorage.mockImplementation((key, defaultVal) => {
      if (key === 'signInMethod') {
        return persistentSignInMethod;
      }
      return ref(defaultVal);
    });
  });

  describe('facilityId', () => {
    it('returns selectedFacilityId if it is set', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => 'facility_1'),
        }),
      );
      const { facilityId } = createAuthFlow();
      expect(facilityId.value).toBe('facility_1');
    });

    it('returns null if no selection and multiple facilities exist', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => null),
        }),
      );
      mockFacilities([{ id: 'f1' }, { id: 'f2' }], { id: 'f1', name: 'Facility One' });
      const { facilityId } = createAuthFlow();
      expect(facilityId.value).toBe(null);
    });

    it('returns the first facility if only one exists and no selection made', () => {
      mockFacilities([{ id: 'f1' }]);
      const { facilityId } = createAuthFlow();
      expect(facilityId.value).toBe('f1');
    });

    it('returns null if there are no facilities and no selected facility', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => null),
        }),
      );
      mockFacilities([]);
      const { facilityId } = createAuthFlow();
      expect(facilityId.value).toBe(null);
    });
  });

  describe('selectedFacility', () => {
    it('returns null when there is no selected or inferable facility id', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => null),
        }),
      );
      mockFacilities([{ id: 'f1' }, { id: 'f2' }], { id: 'f1', name: 'Facility One' });
      const { selectedFacility } = createAuthFlow();
      expect(selectedFacility.value).toBe(null);
    });

    it('returns facility details when facility id is available', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => 'f1'),
        }),
      );
      mockFacilities([{ id: 'f1' }, { id: 'f2' }], { id: 'f1', name: 'Facility One' });
      const { selectedFacility } = createAuthFlow();
      expect(selectedFacility.value).toEqual({ id: 'f1', name: 'Facility One' });
    });

    it("returns facility details when there's only one", () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => null),
        }),
      );
      mockFacilities([{ id: 'f1' }], { id: 'f1', name: 'Facility One' });
      const { selectedFacility } = createAuthFlow();
      expect(selectedFacility.value).toEqual({ id: 'f1', name: 'Facility One' });
    });
  });

  describe('signInMethod', () => {
    it('returns persistent method if it is valid for current facility', () => {
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          signInOptions: computed(() => [
            OptionsForSignIn.USERNAME_PASSWORD,
            OptionsForSignIn.PICTURE_PASSWORD,
          ]),
        }),
      );
      persistentSignInMethod.value = OptionsForSignIn.USERNAME_PASSWORD;

      const { signInMethod } = createAuthFlow();
      expect(signInMethod.value).toBe(OptionsForSignIn.USERNAME_PASSWORD);
    });

    it('defaults to PICTURE_PASSWORD if enabled and no persistent choice', () => {
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          signInOptions: computed(() => [
            OptionsForSignIn.USERNAME_PASSWORD,
            OptionsForSignIn.PICTURE_PASSWORD,
          ]),
        }),
      );
      persistentSignInMethod.value = null;

      const { signInMethod } = createAuthFlow();
      expect(signInMethod.value).toBe(OptionsForSignIn.PICTURE_PASSWORD);
    });

    it('defaults to the first option if picture password is not enabled', () => {
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          signInOptions: computed(() => [OptionsForSignIn.USERNAME_ONLY]),
        }),
      );
      const { signInMethod } = createAuthFlow();
      expect(signInMethod.value).toBe(OptionsForSignIn.USERNAME_ONLY);
    });

    it('persists when set', () => {
      const { signInMethod } = createAuthFlow();
      signInMethod.value = OptionsForSignIn.USERNAME_ONLY;
      expect(persistentSignInMethod.value).toBe(OptionsForSignIn.USERNAME_ONLY);
    });
  });

  describe('canSignUp', () => {
    it('canSignUpWithAnyFacility is true when any facility allows learner sign-up', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => null),
        }),
      );
      mockFacilities([
        { id: 'f1', dataset: { learner_can_sign_up: false } },
        { id: 'f2', dataset: { learner_can_sign_up: true } },
      ]);

      const { canSignUpWithAnyFacility } = createAuthFlow();
      expect(canSignUpWithAnyFacility.value).toBe(true);
    });

    it('canSignUpWithAnyFacility is false when no facility allows learner sign-up', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => null),
        }),
      );
      mockFacilities([
        { id: 'f1', dataset: { learner_can_sign_up: false } },
        { id: 'f2', dataset: { learner_can_sign_up: false } },
      ]);

      const { canSignUpWithAnyFacility } = createAuthFlow();
      expect(canSignUpWithAnyFacility.value).toBe(false);
    });

    it('canSignUpWithFacility is true when selected facility config allows it', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => 'f1'),
        }),
      );
      mockFacilities([{ id: 'f1' }], { id: 'f1' });
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          facilityConfig: ref({
            is_full_facility_import: true,
            learner_can_sign_up: true,
          }),
        }),
      );

      const { canSignUpWithFacility } = createAuthFlow();
      expect(canSignUpWithFacility.value).toBe(true);
    });

    it('canSignUpWithFacility is false when selected facility is not full import', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => 'f1'),
        }),
      );
      mockFacilities([{ id: 'f1' }], { id: 'f1' });
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          facilityConfig: ref({
            is_full_facility_import: false,
            learner_can_sign_up: true,
          }),
        }),
      );

      const { canSignUpWithFacility } = createAuthFlow();
      expect(canSignUpWithFacility.value).toBe(false);
    });

    it('uses selected facility config for canSignUp when a facility is selected', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => 'f1'),
        }),
      );
      mockFacilities(
        [
          { id: 'f1', dataset: { learner_can_sign_up: false } },
          { id: 'f2', dataset: { learner_can_sign_up: true } },
        ],
        { id: 'f1' },
      );
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          facilityConfig: ref({
            is_full_facility_import: true,
            learner_can_sign_up: false,
          }),
        }),
      );

      const { canSignUp } = createAuthFlow();
      expect(canSignUp.value).toBe(false);
    });

    it('falls back to any facility sign-up when no facility is selected', () => {
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => null),
        }),
      );
      mockFacilities(
        [
          { id: 'f1', dataset: { learner_can_sign_up: false } },
          { id: 'f2', dataset: { learner_can_sign_up: true } },
        ],
        null,
      );

      const { canSignUp } = createAuthFlow();
      expect(canSignUp.value).toBe(true);
    });
  });

  describe('setFacilityId', () => {
    it('sets the facility ID and fetches config', async () => {
      const setSelectedFacilityId = jest.fn();
      const fetchFacilityConfig = jest.fn().mockResolvedValue();

      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          setSelectedFacilityId,
        }),
      );
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          fetchFacilityConfig,
        }),
      );
      const { setFacilityId } = createAuthFlow();
      await setFacilityId('new_f');

      expect(setSelectedFacilityId).toHaveBeenCalledWith('new_f');
      expect(fetchFacilityConfig).toHaveBeenCalledWith('new_f');
    });

    it('handles fetch errors through app error handler', async () => {
      const error = new Error('failed config');
      const fetchFacilityConfig = jest.fn().mockRejectedValue(error);

      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          fetchFacilityConfig,
        }),
      );

      const { setFacilityId } = createAuthFlow();
      await setFacilityId('new_f');

      expect(handleApiError).toHaveBeenCalledWith({
        error,
        reloadOnReconnect: true,
      });
    });
  });

  describe('initializeFlow', () => {
    it('fetches facilities and attempts to set up initial state', async () => {
      const fetchFacilityConfig = jest.fn();

      mockFacilities([{ id: 'f1' }], { id: 'f1' });
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          fetchFacilityConfig,
        }),
      );

      const { initializeFlow } = createAuthFlow();
      await initializeFlow();

      expect(facilitiesStore.fetchFacilities).toHaveBeenCalled();
      expect(fetchFacilityConfig).toHaveBeenCalled();
    });

    it('returns early when already initialized unless force is true', async () => {
      mockFacilities([{ id: 'f1' }], { id: 'f1' });

      const { initializeFlow } = createAuthFlow();

      await initializeFlow();
      await initializeFlow();
      await initializeFlow(true);

      expect(facilitiesStore.fetchFacilities).toHaveBeenCalledTimes(2);
    });

    it('returns early when no facility is selected or inferable', async () => {
      const fetchFacilityConfig = jest.fn();

      mockFacilities([{ id: 'f1' }, { id: 'f2' }]);
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          fetchFacilityConfig,
        }),
      );

      const { initializeFlow } = createAuthFlow();
      await initializeFlow();

      expect(facilitiesStore.fetchFacilities).toHaveBeenCalled();
      expect(fetchFacilityConfig).not.toHaveBeenCalled();
    });

    it('clears selected facility id when inferred facility does not exist', async () => {
      const setSelectedFacilityId = jest.fn();
      useFacilitySelect.mockReturnValue(
        useFacilitySelectMock({
          selectedFacilityId: computed(() => 'stale_facility'),
          setSelectedFacilityId,
        }),
      );
      mockFacilities([{ id: 'missing' }], null);

      const { initializeFlow } = createAuthFlow();
      await initializeFlow();

      expect(setSelectedFacilityId).toHaveBeenCalledWith(null);
    });

    it('handles facility fetch error through app error handler', async () => {
      const error = new Error('failed facilities');
      facilitiesStore.fetchFacilities.mockRejectedValue(error);
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          fetchFacilityConfig: jest.fn().mockResolvedValue(null),
        }),
      );

      const { initializeFlow } = createAuthFlow();
      await initializeFlow();

      expect(handleApiError).toHaveBeenCalledWith({
        error,
        reloadOnReconnect: true,
      });
    });

    it('handles facility config error through app error handler', async () => {
      const error = new Error('failed config');
      mockFacilities([{ id: 'f1' }], { id: 'f1' });
      useFacilityConfig.mockReturnValue(
        useFacilityConfigMock({
          fetchFacilityConfig: jest.fn().mockRejectedValue(error),
        }),
      );

      const { initializeFlow } = createAuthFlow();
      await initializeFlow();

      expect(handleApiError).toHaveBeenCalledWith({
        error,
        reloadOnReconnect: true,
      });
    });
  });
});
