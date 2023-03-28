/**
 * A composable function containing logic related to pinned devices
 */

import { getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { PinnedDeviceResource } from 'kolibri.resources';

export default function usePinnedDevices() {
  const $store = getCurrentInstance().proxy.$store;
  const user = $store.state.core.session.user_id;

  function fetchPinsForUser() {
    return PinnedDeviceResource.fetchCollection({ force: true });
  }

  function createPinForUser(device_id) {
    return PinnedDeviceResource.create({ device_id, user });
  }

  function deletePinForUser(id) {
    return PinnedDeviceResource.deleteModel(id, { user });
  }
  return {
    createPinForUser,
    deletePinForUser,
    fetchPinsForUser,
  };
}
