import UserType from 'kolibri.utils.UserType';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { getCurrentInstance, ref, inject, onMounted } from 'kolibri.lib.vueCompositionApi';
import { TaskResource, FacilityUserResource } from 'kolibri.resources';
import { TaskStatuses } from 'kolibri.utils.syncTaskUtils';

export default function useUsers() {
  const store = getCurrentInstance().proxy.$store;
  const importUserService = inject('importUserService') || {};
  const users = ref([]);
  const loading = ref(true);
  const showCannotRemoveUser = ref(false);

  async function fetchUsers() {
    loading.value = true;
    const response = await FacilityUserResource.fetchCollection({
      force: true,
    });
    users.value = response;

    const { context: { usersBeingImported = [] } = {} } = importUserService.state || {};
    users.value.push(...usersBeingImported.map(user => ({ ...user, isImporting: true })));

    users.value.forEach(user => {
      user.kind = UserType(user);
    });
    store.dispatch('notLoading');
    loading.value = false;
  }

  function removeUser(userId) {
    const user = users.value.find(user => user.id === userId);
    if (!user) return;
    if (
      user.kind === UserKinds.SUPERUSER &&
      users.value.filter(user => user.kind === UserKinds.SUPERUSER).length === 1
    ) {
      showCannotRemoveUser.value = true;
      throw new Error('Cannot remove the last super admin');
    }

    return FacilityUserResource.removeImportedUser(userId);
  }

  const pollImportTask = async () => {
    const { context: { usersBeingImported = [] } = {} } = importUserService.state || {};
    if (usersBeingImported.length === 0) {
      // Stop polling
      return;
    }

    const tasks = await TaskResource.list({ queue: 'soud_sync' });
    const tasksMap = {};
    tasks.forEach(task => {
      tasksMap[task.extra_metadata.user_id] = task;
    });

    usersBeingImported.forEach(user => {
      const task = tasksMap[user.id];
      if (!task) {
        return;
      }
      if (task.status === TaskStatuses.COMPLETED) {
        users.value = users.value.map(u => {
          if (u.id === user.id) {
            return { ...u, isImporting: false };
          }
          return u;
        });
      }
      if (task.status === TaskStatuses.FAILED) {
        users.value = users.value.filter(u => u.id !== user.id);
        store.dispatch('createSnackbar', 'No se pudo importar el usuario');
      }
      if ([TaskStatuses.COMPLETED, TaskStatuses.FAILED].includes(task.status)) {
        importUserService.send({
          type: 'REMOVE_USER_BEING_IMPORTED',
          value: user.id,
        });
        TaskResource.clear(task.id);
      }
    });
    setTimeout(() => {
      pollImportTask();
    }, 2000);
  };

  onMounted(() => {
    pollImportTask();
  });

  return {
    users,
    loading,
    showCannotRemoveUser,
    fetchUsers,
    removeUser,
  };
}
