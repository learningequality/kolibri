import { ref } from 'vue';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import useUser from 'kolibri/composables/useUser';
import Lockr from 'lockr';
import useFacilities from '../useFacilities';
import useFacility, { useFacilityConfig } from '../useFacility';

jest.mock('kolibri-common/apiResources/FacilityDatasetResource');
jest.mock('kolibri/composables/useUser');
jest.mock('lockr');
jest.mock('../useFacilities');

// Reset module-level state between tests
jest.mock('../useFacility', () => {
  const actual = jest.requireActual('../useFacility');
  return {
    __esModule: true,
    ...actual,
    default: jest.fn(facilityId => actual.default(facilityId)),
    useFacilityConfig: jest.fn(facilityId => actual.useFacilityConfig(facilityId)),
  };
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
    jest.clearAllMocks();

    // Mock useUser - return null to start with no facility selected
    useUser.mockReturnValue({
      userFacilityId: ref(null),
    });

    // Mock Lockr - return null so no saved facility ID
    Lockr.get.mockReturnValue(null);

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

    it('returns undefined facilityId initially', () => {
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
  });

  describe('fetchFacilityConfig', () => {
    it('fetches facility config for given facilityId', async () => {
      FacilityDatasetResource.fetchCollection.mockResolvedValue([mockFacilityConfig]);

      const { fetchFacilityConfig, facilityConfig } = useFacilityConfig('facility-1');
      const result = await fetchFacilityConfig();

      expect(FacilityDatasetResource.fetchCollection).toHaveBeenCalledWith({
        getParams: { facility_id: 'facility-1' },
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
