import { useConnectionChecker, useDevicesWithFacility } from 'kolibri.coreVue.componentSets.sync';
import { ref, watch } from 'kolibri.lib.vueCompositionApi';

export default function useDeviceConnectionStatus(deviceId) {
  const disconnected = ref(false);
  const { devices } = useDevicesWithFacility();
  const { doCheck } = useConnectionChecker(devices);

  watch(devices, currentValue => {
    if (!deviceId) return;
    disconnected.value = true;
    if (currentValue.length > 0) {
      const checkStatus = doCheck(deviceId);
      if (checkStatus != undefined) {
        checkStatus.then(device => {
          disconnected.value = !device.available;
        });
      }
    }
  });

  return {
    disconnected,
  };
}
