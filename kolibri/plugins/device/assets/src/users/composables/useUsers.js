import UserType from 'kolibri.utils.UserType';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { getCurrentInstance, ref, inject, onMounted } from 'kolibri.lib.vueCompositionApi';
import { TaskResource, FacilityUserResource } from 'kolibri.resources';
import { TaskStatuses } from 'kolibri.utils.syncTaskUtils';

export default function useUsers() {
  const store = getCurrentInstance().proxy.$store;
  const importUserService = inject('importUserService');
  const users = ref([]);
  const loading = ref(true);
  const showCannotRemoveUser = ref(false);

  async function fetchUsers() {
    loading.value = true;
    const response = await FacilityUserResource.fetchCollection();
    users.value = response;

    const { usersBeingImported = [] } = importUserService.state.context;
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
    const { usersBeingImported = [] } = importUserService.state.context;
    if (usersBeingImported.length === 0) {
      // Stop polling
      return;
    }
    const tasks = await TaskResource.list({ queue: 'soud_sync' });
    if (tasks.length) {
      tasks.forEach(task => {
        if (task.status === TaskStatuses.COMPLETED) {
          // Remove completed user id from 'being imported'
          const taskUserId = task.extra_metadata.user_id;
          if (usersBeingImported.find(({ id }) => id === taskUserId)) {
            importUserService.send({
              type: 'REMOVE_USER_BEING_IMPORTED',
              value: taskUserId,
            });
            // Modify the user in the list to remove the 'isImporting' flag
            users.value = users.value.map(user => {
              if (user.id === taskUserId) {
                return { ...user, isImporting: false };
              }
              return user;
            });
            TaskResource.clear(task.id);
          }
        }
        // Todo, do something when it fails
      });
    }
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
