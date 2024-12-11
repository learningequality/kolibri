import { ref, computed } from 'vue';
import { set, get } from '@vueuse/core';
import { deleteDevice } from './api';

export default function useDeviceDeletion(devices) {
  const deletedDevices = ref([]);
  const isDeleting = ref(false);
  const deletingFailed = ref(false);
  const hasDeleted = ref(false);

  function doDelete(id) {
    set(isDeleting, true);
    set(deletingFailed, false);

    return deleteDevice(id)
      .then(() => {
        get(deletedDevices).push(id);

        set(hasDeleted, true);
        set(isDeleting, false);
      })
      .catch(() => {
        set(deletingFailed, true);
        set(isDeleting, false);
      });
  }

  return {
    devices: computed(() => get(devices).filter(d => get(deletedDevices).indexOf(d.id) < 0)),
    isDeleting,
    deletingFailed,
    hasDeleted,
    doDelete,
  };
}
