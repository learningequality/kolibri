import UserType from 'kolibri.utils.UserType';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { getCurrentInstance, ref, inject } from 'kolibri.lib.vueCompositionApi';
import { FacilityUserResource } from 'kolibri.resources';

export default function useUsers(store) {
  store = store || getCurrentInstance().proxy.$store;
  const service = inject('importUserService');
  service;
  const users = ref([]);
  const loading = ref(true);
  const showCannotRemoveUser = ref(false);

  async function fetchUsers() {
    loading.value = true;
    const response = await FacilityUserResource.fetchCollection();
    users.value = response;
    loading.value = false;
    users.value.forEach(user => {
      user.kind = UserType(user);
    });
    store.dispatch('notLoading');
    loading.value = false;
  }

  async function removeUser(userId) {
    const user = users.value.find(user => user.id === userId);
    if (!user) return;
    if (
      user.kind === UserKinds.SUPERUSER &&
      users.value.filter(user => user.kind === UserKinds.SUPERUSER).length === 1
    ) {
      showCannotRemoveUser.value = true;
      throw new Error('Cannot remove the last super admin');
    }

    await FacilityUserResource.deleteModel({ id: userId });
  }

  return {
    users,
    loading,
    showCannotRemoveUser,
    fetchUsers,
    removeUser,
  };
}
