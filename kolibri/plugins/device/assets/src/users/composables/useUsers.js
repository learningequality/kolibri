import UserType from 'kolibri.utils.UserType';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { getCurrentInstance, ref, inject, onMounted } from 'kolibri.lib.vueCompositionApi';
import { TaskResource, FacilityUserResource } from 'kolibri.resources';
import { TaskStatuses } from 'kolibri.utils.syncTaskUtils';
import { deviceString } from '../../views/commonDeviceStrings';

const isPooling = ref(false);
const usersBeingImportedRef = ref([]);

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

  const getUsersBeingImported = () => {
    const { context: { usersBeingImported = [] } = {} } = importUserService.state || {};
    return usersBeingImported;
  };

  const startPollingTasks = () => {
    if (isPooling.value) {
      // Already polling
      return;
    }
    pollImportTask();
  };

  const pollImportTask = async () => {
    const usersBeingImported = getUsersBeingImported();
    usersBeingImportedRef.value = usersBeingImported;
    if (usersBeingImported.length === 0) {
      isPooling.value = false;
      return;
    }

    isPooling.value = true;
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
      if (task.status === TaskStatuses.FAILED) {
        store.dispatch('createSnackbar', deviceString('importUserError'));
      }
      if (task.status === TaskStatuses.COMPLETED) {
        store.dispatch('createSnackbar', deviceString('importUserSuccess'));
      }
      if ([TaskStatuses.COMPLETED, TaskStatuses.FAILED].includes(task.status)) {
        importUserService.send({
          type: 'REMOVE_USER_BEING_IMPORTED',
          value: user.id,
        });
        usersBeingImportedRef.value = getUsersBeingImported();
        fetchUsers();
        TaskResource.clear(task.id);
      }
    });
    setTimeout(() => {
      pollImportTask();
    }, 2000);
  };

  onMounted(() => {
    startPollingTasks();
  });

  return {
    users,
    loading,
    showCannotRemoveUser,
    usersBeingImportedRef,
    startPollingTasks,
    fetchUsers,
    removeUser,
  };
}
