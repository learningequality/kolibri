import { ref } from 'vue';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import useUser from 'kolibri/composables/useUser';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import Lockr from 'lockr';
import store from 'kolibri/store';
import useFacilities from '../useFacilities';

jest.mock('kolibri-common/apiResources/FacilityResource');
jest.mock('kolibri-common/apiResources/FacilityDatasetResource');
jest.mock('kolibri/composables/useUser');
jest.mock('kolibri/utils/redirectBrowser');
jest.mock('lockr');
jest.mock('kolibri/store');

describe('useFacilities', () => {
  const mockFacilities = [
    { id: 'facility-1', name: 'Facility 1', dataset: 'dataset-1' },
    { id: 'facility-2', name: 'Facility 2', dataset: 'dataset-2' },
  ];

  const mockFacilityConfig = {
    id: 'dataset-1',
    name: 'Facility 1',
    settings: { learner_can_edit_username: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useUser
    useUser.mockReturnValue({
      userFacilityId: ref('facility-1'),
      isSuperuser: ref(false),
    });

    // Mock Lockr
    Lockr.get.mockReturnValue(null);

    // Mock store
    store.getters = {
      activeFacilityId: 'facility-1',
    };

    // Reset module state
    useFacilities().setFacilities([]);
    useFacilities().setFacilityConfig({});
    useFacilities().setFacilityId(null);
  });

  describe('initial state', () => {
    it('returns empty facilities list initially', () => {
      const { facilities } = useFacilities();
      expect(facilities.value).toEqual([]);
    });

    it('returns empty facility config initially', () => {
      const { facilityConfig } = useFacilities();
      expect(facilityConfig.value).toEqual({});
    });

    it('returns null selected facility initially', () => {
      const { selectedFacility } = useFacilities();
      expect(selectedFacility.value).toBeNull();
    });

    it('returns false for userIsMultiFacilityAdmin initially', () => {
      const { userIsMultiFacilityAdmin } = useFacilities();
      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });

    it('returns empty string for currentFacilityName initially', () => {
      const { currentFacilityName } = useFacilities();
      expect(currentFacilityName.value).toBe('');
    });
  });

  describe('getFacilities', () => {
    it('fetches facilities from FacilityResource', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { getFacilities, facilities } = useFacilities();
      await getFacilities();

      expect(FacilityResource.fetchCollection).toHaveBeenCalledWith({ force: true });
      expect(facilities.value).toEqual(mockFacilities);
    });

    it('handles fetch error gracefully', async () => {
      FacilityResource.fetchCollection.mockRejectedValue(new Error('Fetch failed'));

      const { getFacilities } = useFacilities();

      await expect(getFacilities()).rejects.toThrow('Fetch failed');
    });
  });

  describe('getFacilityConfig', () => {
    it('fetches facility config for given facilityId', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { getFacilityConfig, facilityConfig } = useFacilities();
      await getFacilityConfig('facility-1');

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-1' },
      });
      expect(facilityConfig.value).toEqual(mockFacilityConfig);
    });

    it('uses userFacilityId when no facilityId is provided', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { getFacilityConfig, facilityConfig } = useFacilities();
      await getFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-1' },
      });
      expect(facilityConfig.value).toEqual(mockFacilityConfig);
    });

    it('redirects when no facilityId is available', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref(null),
        isSuperuser: ref(false),
      });

      const { getFacilityConfig } = useFacilities();
      await getFacilityConfig();

      expect(redirectBrowser).toHaveBeenCalled();
    });

    it('fetches config from API when selectedFacility.dataset is an object', async () => {
      const mockFacilitiesWithDataset = [
        { id: 'facility-1', name: 'Facility 1', dataset: { id: 'dataset-1' } },
      ];
      const { setFacilities, setFacilityId, getFacilityConfig, facilityConfig } = useFacilities();

      setFacilities(mockFacilitiesWithDataset);
      setFacilityId('facility-1');
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      await getFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-1' },
      });
      expect(facilityConfig.value).toEqual(mockFacilityConfig);
    });
  });

  describe('setFacilities', () => {
    it('sets the facilities list', () => {
      const { setFacilities, facilities } = useFacilities();
      setFacilities(mockFacilities);
      expect(facilities.value).toEqual(mockFacilities);
    });
  });

  describe('setFacilityConfig', () => {
    it('sets the facility config', () => {
      const { setFacilityConfig, facilityConfig } = useFacilities();
      setFacilityConfig(mockFacilityConfig);
      expect(facilityConfig.value).toEqual(mockFacilityConfig);
    });
  });

  describe('setFacilityId', () => {
    it('sets the facilityId', () => {
      const { setFacilityId, selectedFacility } = useFacilities();
      setFacilityId('facility-2');
      // Note: selectedFacility depends on facilities being set too
      expect(selectedFacility.value).toBeNull();
    });
  });

  describe('selectedFacility', () => {
    it('returns facility matching _facilityId', () => {
      const { setFacilities, setFacilityId, selectedFacility } = useFacilities();
      setFacilities(mockFacilities);
      setFacilityId('facility-2');
      expect(selectedFacility.value).toEqual(mockFacilities[1]);
    });

    it('returns facility matching userFacilityId when _facilityId not found', () => {
      const { setFacilities, selectedFacility } = useFacilities();
      setFacilities(mockFacilities);
      // _facilityId defaults to null, so it should fall back to userFacilityId
      expect(selectedFacility.value).toEqual(mockFacilities[0]);
    });

    it('falls back to userFacilityId when _facilityId has no match', () => {
      const { setFacilities, setFacilityId, selectedFacility } = useFacilities();
      setFacilities(mockFacilities);
      setFacilityId('non-existent-id');
      // Falls back to userFacilityId match
      expect(selectedFacility.value).toEqual(mockFacilities[0]);
    });
  });

  describe('userIsMultiFacilityAdmin', () => {
    it('returns true when user is superuser and has multiple facilities', () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(true),
      });

      const { setFacilities, userIsMultiFacilityAdmin } = useFacilities();
      setFacilities(mockFacilities);
      expect(userIsMultiFacilityAdmin.value).toBe(true);
    });

    it('returns false when user is not superuser', () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(false),
      });

      const { setFacilities, userIsMultiFacilityAdmin } = useFacilities();
      setFacilities(mockFacilities);
      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });

    it('returns false when user has only one facility', () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(true),
      });

      const { setFacilities, userIsMultiFacilityAdmin } = useFacilities();
      setFacilities([mockFacilities[0]]);
      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });
  });

  describe('currentFacilityName', () => {
    it('returns name of facility matching activeFacilityId', () => {
      const { setFacilities, currentFacilityName } = useFacilities();
      setFacilities(mockFacilities);
      expect(currentFacilityName.value).toBe('Facility 1');
    });

    it('returns empty string when no matching facility is found', () => {
      store.getters.activeFacilityId = 'non-existent-id';
      const { setFacilities, currentFacilityName } = useFacilities();
      setFacilities(mockFacilities);
      expect(currentFacilityName.value).toBe('');
    });
  });
});
