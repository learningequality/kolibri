import { nextTick } from 'vue';
import useAuthWatcher from '../useAuthWatcher';
import { AuthFlowStore } from '../useAuthFlow';

AuthFlowStore.stub();

describe('useAuthWatcher', () => {
  beforeEach(() => {
    AuthFlowStore.mock({
      facilityId: '1',
      facilityConfig: { id: '1', name: 'Facility 1' },
    });
  });

  describe('watchForFacilityChange', () => {
    it('should call the callback when facilityId changes', async () => {
      const callback = jest.fn();
      const { watchForFacilityChange } = useAuthWatcher();
      watchForFacilityChange(callback);

      AuthFlowStore.mock({ facilityId: '2' });
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
      AuthFlowStore.mock({ facilityConfig: newConfig });
      await nextTick();

      expect(callback).toHaveBeenCalledWith(newConfig, expect.any(Object));
    });

    it('should not call the callback when the facility ID changes', async () => {
      const callback = jest.fn();
      const { watchForFacilityConfigChange } = useAuthWatcher();
      watchForFacilityConfigChange(callback);

      AuthFlowStore.mock({ facilityConfig: { id: '2', name: 'Facility 2' } });
      await nextTick();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
