import { ref, nextTick } from 'vue';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
// eslint-disable-next-line import-x/named
import useUser, { useUserMock } from 'kolibri/composables/useUser';
// eslint-disable-next-line import-x/named
import useFacilities, { useFacilitiesMock } from '../useFacilities';
import { OptionsForSignIn } from '../../constants/Auth';

jest.mock('kolibri-common/apiResources/FacilityDatasetResource');
jest.mock('kolibri/composables/useUser');
jest.mock('../useFacilities');
jest.mock('kolibri/utils/i18n', () => ({
  currentLanguage: 'en',
}));

function loadUseFacilityModule() {
  let module;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    module = require('../useFacility');
  });
  return module;
}

describe('useFacilitySelect', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    useUser.mockImplementation(() =>
      useUserMock({
        isUserLoggedIn: false,
        userFacilityId: null,
      }),
    );
    useFacilities.mockImplementation(() => useFacilitiesMock());
  });

  it('persists selected facility for signed out users', () => {
    const { useFacilitySelect } = loadUseFacilityModule();
    const { selectedFacilityId, setSelectedFacilityId } = useFacilitySelect();
    expect(selectedFacilityId.value).toBeNull();
    setSelectedFacilityId('facility-1');
    expect(selectedFacilityId.value).toBe('facility-1');
  });

  it('uses user facility for logged-in users who are not multi-facility admins', () => {
    window.localStorage.setItem('facilityId', 'facility-2');
    useUser.mockImplementation(() =>
      useUserMock({
        isUserLoggedIn: true,
        userFacilityId: 'facility-1',
      }),
    );
    useFacilities.mockImplementation(() =>
      useFacilitiesMock({
        userIsMultiFacilityAdmin: ref(false),
      }),
    );

    const { useFacilitySelect } = loadUseFacilityModule();
    const { selectedFacilityId, setSelectedFacilityId } = useFacilitySelect();
    expect(selectedFacilityId.value).toBe('facility-1');

    setSelectedFacilityId('facility-3');
    expect(window.localStorage.getItem('facilityId')).toBe('facility-2');
    expect(selectedFacilityId.value).toBe('facility-1');
  });

  it('allows multi-facility admins to select and persist facility while logged in', async () => {
    window.localStorage.setItem('facilityId', 'facility-2');
    useUser.mockImplementation(() =>
      useUserMock({
        isUserLoggedIn: true,
        userFacilityId: 'facility-1',
      }),
    );
    useFacilities.mockImplementation(() =>
      useFacilitiesMock({
        userIsMultiFacilityAdmin: ref(true),
      }),
    );

    const { useFacilitySelect } = loadUseFacilityModule();
    const { selectedFacilityId, setSelectedFacilityId } = useFacilitySelect();
    expect(selectedFacilityId.value).toBe('facility-2');

    setSelectedFacilityId('facility-3');
    await nextTick();
    expect(window.localStorage.getItem('facilityId')).toBe('facility-3');
    expect(selectedFacilityId.value).toBe('facility-3');
  });
});

