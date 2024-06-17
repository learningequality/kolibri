<template>

  <AppBarPage
    :title="coreString('usersLabel')"
    class="users-page"
  >
    <KPageContainer>
      <div class="header">
        <h1>{{ coreString('usersLabel') }} </h1>
        <KButton
          text="Import User"
        />
      </div>
      <KCircularLoader v-if="loading" />
      <UsersList
        v-else
        :users="users"
        @remove="userIdToRemove = $event"
      />
    </KPageContainer>
    <KModal
      v-if="userIdToRemove"
      :title="$tr('removeUserTitle')"
      :submitText="$tr('removeUserAction')"
      :cancelText="coreString('cancelAction')"
      @submit="onRemoveUser(userIdToRemove)"
      @cancel="userIdToRemove = null"
    >
      <p>
        {{ $tr('removeUserDescription', { device: 'device' }) }}
      </p>
      <p>
        {{ $tr('removeUserCallToAction') }}
      </p>
    </KModal>
    <KModal
      v-if="showCannotRemoveUser"
      :title="$tr('cannotRemoveUserTitle')"
      :submitText="coreString('closeAction')"
      @submit="showCannotRemoveUser = false"
    >
      <p>
        {{ $tr('cannotRemoveUserDescription') }}
      </p>
    </KModal>
  </AppBarPage>

</template>


<script>

  import AppBarPage from 'kolibri.coreVue.components.AppBarPage';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import useUsers from '../composables/useUsers';
  import UsersList from './UsersList.vue';

  export default {
    name: 'UsersPage',
    components: {
      UsersList,
      AppBarPage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { fetchUsers, removeUser, users, loading, showCannotRemoveUser } = useUsers();

      fetchUsers();

      return {
        users,
        loading,
        showCannotRemoveUser,
        fetchUsers,
        removeUser,
      };
    },
    data() {
      return {
        userIdToRemove: null,
      };
    },
    methods: {
      async onRemoveUser(userId) {
        try {
          await this.removeUser(userId);
          this.userIdToRemove = null;
          this.fetchUsers();
        } catch (error) {
          this.userIdToRemove = null;
        }
      },
    },
    $trs: {
      removeUserTitle: 'Remove user',
      removeUserDescription:
        'If you remove this user from this device you will still be able to access their account and all their data from { device }.',
      removeUserCallToAction:
        'Please ensure that all data you would like to keep has been synced before removing this user. You will permanently lose any data that has not been synced.',
      removeUserAction: 'Remove user',
      cannotRemoveUserTitle: 'Cannot remove user',
      cannotRemoveUserDescription:
        'This user is the only super admin on this device and cannot be removed. Give or transfer super admin permissions to another user on this device if you would like to remove this user.',
    },
  };

</script>


<style lang="scss" scoped>

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

</style>
