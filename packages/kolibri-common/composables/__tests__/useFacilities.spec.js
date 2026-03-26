import { ref } from 'vue';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import useUser from 'kolibri/composables/useUser';
import useFacilities from '../useFacilities';

jest.mock('kolibri-common/apiResources/FacilityResource');
jest.mock('kolibri/composables/useUser');

describe('useFacilities', () => {
  const mockFacilities = [
    { id: 'facility-1', name: 'Facility 1', dataset: 'dataset-1' },
    { id: 'facility-2', name: 'Facility 2', dataset: 'dataset-2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useUser
    useUser.mockReturnValue({
      userFacilityId: ref('facility-1'),
      isSuperuser: ref(false),
    });
  });

  describe('initial state', () => {
    it('returns empty facilities list initially', () => {
      const { facilities } = useFacilities();
      expect(facilities.value).toEqual([]);
    });

    it('returns false for hasMultipleFacilities initially', () => {
      const { hasMultipleFacilities } = useFacilities();
      expect(hasMultipleFacilities.value).toBe(false);
    });

    it('returns false for userIsMultiFacilityAdmin initially', () => {
      const { userIsMultiFacilityAdmin } = useFacilities();
      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });
  });

  describe('fetchFacilities', () => {
    it('fetches facilities from FacilityResource', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, facilities } = useFacilities();
      await fetchFacilities();

      expect(FacilityResource.fetchCollection).toHaveBeenCalledWith({ force: true });
      expect(facilities.value).toEqual(mockFacilities);
    });

    it('updates hasMultipleFacilities when multiple facilities are fetched', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, hasMultipleFacilities } = useFacilities();
      await fetchFacilities();

      expect(hasMultipleFacilities.value).toBe(true);
    });

    it('handles fetch error gracefully', async () => {
      FacilityResource.fetchCollection.mockRejectedValue(new Error('Fetch failed'));

      const { fetchFacilities } = useFacilities();

      await expect(fetchFacilities()).rejects.toThrow('Fetch failed');
    });
  });

  describe('getFacility', () => {
    it('returns facility matching the given facilityId', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, getFacility } = useFacilities();
      await fetchFacilities();

      expect(getFacility('facility-2')).toEqual(mockFacilities[1]);
    });

    it('returns undefined when facilityId is not found', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, getFacility } = useFacilities();
      await fetchFacilities();

      expect(getFacility('non-existent-id')).toBeUndefined();
    });
  });

  describe('userIsMultiFacilityAdmin', () => {
    it('returns true when user is superuser and has multiple facilities', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(true),
      });

      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, userIsMultiFacilityAdmin } = useFacilities();
      await fetchFacilities();

      expect(userIsMultiFacilityAdmin.value).toBe(true);
    });

    it('returns false when user is not superuser', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(false),
      });

      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, userIsMultiFacilityAdmin } = useFacilities();
      await fetchFacilities();

      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });

    it('returns false when user has only one facility', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(true),
      });

      FacilityResource.fetchCollection.mockResolvedValue([mockFacilities[0]]);

      const { fetchFacilities, userIsMultiFacilityAdmin } = useFacilities();
      await fetchFacilities();

      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });
  });
});