describe('useFacility', () => {
  const mockFacilities = [
    { id: 'facility-1', name: 'Facility 1', dataset: { id: 'dataset-1' } },
    { id: 'facility-2', name: 'Facility 2', dataset: { id: 'dataset-2' } },
  ];

  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    FacilityDatasetResource.fetchCollection.mockResolvedValue([]);

    useUser.mockImplementation(() =>
      useUserMock({
        isUserLoggedIn: false,
        userFacilityId: null,
      }),
    );
    useFacilities.mockImplementation(() =>
      useFacilitiesMock({
        fetchFacility: jest.fn(),
        getFacility: jest.fn().mockReturnValue(null),
      }),
    );
  });

  describe('initial state', () => {
    it('returns empty object for selectedFacility initially', () => {
      const { default: useFacility } = loadUseFacilityModule();
      const { selectedFacility } = useFacility();
      expect(selectedFacility.value).toEqual({});
    });

    it('returns undefined for currentFacilityName initially', () => {
      const { default: useFacility } = loadUseFacilityModule();
      const { currentFacilityName } = useFacility();
      expect(currentFacilityName.value).toBeUndefined();
    });

    it('returns null for facilityId initially', () => {
      const { default: useFacility } = loadUseFacilityModule();
      const { facilityId } = useFacility();
      expect(facilityId.value).toBeNull();
    });
  });

  describe('selectedFacility', () => {
    it('returns facility matching userFacilityId', () => {
      useUser.mockImplementation(() =>
        useUserMock({
          isUserLoggedIn: true,
          userFacilityId: 'facility-1',
        }),
      );
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          userIsMultiFacilityAdmin: ref(false),
          getFacility: jest.fn().mockImplementation(id => mockFacilities.find(f => f.id === id)),
        }),
      );
      const { default: useFacility } = loadUseFacilityModule();
      const { selectedFacility } = useFacility();
      expect(selectedFacility.value).toEqual(mockFacilities[0]);
    });

    it('uses persisted selected facility when user is signed out', () => {
      window.localStorage.setItem('facilityId', 'facility-2');
      useUser.mockImplementation(() =>
        useUserMock({
          isUserLoggedIn: false,
          userFacilityId: 'facility-1',
        }),
      );
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          getFacility: jest.fn().mockImplementation(id => mockFacilities.find(f => f.id === id)),
        }),
      );
      const { default: useFacility } = loadUseFacilityModule();
      const { selectedFacility, facilityId } = useFacility();
      expect(facilityId.value).toBe('facility-2');
      expect(selectedFacility.value).toEqual(mockFacilities[1]);
    });

    it('returns empty object when facility is not found', () => {
      const { default: useFacility } = loadUseFacilityModule();
      const { selectedFacility } = useFacility();
      expect(selectedFacility.value).toEqual({});
    });
  });

  describe('facilityId', () => {
    it('returns id of selected facility', () => {
      useUser.mockImplementation(() =>
        useUserMock({
          isUserLoggedIn: true,
          userFacilityId: 'facility-1',
        }),
      );
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          userIsMultiFacilityAdmin: ref(false),
          getFacility: jest.fn().mockReturnValue(mockFacilities[0]),
        }),
      );
      const { default: useFacility } = loadUseFacilityModule();
      const { facilityId } = useFacility();
      expect(facilityId.value).toBe('facility-1');
    });
  });

  describe('currentFacilityName', () => {
    it('returns name of selected facility', () => {
      useUser.mockImplementation(() =>
        useUserMock({
          isUserLoggedIn: true,
          userFacilityId: 'facility-1',
        }),
      );
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          userIsMultiFacilityAdmin: ref(false),
          getFacility: jest.fn().mockReturnValue(mockFacilities[0]),
        }),
      );
      const { default: useFacility } = loadUseFacilityModule();
      const { currentFacilityName } = useFacility();
      expect(currentFacilityName.value).toBe('Facility 1');
    });
  });

  describe('facilityConfig', () => {
    it('does not derive config from facility dataset', () => {
      const facilityWithDataset = {
        id: 'facility-1',
        name: 'Facility 1',
        dataset: { id: 'dataset-1', learner_can_edit_username: true },
      };

      useUser.mockImplementation(() =>
        useUserMock({
          isUserLoggedIn: true,
          userFacilityId: 'facility-1',
        }),
      );
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          getFacility: jest.fn().mockReturnValue(facilityWithDataset),
        }),
      );

      const { default: useFacility } = loadUseFacilityModule();
      const { facilityConfig } = useFacility();
      expect(facilityConfig.value).toEqual({});
    });

    it('uses fetched config when available', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([
        { id: 'dataset-2', setting: true },
      ]);
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          fetchFacility: jest.fn().mockResolvedValue(),
          getFacility: jest.fn().mockImplementation(id => mockFacilities.find(f => f.id === id)),
        }),
      );

      const { default: useFacility } = loadUseFacilityModule();
      const { setFacilityId, facilityConfig } = useFacility();
      await setFacilityId('facility-2');
      expect(facilityConfig.value).toEqual({ id: 'dataset-2', setting: true });
    });
  });

  describe('setFacilityId', () => {
    it('sets the facilityId and updates config', async () => {
      const fetchFacility = jest.fn().mockResolvedValue();
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          fetchFacility,
          getFacility: jest.fn().mockImplementation(id => mockFacilities.find(f => f.id === id)),
        }),
      );
      const { default: useFacility } = loadUseFacilityModule();
      const { setFacilityId, facilityId } = useFacility();
      await setFacilityId('facility-2');
      expect(fetchFacility).toHaveBeenCalledWith('facility-2');
      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-2' },
        force: true,
      });
      expect(facilityId.value).toBe('facility-2');
    });
  });

  describe('updateFacilityConfig', () => {
    it('fetches config with the selected facility id', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([{ id: 'dataset-1' }]);
      useUser.mockImplementation(() =>
        useUserMock({
          isUserLoggedIn: true,
          userFacilityId: 'facility-1',
        }),
      );
      useFacilities.mockImplementation(() =>
        useFacilitiesMock({
          userIsMultiFacilityAdmin: ref(false),
          getFacility: jest.fn().mockReturnValue(mockFacilities[0]),
        }),
      );
      const { default: useFacility } = loadUseFacilityModule();
      const { updateFacilityConfig } = useFacility();
      const result = await updateFacilityConfig();
      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-1' },
        force: true,
      });
      expect(result).toEqual({ id: 'dataset-1' });
    });

    it('does nothing when no facilityId is available', async () => {
      const { default: useFacility } = loadUseFacilityModule();
      const { updateFacilityConfig } = useFacility();
      const result = await updateFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});

