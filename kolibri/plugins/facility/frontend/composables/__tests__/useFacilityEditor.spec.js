import { computed } from 'vue';
import { useRoute } from 'vue-router/composables';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import useFacilities, { useFacilitiesMock } from 'kolibri-common/composables/useFacilities'; // eslint-disable-line
import { useFacilityConfig, useFacilityConfigMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import store from 'kolibri/store';
import useFacilityEditor from '../useFacilityEditor';

jest.mock('kolibri-common/apiResources/FacilityResource');
jest.mock('kolibri-common/apiResources/FacilityDatasetResource');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/composables/useFacilities');
jest.mock('kolibri-common/composables/useFacility');
jest.mock('vue-router/composables', () => ({
  useRoute: jest.fn(),
}));

const defaultGetters = {
  activeFacilityId: 'default-facility-id',
};

jest.mock('kolibri/store', () => ({
  __esModule: true,
  default: {
    get getters() {
      return this._getters || defaultGetters;
    },
    set getters(value) {
      this._getters = value;
    },
  },
}));

describe('useFacilityEditor', () => {
  const mockFacilityId = 'test-facility-id';
  const mockDatasetId = 'test-dataset-id';

  const mockFacility = {
    id: mockFacilityId,
    name: 'Test Facility',
  };

  const mockFacilityConfig = {
    id: mockDatasetId,
    learner_can_edit_username: true,
    learner_can_edit_password: false,
    learner_can_edit_name: true,
    learner_can_sign_up: false,
    learner_can_login_with_no_password: false,
    show_download_button_in_learn: true,
    extra_fields: { pin_code: '1234' },
  };

  let mockRoute;

  beforeEach(() => {
    mockRoute = {
      params: {},
    };

    useRoute.mockReturnValue(mockRoute);

    // Mock store getters with restoration via spy
    jest.spyOn(store, 'getters', 'get').mockImplementation(() => ({
      activeFacilityId: mockFacilityId,
    }));

    // Mock useFacilities
    useFacilities.mockReturnValue(
      useFacilitiesMock({
        fetchFacilities: jest.fn().mockResolvedValue([mockFacility]),
        getFacility: jest.fn().mockReturnValue(mockFacility),
      }),
    );

    // Mock useFacilityConfig
    useFacilityConfig.mockReturnValue(
      useFacilityConfigMock({
        fetchFacilityConfig: jest.fn().mockResolvedValue(mockFacilityConfig),
        facilityConfig: computed(() => mockFacilityConfig),
      }),
    );

    // Mock urls
    urls['kolibri:core:facilitydataset_update_pin'] = jest
      .fn()
      .mockReturnValue('/api/facility_dataset/update_pin/');
  });

  describe('initialization', () => {
    it('returns reactive state with correct initial values', () => {
      const {
        facilityId,
        facilityDatasetId,
        facilityName,
        settings,
        settingsCopy,
        isFacilityPinValid,
        facilityDataLoading,
      } = useFacilityEditor(mockFacilityId);

      expect(facilityId).toBe(mockFacilityId);
      expect(facilityDatasetId.value).toBe('');
      expect(facilityName.value).toBe('');
      expect(settings.value).toEqual({});
      expect(settingsCopy.value).toEqual({});
      expect(isFacilityPinValid.value).toBe(false);
      expect(facilityDataLoading.value).toBe(false);
    });
  });

  describe('computed properties', () => {
    describe('settingsHaveChanged', () => {
      it('returns false when settings match settingsCopy', () => {
        const { settings, copySettings, settingsHaveChanged } = useFacilityEditor(mockFacilityId);
        settings.value = { learner_can_edit_username: true };
        copySettings();
        expect(settingsHaveChanged.value).toBe(false);
      });

      it('returns true when settings differ from settingsCopy', () => {
        const { settings, copySettings, settingsHaveChanged } = useFacilityEditor(mockFacilityId);
        settings.value = { learner_can_edit_username: true };
        copySettings();
        settings.value.learner_can_edit_username = false;
        expect(settingsHaveChanged.value).toBe(true);
      });
    });

    describe('isPinSet', () => {
      it('returns pin_code when extra_fields.pin_code exists', () => {
        const { settings, isPinSet } = useFacilityEditor(mockFacilityId);
        settings.value = { extra_fields: { pin_code: '5678' } };
        expect(isPinSet.value).toBe('5678');
      });

      it('returns null when extra_fields.pin_code does not exist', () => {
        const { settings, isPinSet } = useFacilityEditor(mockFacilityId);
        settings.value = { extra_fields: {} };
        expect(isPinSet.value).toBe(null);
      });

      it('returns null when extra_fields is undefined', () => {
        const { settings, isPinSet } = useFacilityEditor(mockFacilityId);
        settings.value = {};
        expect(isPinSet.value).toBe(null);
      });
    });
  });

  describe('fetchFacility', () => {
    it('loads facility config and updates reactive state', async () => {
      const { fetchFacility, facilityDatasetId, facilityName, settings, settingsCopy } =
        useFacilityEditor(mockFacilityId);

      await fetchFacility();

      expect(facilityDatasetId.value).toBe(mockDatasetId);
      expect(facilityName.value).toBe('Test Facility');
      expect(settings.value).toEqual(mockFacilityConfig);
      expect(settingsCopy.value).toEqual(mockFacilityConfig);
    });

    it('sets loading state during fetch', async () => {
      const { fetchFacility, facilityDataLoading } = useFacilityEditor(mockFacilityId);

      const fetchPromise = fetchFacility();
      expect(facilityDataLoading.value).toBe(true);

      await fetchPromise;
      expect(facilityDataLoading.value).toBe(false);
    });

    it('resets state on error', async () => {
      const mockError = new Error('Failed to fetch');
      useFacilityConfig.mockReturnValue({
        fetchFacilityConfig: jest.fn().mockRejectedValue(mockError),
        facilityConfig: computed(() => ({})),
      });

      const { fetchFacility, facilityName, settings, settingsCopy } =
        useFacilityEditor(mockFacilityId);

      await expect(fetchFacility()).rejects.toThrow('Failed to fetch');
      expect(facilityName.value).toBe('');
      expect(settings.value).toEqual({});
      expect(settingsCopy.value).toEqual({});
    });
  });

  describe('modifySetting', () => {
    it('updates a setting value', () => {
      const { settings, modifySetting } = useFacilityEditor(mockFacilityId);
      settings.value = { learner_can_edit_username: false };

      modifySetting('learner_can_edit_username', true);

      expect(settings.value.learner_can_edit_username).toBe(true);
    });

    it('does not update non-existent settings', () => {
      const { settings, modifySetting } = useFacilityEditor(mockFacilityId);
      settings.value = { learner_can_edit_username: false };

      modifySetting('non_existent_setting', true);

      expect(settings.value.non_existent_setting).toBeUndefined();
    });

    it('disables learner_can_edit_password when learner_can_login_with_no_password is true', () => {
      const { settings, modifySetting } = useFacilityEditor(mockFacilityId);
      settings.value = {
        learner_can_login_with_no_password: false,
        learner_can_edit_password: true,
      };

      modifySetting('learner_can_login_with_no_password', true);

      expect(settings.value.learner_can_login_with_no_password).toBe(true);
      expect(settings.value.learner_can_edit_password).toBe(false);
    });
  });

  describe('modifyAllSettings', () => {
    it('updates multiple settings at once', () => {
      const { settings, modifyAllSettings } = useFacilityEditor(mockFacilityId);
      settings.value = { learner_can_edit_username: false, learner_can_edit_name: false };

      modifyAllSettings({
        learner_can_edit_username: true,
        learner_can_edit_name: true,
        learner_can_sign_up: true,
      });

      expect(settings.value).toEqual({
        learner_can_edit_username: true,
        learner_can_edit_name: true,
        learner_can_sign_up: true,
      });
    });
  });

  describe('copySettings', () => {
    it('copies current settings to settingsCopy', () => {
      const { settings, settingsCopy, copySettings } = useFacilityEditor(mockFacilityId);
      settings.value = { learner_can_edit_username: true };

      copySettings();

      expect(settingsCopy.value).toEqual({ learner_can_edit_username: true });
    });
  });

  describe('undoSettingsChange', () => {
    it('restores settings from settingsCopy', () => {
      const { settings, settingsCopy, undoSettingsChange } = useFacilityEditor(mockFacilityId);
      settings.value = { learner_can_edit_username: true };
      settingsCopy.value = { learner_can_edit_username: false };

      undoSettingsChange();

      expect(settings.value).toEqual({ learner_can_edit_username: false });
    });
  });

  describe('resetState', () => {
    it('resets all reactive state to initial values', () => {
      const {
        facilityDatasetId,
        facilityName,
        settings,
        settingsCopy,
        isFacilityPinValid,
        facilityDataLoading,
        resetState,
        setLoading,
      } = useFacilityEditor(mockFacilityId);

      // Set non-initial values
      facilityDatasetId.value = 'some-id';
      facilityName.value = 'Some Name';
      settings.value = { learner_can_edit_username: true };
      settingsCopy.value = { learner_can_edit_username: true };
      isFacilityPinValid.value = true;
      setLoading(true);

      resetState();

      expect(facilityDatasetId.value).toBe('');
      expect(facilityName.value).toBe('');
      expect(settings.value).toEqual({});
      expect(settingsCopy.value).toEqual({});
      expect(isFacilityPinValid.value).toBe(false);
      expect(facilityDataLoading.value).toBe(false);
    });
  });

  describe('saveFacilityName', () => {
    it('saves facility name and updates facilities list', async () => {
      const newName = 'New Facility Name';
      FacilityResource.saveModel.mockResolvedValue({ id: mockFacilityId, name: newName });

      const { saveFacilityName, facilityName } = useFacilityEditor(mockFacilityId);

      await saveFacilityName(newName);

      expect(FacilityResource.saveModel).toHaveBeenCalledWith({
        id: mockFacilityId,
        data: { name: newName },
      });
      expect(facilityName.value).toBe(newName);
    });
  });

  describe('saveFacilityConfig', () => {
    it('saves facility config and copies settings', async () => {
      const { saveFacilityConfig, settings, facilityDatasetId } = useFacilityEditor(mockFacilityId);
      settings.value = mockFacilityConfig;
      facilityDatasetId.value = mockDatasetId;

      await saveFacilityConfig();

      expect(FacilityDatasetResource.saveModel).toHaveBeenCalledWith({
        id: mockDatasetId,
        data: mockFacilityConfig,
      });
    });
  });

  describe('setPin', () => {
    it('sets PIN via POST request and saves config', async () => {
      const mockPayload = { pin_code: '9999' };
      const mockResponse = { data: { extra_fields: { pin_code: '9999' } } };

      client.mockResolvedValue(mockResponse);

      const { setPin, settings } = useFacilityEditor(mockFacilityId);
      settings.value = mockFacilityConfig;

      await setPin(mockPayload);

      expect(client).toHaveBeenCalledWith({
        url: '/api/facility_dataset/update_pin/',
        method: 'POST',
        data: mockPayload,
      });
      expect(FacilityDatasetResource.saveModel).toHaveBeenCalled();
    });
  });

  describe('unsetPin', () => {
    it('unsets PIN via PATCH request and saves config', async () => {
      const mockResponse = { data: { extra_fields: {} } };

      client.mockResolvedValue(mockResponse);

      const { unsetPin, settings } = useFacilityEditor(mockFacilityId);
      settings.value = mockFacilityConfig;

      await unsetPin();

      expect(client).toHaveBeenCalledWith({
        url: '/api/facility_dataset/update_pin/',
        method: 'PATCH',
      });
      expect(FacilityDatasetResource.saveModel).toHaveBeenCalled();
    });
  });

  describe('setLoading', () => {
    it('sets facilityDataLoading to true', () => {
      const { setLoading, facilityDataLoading } = useFacilityEditor(mockFacilityId);
      setLoading(true);
      expect(facilityDataLoading.value).toBe(true);
    });

    it('sets facilityDataLoading to false', () => {
      const { setLoading, facilityDataLoading } = useFacilityEditor(mockFacilityId);
      setLoading(true);
      setLoading(false);
      expect(facilityDataLoading.value).toBe(false);
    });
  });
});
