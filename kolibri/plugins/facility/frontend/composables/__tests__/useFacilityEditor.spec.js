import { computed, ref } from 'vue';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import client from 'kolibri/client';
import urls from 'kolibri/urls';
import useFacility, { useFacilityMock } from 'kolibri-common/composables/useFacility'; // eslint-disable-line
import { OptionsForSignIn, PicturePasswordIconStyle } from 'kolibri-common/constants/Auth';
import useFacilityEditor from '../useFacilityEditor';

jest.mock('kolibri-common/apiResources/FacilityResource');
jest.mock('kolibri-common/apiResources/FacilityDatasetResource');
jest.mock('kolibri/client');
jest.mock('kolibri/urls');
jest.mock('kolibri-common/composables/useFacility');

function mockSignInOptions(facilityConfig) {
  return computed(() => {
    const options = [];
    if (facilityConfig.value.picture_password_settings) {
      options.push(OptionsForSignIn.PICTURE_PASSWORD);
    }
    if (facilityConfig.value.learner_can_login_with_no_password) {
      options.push(OptionsForSignIn.USERNAME_ONLY);
    } else {
      options.push(OptionsForSignIn.USERNAME_PASSWORD);
    }
    return options;
  });
}

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
    extra_fields: { pin_code: '5678' },
  };

  function buildUseFacilityState(overrides = {}) {
    const facilityConfig = overrides.facilityConfig || ref(mockFacilityConfig);
    const signInOptions =
      overrides.signInOptions || computed(() => [OptionsForSignIn.USERNAME_PASSWORD]);
    const picturePasswordSettings =
      overrides.picturePasswordSettings ||
      computed(() => {
        if (signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
          return facilityConfig.value.picture_password_settings;
        }
        return null;
      });

    return useFacilityMock({
      facilityId: ref(mockFacilityId),
      selectedFacility: ref(mockFacility),
      facilityConfig,
      isAttendanceFeatureEnabled: computed(() => true),
      isPictureLoginFeatureEnabled: computed(() => true),
      signInOptions,
      picturePasswordSettings,
      fetchFacility: jest.fn().mockResolvedValue(mockFacility),
      fetchFacilityConfig: jest.fn().mockResolvedValue(mockFacilityConfig),
      ...overrides,
    });
  }

  beforeEach(() => {
    useFacility.mockReturnValue(buildUseFacilityState());

    // Mock urls
    urls['kolibri:core:facilitydataset_update_pin'] = jest
      .fn()
      .mockReturnValue('/api/facility_dataset/update_pin/');
  });

  describe('initialization', () => {
    it('returns reactive state with correct initial values', () => {
      const {
        facilityDatasetId,
        facilityName,
        settings,
        settingsCopy,
        isFacilityPinValid,
        facilityDataLoading,
      } = useFacilityEditor();

      expect(facilityDatasetId.value).toBe('');
      expect(facilityName.value).toBe('');
      expect(settings.value).toEqual(mockFacilityConfig);
      expect(settingsCopy.value).toEqual({});
      expect(isFacilityPinValid.value).toBe(false);
      expect(facilityDataLoading.value).toBe(false);
    });

    it('returns computed properties with correct initial values', () => {
      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig: ref({}),
          signInOptions: computed(() => [OptionsForSignIn.USERNAME_PASSWORD]),
        }),
      );

      const {
        settingsHaveChanged,
        isPinSet,
        isAttendanceFeatureEnabled,
        isPictureLoginFeatureEnabled,
        signInOption,
        signInOptions,
        picturePasswordSettings,
        picturePasswordStyle,
        picturePasswordShowIconText,
      } = useFacilityEditor();

      expect(settingsHaveChanged.value).toBe(false);
      expect(isPinSet.value).toBeNull();
      expect(isAttendanceFeatureEnabled.value).toBeDefined();
      expect(isPictureLoginFeatureEnabled.value).toBeDefined();
      expect(signInOption.value).toBe(OptionsForSignIn.USERNAME_PASSWORD);
      expect(signInOptions.value).toEqual([OptionsForSignIn.USERNAME_PASSWORD]);
      expect(picturePasswordSettings.value).toBeNull();
      expect(picturePasswordStyle.value).toBeUndefined();
      expect(picturePasswordShowIconText.value).toBeUndefined();
    });
  });

  describe('computed properties', () => {
    describe('settingsHaveChanged', () => {
      it('returns false when settings match settingsCopy', () => {
        const { settings, copySettings, settingsHaveChanged } = useFacilityEditor();
        settings.value = { learner_can_edit_username: true };
        copySettings();
        expect(settingsHaveChanged.value).toBe(false);
      });

      it('returns true when settings differ from settingsCopy', () => {
        const { settings, copySettings, settingsHaveChanged } = useFacilityEditor();
        settings.value = { learner_can_edit_username: true };
        copySettings();
        settings.value.learner_can_edit_username = false;
        expect(settingsHaveChanged.value).toBe(true);
      });
    });

    describe('isPinSet', () => {
      it('returns pin_code when extra_fields.pin_code exists', () => {
        const { settings, isPinSet } = useFacilityEditor();
        settings.value = { extra_fields: { pin_code: '5678' } };
        expect(isPinSet.value).toBe('5678');
      });

      it('returns null when extra_fields.pin_code does not exist', () => {
        const { settings, isPinSet } = useFacilityEditor();
        settings.value = { extra_fields: {} };
        expect(isPinSet.value).toBe(null);
      });

      it('returns null when extra_fields is undefined', () => {
        const { settings, isPinSet } = useFacilityEditor();
        settings.value = {};
        expect(isPinSet.value).toBe(null);
      });
    });
  });

  describe('fetchFacility', () => {
    it('delegates to useFacility fetchFacility', async () => {
      const fetchFacilityMock = jest.fn().mockResolvedValue();
      useFacility.mockReturnValue(
        buildUseFacilityState({
          fetchFacility: fetchFacilityMock,
        }),
      );

      const { fetchFacility } = useFacilityEditor();

      await fetchFacility();

      expect(fetchFacilityMock).toHaveBeenCalledTimes(1);
    });

    it('keeps local facility identity state unchanged when fetchFacility is delegated', async () => {
      const { fetchFacility, facilityDatasetId, facilityName, settings, settingsCopy } =
        useFacilityEditor();

      await fetchFacility();

      expect(facilityDatasetId.value).toBe('');
      expect(facilityName.value).toBe('');
      expect(settings.value).toEqual(mockFacilityConfig);
      expect(settingsCopy.value).toEqual({});
    });
  });

  describe('modifySetting', () => {
    it('updates a setting value', () => {
      const { settings, modifySetting } = useFacilityEditor();
      settings.value = { learner_can_edit_username: false };

      modifySetting('learner_can_edit_username', true);

      expect(settings.value.learner_can_edit_username).toBe(true);
    });

    it('does not update non-existent settings', () => {
      const { settings, modifySetting } = useFacilityEditor();
      settings.value = { learner_can_edit_username: false };

      modifySetting('non_existent_setting', true);

      expect(settings.value.non_existent_setting).toBeUndefined();
    });

    it('disables learner_can_edit_password when learner_can_login_with_no_password is true', () => {
      const { settings, modifySetting } = useFacilityEditor();
      settings.value = {
        learner_can_login_with_no_password: false,
        learner_can_edit_password: true,
      };

      modifySetting('learner_can_login_with_no_password', true);

      expect(settings.value.learner_can_login_with_no_password).toBe(true);
      expect(settings.value.learner_can_edit_password).toBe(false);
    });
  });

  describe('signInOption computed', () => {
    it('returns PICTURE_PASSWORD when in signInOptions', () => {
      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig: ref({
            ...mockFacilityConfig,
            picture_password_settings: { icon_style: 'colorful' },
          }),
          signInOptions: computed(() => [OptionsForSignIn.PICTURE_PASSWORD]),
        }),
      );

      const { signInOption } = useFacilityEditor();
      expect(signInOption.value).toBe(OptionsForSignIn.PICTURE_PASSWORD);
    });

    it('returns first signInOption when PICTURE_PASSWORD is not available', () => {
      const { signInOption } = useFacilityEditor();
      expect(signInOption.value).toBe(OptionsForSignIn.USERNAME_PASSWORD);
    });

    it('sets signInOption via modifySignInOption', () => {
      const facilityConfig = ref({
        ...mockFacilityConfig,
        learner_can_login_with_no_password: false,
        picture_password_settings: null,
      });
      const signInOptions = mockSignInOptions(facilityConfig);
      const picturePasswordSettings = computed(() => {
        if (signInOptions.value.includes(OptionsForSignIn.PICTURE_PASSWORD)) {
          return facilityConfig.value.picture_password_settings;
        }
        return null;
      });

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions,
          picturePasswordSettings,
        }),
      );

      const { signInOption, modifySignInOption, settings } = useFacilityEditor();
      expect(signInOption.value).toBe(OptionsForSignIn.USERNAME_PASSWORD);
      modifySignInOption(OptionsForSignIn.PICTURE_PASSWORD);
      // modifySignInOption updates settings.value which is the same ref as facilityConfig
      expect(settings.value.learner_can_login_with_no_password).toBe(true);
      expect(settings.value.picture_password_settings).toBeDefined();
      expect(signInOption.value).toBe(OptionsForSignIn.PICTURE_PASSWORD);
    });
  });

  describe('picturePasswordStyle computed', () => {
    it('returns icon_style from picture_password_settings', () => {
      const facilityConfig = ref({
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: PicturePasswordIconStyle.STANDARD },
        learner_can_login_with_no_password: true,
      });

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions: computed(() => [OptionsForSignIn.PICTURE_PASSWORD]),
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { picturePasswordStyle } = useFacilityEditor();
      expect(picturePasswordStyle.value).toBe(PicturePasswordIconStyle.STANDARD);
    });

    it('sets picturePasswordStyle via modifyPicturePasswordSetting', () => {
      const facilityConfig = ref({
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: PicturePasswordIconStyle.COLORFUL },
        learner_can_login_with_no_password: true,
      });

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions: computed(() => [OptionsForSignIn.PICTURE_PASSWORD]),
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { picturePasswordStyle, modifyPicturePasswordSetting } = useFacilityEditor();
      modifyPicturePasswordSetting('icon_style', PicturePasswordIconStyle.STANDARD);
      expect(picturePasswordStyle.value).toBe(PicturePasswordIconStyle.STANDARD);
    });
  });

  describe('picturePasswordShowIconText computed', () => {
    it('returns show_icon_text from picture_password_settings', () => {
      const facilityConfig = ref({
        ...mockFacilityConfig,
        picture_password_settings: { show_icon_text: true },
        learner_can_login_with_no_password: true,
      });

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions: computed(() => [OptionsForSignIn.PICTURE_PASSWORD]),
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { picturePasswordShowIconText } = useFacilityEditor();
      expect(picturePasswordShowIconText.value).toBe(true);
    });

    it('sets picturePasswordShowIconText via modifyPicturePasswordSetting', () => {
      const facilityConfig = ref({
        ...mockFacilityConfig,
        picture_password_settings: { show_icon_text: false },
        learner_can_login_with_no_password: true,
      });

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions: computed(() => [OptionsForSignIn.PICTURE_PASSWORD]),
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { picturePasswordShowIconText, modifyPicturePasswordSetting } = useFacilityEditor();
      modifyPicturePasswordSetting('show_icon_text', true);
      expect(picturePasswordShowIconText.value).toBe(true);
    });
  });

  describe('modifySignInOption', () => {
    it('sets PICTURE_PASSWORD and default picture_password_settings', () => {
      const facilityConfig = ref({
        learner_can_login_with_no_password: false,
        picture_password_settings: null,
      });
      const signInOptions = mockSignInOptions(facilityConfig);

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions,
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { settings, modifySignInOption } = useFacilityEditor();

      modifySignInOption(OptionsForSignIn.PICTURE_PASSWORD);

      expect(settings.value.learner_can_login_with_no_password).toBe(true);
      expect(settings.value.picture_password_settings).toEqual({
        icon_style: PicturePasswordIconStyle.COLORFUL,
        show_icon_text: false,
      });
    });

    it('sets USERNAME_ONLY and clears picture_password_settings', () => {
      const facilityConfig = ref({
        learner_can_login_with_no_password: false,
        picture_password_settings: { icon_style: 'colorful' },
      });
      const signInOptions = mockSignInOptions(facilityConfig);

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions,
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { settings, modifySignInOption } = useFacilityEditor();

      modifySignInOption(OptionsForSignIn.USERNAME_ONLY);

      expect(settings.value.learner_can_login_with_no_password).toBe(true);
      expect(settings.value.picture_password_settings).toBeNull();
    });

    it('sets USERNAME_PASSWORD and clears picture_password_settings', () => {
      const facilityConfig = ref({
        learner_can_login_with_no_password: true,
        picture_password_settings: { icon_style: 'colorful' },
      });
      const signInOptions = mockSignInOptions(facilityConfig);

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions,
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { settings, modifySignInOption } = useFacilityEditor();

      modifySignInOption(OptionsForSignIn.USERNAME_PASSWORD);

      expect(settings.value.learner_can_login_with_no_password).toBe(false);
      expect(settings.value.picture_password_settings).toBeNull();
    });
  });

  describe('modifyPicturePasswordSetting', () => {
    it('updates picture_password_settings when PICTURE_PASSWORD is enabled', () => {
      const facilityConfig = ref({
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'colorful' },
        learner_can_login_with_no_password: true,
      });

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
          signInOptions: computed(() => [OptionsForSignIn.PICTURE_PASSWORD]),
          picturePasswordSettings: computed(() => facilityConfig.value.picture_password_settings),
        }),
      );

      const { settings, modifyPicturePasswordSetting } = useFacilityEditor();

      modifyPicturePasswordSetting('icon_style', PicturePasswordIconStyle.STANDARD);

      expect(settings.value.picture_password_settings.icon_style).toBe(
        PicturePasswordIconStyle.STANDARD,
      );
    });
  });

  describe('modifyExtraFields', () => {
    it('updates extra_fields in settings', () => {
      const facilityConfig = ref({ extra_fields: { pin_code: '1234' } });

      useFacility.mockReturnValue(
        buildUseFacilityState({
          facilityConfig,
        }),
      );

      const { settings, modifyExtraFields } = useFacilityEditor();

      modifyExtraFields({ pin_code: '5678' });

      expect(settings.value.extra_fields).toEqual({ pin_code: '5678' });
    });
  });

  describe('copySettings', () => {
    it('copies current settings to settingsCopy', () => {
      const { settings, settingsCopy, copySettings } = useFacilityEditor();
      settings.value = { learner_can_edit_username: true };

      copySettings();

      expect(settingsCopy.value).toEqual({ learner_can_edit_username: true });
    });
  });

  describe('undoSettingsChange', () => {
    it('restores settings from settingsCopy', () => {
      const { settings, settingsCopy, undoSettingsChange } = useFacilityEditor();
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
      } = useFacilityEditor();

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
      expect(settingsCopy.value).toEqual({});
      expect(isFacilityPinValid.value).toBe(false);
      expect(facilityDataLoading.value).toBe(false);
    });
  });

  describe('saveFacilityName', () => {
    it('saves facility name and updates facilities list', async () => {
      const newName = 'New Facility Name';
      FacilityResource.saveModel.mockResolvedValue({ id: mockFacilityId, name: newName });

      const { saveFacilityName, facilityName } = useFacilityEditor();

      await saveFacilityName(newName);

      expect(FacilityResource.saveModel).toHaveBeenCalledWith({
        id: mockFacilityId,
        data: { name: newName },
      });
      expect(facilityName.value).toBe(newName);
    });
  });

  describe('saveFacilityConfig', () => {
    it('saves facility config excluding login settings fields', async () => {
      const { saveFacilityConfig, settings, facilityDatasetId } = useFacilityEditor();
      settings.value = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'standard', show_icon_text: true },
      };
      facilityDatasetId.value = mockDatasetId;

      await saveFacilityConfig();

      const savedData = FacilityDatasetResource.saveModel.mock.calls[0][0].data;
      expect(savedData).not.toHaveProperty('picture_password_settings');
      expect(savedData).not.toHaveProperty('learner_can_login_with_no_password');
      expect(savedData).not.toHaveProperty('learner_can_edit_password');
      expect(savedData).toHaveProperty('learner_can_edit_username');
      expect(savedData).toHaveProperty('id');
    });
  });

  describe('setPin', () => {
    it('sets PIN via POST request and saves config', async () => {
      const mockPayload = { pin_code: '9999' };
      const mockResponse = { data: { extra_fields: { pin_code: '9999' } } };

      client.mockResolvedValue(mockResponse);

      const { setPin, settings } = useFacilityEditor();
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

      const { unsetPin, settings } = useFacilityEditor();
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
      const { setLoading, facilityDataLoading } = useFacilityEditor();
      setLoading(true);
      expect(facilityDataLoading.value).toBe(true);
    });

    it('sets facilityDataLoading to false', () => {
      const { setLoading, facilityDataLoading } = useFacilityEditor();
      setLoading(true);
      setLoading(false);
      expect(facilityDataLoading.value).toBe(false);
    });
  });

  describe('saveFacilityLoginSettings', () => {
    beforeEach(() => {
      urls['kolibri:core:facilitydataset_save_facility_login_settings'] = jest
        .fn()
        .mockReturnValue('/api/facility_dataset/save_facility_login_settings/');
    });

    it('calls the save-facility-login-settings endpoint via PATCH with login fields', async () => {
      client.mockResolvedValue({ data: {} });

      const { saveFacilityLoginSettings, settings, facilityDatasetId } = useFacilityEditor();
      settings.value = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'standard', show_icon_text: true },
        learner_can_login_with_no_password: true,
        learner_can_edit_password: false,
      };
      facilityDatasetId.value = mockDatasetId;

      await saveFacilityLoginSettings();

      expect(client).toHaveBeenCalledWith({
        url: '/api/facility_dataset/save_facility_login_settings/',
        method: 'PATCH',
        data: {
          picture_password_settings: { icon_style: 'standard', show_icon_text: true },
          learner_can_login_with_no_password: true,
          learner_can_edit_password: false,
        },
      });
    });

    it('stores the returned task id when a task is enqueued', async () => {
      client.mockResolvedValue({
        status: 202,
        data: { dataset: {}, task: { id: 'task-123', status: 'QUEUED' } },
      });

      const { saveFacilityLoginSettings, pictureLoginTaskId, settings, facilityDatasetId } =
        useFacilityEditor();
      settings.value = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'standard', show_icon_text: true },
        learner_can_login_with_no_password: true,
        learner_can_edit_password: false,
      };
      facilityDatasetId.value = mockDatasetId;

      await saveFacilityLoginSettings();

      expect(pictureLoginTaskId.value).toBe('task-123');
    });

    it('does not set task id when no task is enqueued', async () => {
      client.mockResolvedValue({ status: 200, data: { dataset: { id: 'dataset-id' } } });

      const { saveFacilityLoginSettings, pictureLoginTaskId, settings, facilityDatasetId } =
        useFacilityEditor();
      settings.value = { ...mockFacilityConfig };
      facilityDatasetId.value = mockDatasetId;

      await saveFacilityLoginSettings();

      expect(pictureLoginTaskId.value).toBeNull();
    });

    it('returns the response data', async () => {
      const mockTaskData = {
        dataset: { id: 'dataset-id' },
        task: { id: 'task-123', status: 'QUEUED', percentage: 0 },
      };
      client.mockResolvedValue({ status: 202, data: mockTaskData });

      const { saveFacilityLoginSettings, settings, facilityDatasetId } = useFacilityEditor();
      settings.value = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'standard', show_icon_text: true },
        learner_can_login_with_no_password: true,
        learner_can_edit_password: false,
      };
      facilityDatasetId.value = mockDatasetId;

      const result = await saveFacilityLoginSettings();

      expect(result).toEqual(mockTaskData);
    });
  });
});
