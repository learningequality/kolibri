import { ref } from 'vue';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import useUser from 'kolibri/composables/useUser';

jest.mock('kolibri-common/apiResources/FacilityResource');
jest.mock('kolibri/composables/useUser');

describe('useFacilities', () => {
  const mockFacilities = [
    { id: 'facility-1', name: 'Facility 1', dataset: 'dataset-1' },
    { id: 'facility-2', name: 'Facility 2', dataset: 'dataset-2' },
  ];

  function createUseFacilities() {
    let useFacilities;
    jest.isolateModules(() => {
      useFacilities = require('../useFacilities').default;
    });
    return useFacilities();
  }

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
      const { facilities } = createUseFacilities();
      expect(facilities.value).toEqual([]);
    });

    it('returns false for hasMultipleFacilities initially', () => {
      const { hasMultipleFacilities } = createUseFacilities();
      expect(hasMultipleFacilities.value).toBe(false);
    });

    it('returns false for userIsMultiFacilityAdmin initially', () => {
      const { userIsMultiFacilityAdmin } = createUseFacilities();
      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });
  });

  describe('fetchFacilities', () => {
    it('fetches facilities from FacilityResource', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, facilities } = createUseFacilities();
      await fetchFacilities();

      expect(FacilityResource.fetchCollection).toHaveBeenCalledWith({ force: true });
      expect(facilities.value).toEqual(mockFacilities);
    });

    it('updates hasMultipleFacilities when multiple facilities are fetched', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, hasMultipleFacilities } = createUseFacilities();
      await fetchFacilities();

      expect(hasMultipleFacilities.value).toBe(true);
    });

    it('handles fetch error gracefully', async () => {
      FacilityResource.fetchCollection.mockRejectedValue(new Error('Fetch failed'));

      const { fetchFacilities } = createUseFacilities();

      await expect(fetchFacilities()).rejects.toThrow('Fetch failed');
    });
  });

  describe('fetchFacility', () => {
    it('fetches a single facility and adds it to the cache', async () => {
      const singleFacility = { id: 'facility-3', name: 'Facility 3', dataset: 'dataset-3' };
      FacilityResource.fetchModel.mockResolvedValue(singleFacility);

      const { fetchFacility, facilities } = createUseFacilities();
      await fetchFacility('facility-3');

      expect(FacilityResource.fetchModel).toHaveBeenCalledWith({ id: 'facility-3', force: true });
      expect(facilities.value).toEqual([singleFacility]);
    });

    it('updates existing facility if it already exists in cache', async () => {
      const updatedFacility = {
        id: 'facility-1',
        name: 'Updated Facility 1',
        dataset: 'updated-dataset-1',
      };

      // First, add a facility to the cache
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);
      let useFacilitiesModule;
      jest.isolateModules(() => {
        useFacilitiesModule = require('../useFacilities');
      });
      const { fetchFacilities, fetchFacility, facilities } = useFacilitiesModule.default();

      await fetchFacilities();
      FacilityResource.fetchModel.mockResolvedValue(updatedFacility);
      await fetchFacility('facility-1');

      expect(facilities.value[0].name).toBe('Updated Facility 1');
      expect(facilities.value[0].dataset).toBe('updated-dataset-1');
    });

    it('supports Ref as facilityId parameter', async () => {
      const singleFacility = { id: 'facility-4', name: 'Facility 4', dataset: 'dataset-4' };
      FacilityResource.fetchModel.mockResolvedValue(singleFacility);

      const { fetchFacility } = createUseFacilities();
      const facilityRef = ref('facility-4');
      await fetchFacility(facilityRef);

      expect(FacilityResource.fetchModel).toHaveBeenCalledWith({ id: 'facility-4', force: true });
    });
  });

  describe('getFacility', () => {
    it('returns facility matching the given facilityId', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, getFacility } = createUseFacilities();
      await fetchFacilities();

      expect(getFacility('facility-2')).toEqual(mockFacilities[1]);
    });

    it('returns undefined when facilityId is not found', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, getFacility } = createUseFacilities();
      await fetchFacilities();

      expect(getFacility('non-existent-id')).toBeUndefined();
    });

    it('supports Ref as facilityId parameter', async () => {
      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, getFacility } = createUseFacilities();
      await fetchFacilities();

      const facilityRef = ref('facility-1');
      expect(getFacility(facilityRef)).toEqual(mockFacilities[0]);
    });
  });

  describe('userIsMultiFacilityAdmin', () => {
    it('returns true when user is superuser and has multiple facilities', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(true),
      });

      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, userIsMultiFacilityAdmin } = createUseFacilities();
      await fetchFacilities();

      expect(userIsMultiFacilityAdmin.value).toBe(true);
    });

    it('returns false when user is not superuser', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(false),
      });

      FacilityResource.fetchCollection.mockResolvedValue(mockFacilities);

      const { fetchFacilities, userIsMultiFacilityAdmin } = createUseFacilities();
      await fetchFacilities();

      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });

    it('returns false when user has only one facility', async () => {
      useUser.mockReturnValue({
        userFacilityId: ref('facility-1'),
        isSuperuser: ref(true),
      });

      FacilityResource.fetchCollection.mockResolvedValue([mockFacilities[0]]);

      const { fetchFacilities, userIsMultiFacilityAdmin } = createUseFacilities();
      await fetchFacilities();

      expect(userIsMultiFacilityAdmin.value).toBe(false);
    });
  });
});
