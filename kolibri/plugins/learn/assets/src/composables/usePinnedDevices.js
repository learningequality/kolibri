/**
 * A composable function containing logic related to pinned devices
 */

import { PinnedDeviceResource } from 'kolibri.resources';

export default function usePinnedDevices() {
  function fetchPinsForUser() {
    return PinnedDeviceResource.fetchCollection({ force: true });
  }

  function createPinForUser(instance_id) {
    return PinnedDeviceResource.create({ instance_id });
  }

  function deletePinForUser(id) {
    return PinnedDeviceResource.deleteModel(id);
  }
  return {
    createPinForUser,
    deletePinForUser,
    fetchPinsForUser,
  };
}
