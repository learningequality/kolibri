import { ref, getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
import { set } from '@vueuse/core';
import { ClassroomResource } from 'kolibri.resources';

// Usable that manages the state for "Delete Class" workflow
export default function useDeleteClass(classroomProp) {
  const $store = getCurrentInstance().proxy.$store;
  const classToDelete = ref(null);

  if (classroomProp) {
    set(classToDelete, classroomProp);
  }

  function selectClassToDelete(selectedClassroom) {
    set(classToDelete, selectedClassroom);
  }

  function clearClassToDelete() {
    set(classToDelete, null);
  }

  function deleteSelectedClassModel(deleteId = classToDelete.value.id) {
    if (!deleteId) {
      return Promise.reject('No classId was provided');
    }

    return ClassroomResource.deleteModel({ id: deleteId }).then(
      () => {
        $store.commit('classManagement/DELETE_CLASS', deleteId);
      },
      error => {
        $store.dispatch('handleApiError', error);
      }
    );
  }

  return {
    classToDelete,
    deleteSelectedClassModel,
    selectClassToDelete,
    clearClassToDelete,
  };
}
