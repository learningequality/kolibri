import { ref, nextTick } from 'vue';
import useAuthWatcher from '../useAuthWatcher';
import useAuthFlow from '../useAuthFlow';

jest.mock('../useAuthFlow');

describe('useAuthWatcher', () => {
  let facilityId;
  let facilityConfig;

  beforeEach(() => {
    facilityId = ref('1');
    facilityConfig = ref({ id: '1', name: 'Facility 1' });
    useAuthFlow.mockReturnValue({
      facilityId,
      facilityConfig,
    });
  });

  describe('watchForFacilityChange', () => {
    it('should call the callback when facilityId changes', async () => {
      const callback = jest.fn();
      const { watchForFacilityChange } = useAuthWatcher();
      watchForFacilityChange(callback);

      facilityId.value = '2';
      await nextTick();

      expect(callback).toHaveBeenCalledWith('2', '1');
    });
  });

  describe('watchForFacilityConfigChange', () => {
    it('should call the callback when facilityConfig changes for the same facility ID', async () => {
      const callback = jest.fn();
      const { watchForFacilityConfigChange } = useAuthWatcher();
      watchForFacilityConfigChange(callback);

      const newConfig = { id: '1', name: 'Facility 1 Updated' };
      facilityConfig.value = newConfig;
      await nextTick();

      expect(callback).toHaveBeenCalledWith(newConfig, expect.any(Object));
    });

    it('should not call the callback when the facility ID changes', async () => {
      const callback = jest.fn();
      const { watchForFacilityConfigChange } = useAuthWatcher();
      watchForFacilityConfigChange(callback);

      facilityConfig.value = { id: '2', name: 'Facility 2' };
      await nextTick();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