describe('useFacilityConfig', () => {
  const mockFacilityConfig = {
    id: 'dataset-1',
    learner_can_edit_username: true,
    learner_can_edit_password: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns empty facilityConfig initially', () => {
      const { useFacilityConfig } = loadUseFacilityModule();
      const { facilityConfig } = useFacilityConfig('facility-1');
      expect(facilityConfig.value).toEqual({});
    });

    it('returns isAttendanceFeatureEnabled as true when currentLanguage is en', () => {
      const { useFacilityConfig } = loadUseFacilityModule();
      const { isAttendanceFeatureEnabled } = useFacilityConfig('facility-1');
      expect(isAttendanceFeatureEnabled.value).toBe(true);
    });

    it('returns isPictureLoginFeatureEnabled as true when currentLanguage is en', () => {
      const { useFacilityConfig } = loadUseFacilityModule();
      const { isPictureLoginFeatureEnabled } = useFacilityConfig('facility-1');
      expect(isPictureLoginFeatureEnabled.value).toBe(true);
    });

    it('returns signInOptions with USERNAME_PASSWORD by default', () => {
      const { useFacilityConfig } = loadUseFacilityModule();
      const { signInOptions } = useFacilityConfig('facility-1');
      // Default config has learner_can_login_with_no_password: false, so USERNAME_PASSWORD
      expect(signInOptions.value).toEqual([OptionsForSignIn.USERNAME_PASSWORD]);
    });

    it('returns null for picturePasswordSettings initially', () => {
      const { useFacilityConfig } = loadUseFacilityModule();
      const { picturePasswordSettings } = useFacilityConfig('facility-1');
      expect(picturePasswordSettings.value).toBeNull();
    });
  });

  describe('signInOptions computed', () => {
    it('includes PICTURE_PASSWORD when picture_password_settings is set', async () => {
      const configWithPicturePassword = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'colorful' },
      };

      FacilityDatasetResource.fetchCollection.mockResolvedValue([configWithPicturePassword]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, signInOptions } = useFacilityConfig('facility-1');
      await fetchFacilityConfig();
      expect(signInOptions.value).toContain(OptionsForSignIn.PICTURE_PASSWORD);
    });

    it('includes USERNAME_ONLY when learner_can_login_with_no_password is true', async () => {
      const configWithUsernameOnly = {
        ...mockFacilityConfig,
        learner_can_login_with_no_password: true,
      };

      FacilityDatasetResource.fetchCollection.mockResolvedValue([configWithUsernameOnly]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, signInOptions } = useFacilityConfig('facility-1');
      await fetchFacilityConfig();
      expect(signInOptions.value).toContain(OptionsForSignIn.USERNAME_ONLY);
    });

    it('includes USERNAME_PASSWORD when learner_can_login_with_no_password is false', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, signInOptions } = useFacilityConfig('facility-1');
      await fetchFacilityConfig();
      expect(signInOptions.value).toContain(OptionsForSignIn.USERNAME_PASSWORD);
    });
  });

  describe('picturePasswordSettings computed', () => {
    it('returns picture_password_settings when PICTURE_PASSWORD is in signInOptions', async () => {
      const configWithPicturePassword = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'colorful', show_icon_names: false },
        learner_can_login_with_no_password: true,
      };

      FacilityDatasetResource.fetchCollection.mockResolvedValue([configWithPicturePassword]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, picturePasswordSettings } = useFacilityConfig('facility-1');
      await fetchFacilityConfig();
      expect(picturePasswordSettings.value).toEqual({
        icon_style: 'colorful',
        show_icon_names: false,
      });
    });

    it('returns null when PICTURE_PASSWORD is not in signInOptions', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, picturePasswordSettings } = useFacilityConfig('facility-1');
      await fetchFacilityConfig();
      expect(picturePasswordSettings.value).toBeNull();
    });
  });

  describe('fetchFacilityConfig', () => {
    it('fetches facility config for given facilityId', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, facilityConfig } = useFacilityConfig('facility-1');
      const result = await fetchFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-1' },
        force: true,
      });
      expect(result).toEqual(mockFacilityConfig);
      expect(facilityConfig.value).toEqual(result);
      expect(facilityConfig.value).toEqual(mockFacilityConfig);
    });

    it('uses provided facilityId parameter over constructor parameter', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig } = useFacilityConfig('facility-1');
      await fetchFacilityConfig('facility-2');

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-2' },
        force: true,
      });
    });

    it('does nothing when no facilityId is provided', async () => {
      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, facilityConfig } = useFacilityConfig(null);
      const result = await fetchFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).not.toHaveBeenCalled();
      expect(facilityConfig.value).toEqual({});
      expect(result).toBeUndefined();
    });

    it('returns empty config when facility is not found', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([]);

      const { useFacilityConfig } = loadUseFacilityModule();
      const { fetchFacilityConfig, facilityConfig } = useFacilityConfig('facility-1');
      const result = await fetchFacilityConfig();

      expect(facilityConfig.value).toEqual({});
      expect(result).toEqual({});
    });
  });
});
