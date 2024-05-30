import UserType from 'kolibri.utils.UserType';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import { getCurrentInstance, ref } from 'kolibri.lib.vueCompositionApi';

const mockUsers = [
  {
    id: '12',
    full_name: 'Alex Velez',
    username: 'alexvelezll',
    is_superuser: true,
    roles: [
      {
        collection: 'a5aa9e5e7ebdcd24564ac7e4915bc781',
        kind: 'admin',
        id: 'edc5abad7ab9c65732f6d77ff0105534',
      },
      {
        collection: 'b4c0288bf4ca86cc88b46cdfc19ae347',
        kind: 'coach',
        id: 'b71439af334b3642c45c1b9047856243',
      },
    ],
  },
  {
    id: '123',
    full_name: 'John Doe',
    username: 'johndoe',
    is_superuser: false,
    roles: [
      {
        collection: 'b4c0288bf4ca86cc88b46cdfc19ae347',
        kind: 'coach',
        id: 'b71439af334b3642c45c1b9047856243',
      },
    ],
  },
  {
    id: '1234',
    full_name: 'Alan Brito',
    username: 'alanbrito',
    is_superuser: false,
    roles: [
      {
        collection: 'b4c0288bf4ca86cc88b46cdfc19ae347',
        kind: 'coach',
        id: 'b71439af334b3642c45c1b9047856243',
      },
    ],
  },
  {
    id: '12345',
    full_name: 'Armando Paredes',
    username: 'armandoparedes',
    is_superuser: false,
    roles: [
      {
        collection: 'b4c0288bf4ca86cc88b46cdfc19ae347',
        kind: 'coach',
        id: 'b71439af334b3642c45c1b9047856243',
      },
    ],
  },
  {
    id: '123456',
    full_name: 'Lasom Brita',
    username: 'lasombrita',
    is_superuser: false,
    roles: [
      {
        collection: 'b4c0288bf4ca86cc88b46cdfc19ae347',
        kind: 'coach',
        id: 'b71439af334b3642c45c1b9047856243',
      },
    ],
  },
];

export default function useUsers(store) {
  store = store || getCurrentInstance().proxy.$store;

  const users = ref([]);
  const loading = ref(true);
  const showCannotRemoveUser = ref(false);

  async function fetchUsers() {
    loading.value = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    loading.value = false;
    users.value = mockUsers;
    users.value.forEach(user => {
      user.kind = UserType(user);
    });
    store.dispatch('notLoading');
    loading.value = false;
  }

  async function removeUser(userId) {
    const index = mockUsers.findIndex(user => user.id === userId);
    const user = users.value[index];
    if (
      user.kind === UserKinds.SUPERUSER &&
      users.value.filter(user => user.kind === UserKinds.SUPERUSER).length === 1
    ) {
      showCannotRemoveUser.value = true;
      throw new Error('Cannot remove the last super admin');
    }

    users.value.splice(index, 1);
  }

  return {
    users,
    loading,
    showCannotRemoveUser,
    fetchUsers,
    removeUser,
  };
}
