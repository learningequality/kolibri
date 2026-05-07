import { ref, nextTick } from 'vue';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
// eslint-disable-next-line import-x/named
import useUser, { useUserMock } from 'kolibri/composables/useUser';
// eslint-disable-next-line import-x/named
import useFacilities, { useFacilitiesMock } from '../useFacilities';
import useFacility, { useFacilitySelect, useFacilityConfig } from '../useFacility';
import { OptionsForSignIn } from '../../constants/Auth';

jest.mock('kolibri-common/apiResources/FacilityDatasetResource');
jest.mock('kolibri/composables/useUser');
jest.mock('../useFacilities');
jest.mock('kolibri/utils/i18n', () => ({
  currentLanguage: 'en',
}));

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

  const mockFacilityConfig = {
    id: 'dataset-1',
    learner_can_edit_username: true,
    learner_can_edit_password: false,
  };

  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();

    // Mock useUser - return null to start with no facility selected
    useUser.mockReturnValue({
      userFacilityId: ref(null),
    });

    // Mock useFacilities - return null for getFacility initially
    useFacilities.mockReturnValue({
      fetchFacilities: jest.fn(),
      getFacility: jest.fn().mockReturnValue(null),
    });
  });

  describe('initial state', () => {
    it('returns empty object for selectedFacility initially', () => {
      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(null),
      });

      const { selectedFacility } = useFacility();
      expect(selectedFacility.value).toEqual({});
    });

    it('returns undefined for currentFacilityName initially', () => {
      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(null),
      });

      const { currentFacilityName } = useFacility();
      expect(currentFacilityName.value).toBeUndefined();
    });

    it('returns undefined for facilityId initially', () => {
      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(null),
      });

      const { facilityId } = useFacility();
      expect(facilityId.value).toBeUndefined();
    });
  });

  describe('selectedFacility', () => {
    it('returns facility matching userFacilityId', () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(mockFacilities[0]),
      });

      const { selectedFacility } = useFacility();
      expect(selectedFacility.value).toEqual(mockFacilities[0]);
    });

    it('uses userFacilityId when no Lockr facility is saved', () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockImplementation(id => mockFacilities.find(f => f.id === id)),
      });

      const { selectedFacility, facilityId } = useFacility();
      expect(facilityId.value).toBe('facility-1');
      expect(selectedFacility.value).toEqual(mockFacilities[0]);
    });

    it('returns empty object when facility is not found', () => {
      useUser.mockReturnValue({
        userFacilityId: ref(null),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(null),
      });

      const { selectedFacility } = useFacility();
      expect(selectedFacility.value).toEqual({});
    });
  });

  describe('facilityId', () => {
    it('returns id of selected facility', () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(mockFacilities[0]),
      });

      const { facilityId } = useFacility();
      expect(facilityId.value).toBe('facility-1');
    });
  });

  describe('currentFacilityName', () => {
    it('returns name of selected facility', () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(mockFacilities[0]),
      });

      const { currentFacilityName } = useFacility();
      expect(currentFacilityName.value).toBe('Facility 1');
    });
  });

  describe('facilityConfig', () => {
    it('returns dataset from facility object when available', () => {
      const facilityWithDataset = {
        id: 'facility-1',
        name: 'Facility 1',
        dataset: { id: 'dataset-1', learner_can_edit_username: true },
      };

      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(facilityWithDataset),
      });

      const { facilityConfig } = useFacility();
      expect(facilityConfig.value).toEqual(facilityWithDataset.dataset);
    });
  });

  describe('setFacilityId', () => {
    it('sets the facilityId and updates config', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      // getFacility should return the facility for the new ID after setFacilityId is called
      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockImplementation(id => mockFacilities.find(f => f.id === id)),
      });

      const { setFacilityId, facilityId } = useFacility();

      await setFacilityId('facility-2');

      expect(facilityId.value).toBe('facility-2');
    });
  });

  describe('updateFacilityConfig', () => {
    it('returns dataset from facility when it is a plain object', async () => {
      const facilityWithDataset = {
        id: 'facility-1',
        name: 'Facility 1',
        dataset: { id: 'dataset-1' },
      };

      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(facilityWithDataset),
      });

      const { updateFacilityConfig } = useFacility();
      const result = await updateFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).not.toHaveBeenCalled();
      expect(result).toEqual(facilityWithDataset.dataset);
    });

    it('fetches config from API when facility dataset is not a plain object', async () => {
      const facilityWithoutDataset = {
        id: 'facility-1',
        name: 'Facility 1',
        dataset: 'dataset-1',
      };

      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
      });

      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(facilityWithoutDataset),
      });

      const { updateFacilityConfig } = useFacility();
      await updateFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-1' },
        force: true,
      });
    });

    it('does nothing when no facilityId is available', async () => {
      useFacilities.mockReturnValue({
        fetchFacilities: jest.fn(),
        getFacility: jest.fn().mockReturnValue(null),
      });

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
      const { facilityConfig } = useFacilityConfig('facility-1');
      expect(facilityConfig.value).toEqual({});
    });

    it('returns isAttendanceFeatureEnabled as true when currentLanguage is en', () => {
      const { isAttendanceFeatureEnabled } = useFacilityConfig('facility-1');
      expect(isAttendanceFeatureEnabled.value).toBe(true);
    });

    it('returns isPictureLoginFeatureEnabled as true when currentLanguage is en', () => {
      const { isPictureLoginFeatureEnabled } = useFacilityConfig('facility-1');
      expect(isPictureLoginFeatureEnabled.value).toBe(true);
    });

    it('returns signInOptions with USERNAME_PASSWORD by default', () => {
      const { signInOptions } = useFacilityConfig('facility-1');
      // Default config has learner_can_login_with_no_password: false, so USERNAME_PASSWORD
      expect(signInOptions.value).toEqual([OptionsForSignIn.USERNAME_PASSWORD]);
    });

    it('returns null for picturePasswordSettings initially', () => {
      const { picturePasswordSettings } = useFacilityConfig('facility-1');
      expect(picturePasswordSettings.value).toBeNull();
    });
  });

  describe('signInOptions computed', () => {
    it('includes PICTURE_PASSWORD when picture_password_settings is set', () => {
      const configWithPicturePassword = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'colorful' },
      };

      FacilityDatasetResource.fetchCollection.mockResolvedValue([configWithPicturePassword]);

      const { fetchFacilityConfig, signInOptions } = useFacilityConfig('facility-1');

      return fetchFacilityConfig().then(() => {
        expect(signInOptions.value).toContain(OptionsForSignIn.PICTURE_PASSWORD);
      });
    });

    it('includes USERNAME_ONLY when learner_can_login_with_no_password is true', () => {
      const configWithUsernameOnly = {
        ...mockFacilityConfig,
        learner_can_login_with_no_password: true,
      };

      FacilityDatasetResource.fetchCollection.mockResolvedValue([configWithUsernameOnly]);

      const { fetchFacilityConfig, signInOptions } = useFacilityConfig('facility-1');

      return fetchFacilityConfig().then(() => {
        expect(signInOptions.value).toContain(OptionsForSignIn.USERNAME_ONLY);
      });
    });

    it('includes USERNAME_PASSWORD when learner_can_login_with_no_password is false', () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { fetchFacilityConfig, signInOptions } = useFacilityConfig('facility-1');

      return fetchFacilityConfig().then(() => {
        expect(signInOptions.value).toContain(OptionsForSignIn.USERNAME_PASSWORD);
      });
    });
  });

  describe('picturePasswordSettings computed', () => {
    it('returns picture_password_settings when PICTURE_PASSWORD is in signInOptions', () => {
      const configWithPicturePassword = {
        ...mockFacilityConfig,
        picture_password_settings: { icon_style: 'colorful', show_icon_names: false },
        learner_can_login_with_no_password: true,
      };

      FacilityDatasetResource.fetchCollection.mockResolvedValue([configWithPicturePassword]);

      const { fetchFacilityConfig, picturePasswordSettings } = useFacilityConfig('facility-1');

      return fetchFacilityConfig().then(() => {
        expect(picturePasswordSettings.value).toEqual({
          icon_style: 'colorful',
          show_icon_names: false,
        });
      });
    });

    it('returns null when PICTURE_PASSWORD is not in signInOptions', () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { fetchFacilityConfig, picturePasswordSettings } = useFacilityConfig('facility-1');

      return fetchFacilityConfig().then(() => {
        expect(picturePasswordSettings.value).toBeNull();
      });
    });
  });

  describe('fetchFacilityConfig', () => {
    it('fetches facility config for given facilityId', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

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

      const { fetchFacilityConfig } = useFacilityConfig('facility-1');
      await fetchFacilityConfig('facility-2');

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-2' },
        force: true,
      });
    });

    it('does nothing when no facilityId is provided', async () => {
      const { fetchFacilityConfig, facilityConfig } = useFacilityConfig(null);
      const result = await fetchFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).not.toHaveBeenCalled();
      expect(facilityConfig.value).toEqual({});
      expect(result).toBeUndefined();
    });

    it('returns empty config when facility is not found', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([]);

      const { fetchFacilityConfig, facilityConfig } = useFacilityConfig('facility-1');
      const result = await fetchFacilityConfig();

      expect(facilityConfig.value).toEqual({});
      expect(result).toEqual({});
    });
  });
});
