<template>

  <div>
    <KGrid>
      <KGridItem sizes="100, 50, 50" percentage>
        <h1>{{ $tr('users') }}</h1>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage align="right">
        <KButton
          :text="$tr('newUserButtonLabel')"
          :primary="true"
          class="move-down"
          @click="displayModal(Modals.CREATE_USER)"
        />
      </KGridItem>
    </KGrid>

    <PaginatedListContainer
      :items="facilityUsers"
      :filterFunction="filterUsers"
      :filterPlaceholder="$tr('searchText')"
    >
      <template v-slot:otherFilter>
        <KSelect
          v-model="roleFilter"
          :label="$tr('filterUserType')"
          :options="userKinds"
          :inline="true"
          class="type-filter"
        />
      </template>

      <template v-slot:default="{items, filterInput}">
        <UserTable
          class="user-roster move-down"
          :users="items"
          :emptyMessage="emptyMessageForItems(items, filterInput)"
        >
          <template slot="action" slot-scope="userRow">
            <KDropdownMenu
              :text="$tr('optionsButtonLabel')"
              :options="manageUserOptions(userRow.user.id)"
              :disabled="!userCanBeEdited(userRow.user)"
              appearance="flat-button"
              @select="handleManageUserSelection($event, userRow.user)"
            />
          </template>
        </UserTable>
      </template>
    </PaginatedListContainer>

    <!-- Modals -->
    <UserCreateModal v-if="modalShown===Modals.CREATE_USER" @cancel="closeModal" />

    <EditUserModal
      v-if="modalShown===Modals.EDIT_USER"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
      :kind="selectedUser.kind"
      @cancel="closeModal"
    />

    <ResetUserPasswordModal
      v-if="modalShown===Modals.RESET_USER_PASSWORD"
      :id="selectedUser.id"
      :username="selectedUser.username"
      @cancel="closeModal"
    />

    <DeleteUserModal
      v-if="modalShown===Modals.DELETE_USER"
      :id="selectedUser.id"
      :username="selectedUser.username"
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import UserTable from '../UserTable';
  import { Modals } from '../../constants';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';
  import PaginatedListContainer from '../PaginatedListContainer';
  import UserCreateModal from './UserCreateModal';
  import EditUserModal from './EditUserModal';
  import ResetUserPasswordModal from './ResetUserPasswordModal';
  import DeleteUserModal from './DeleteUserModal';

  const ALL_FILTER = 'all';

  export default {
    name: 'UserPage',
    metaInfo() {
      return {
        title: this.$tr('userPageTitle'),
      };
    },
    components: {
      UserCreateModal,
      EditUserModal,
      ResetUserPasswordModal,
      DeleteUserModal,
      KButton,
      KDropdownMenu,
      KSelect,
      KGrid,
      KGridItem,
      UserTable,
      PaginatedListContainer,
    },
    data() {
      return {
        roleFilter: null,
        selectedUser: null,
      };
    },
    computed: {
      ...mapGetters(['currentUserId', 'isSuperuser']),
      ...mapState('userManagement', ['facilityUsers', 'modalShown']),
      Modals: () => Modals,
      userKinds() {
        return [
          { label: this.$tr('allUsers'), value: ALL_FILTER },
          { label: this.$tr('learners'), value: UserKinds.LEARNER },
          { label: this.$tr('coaches'), value: UserKinds.COACH },
          { label: this.$tr('admins'), value: UserKinds.ADMIN },
        ];
      },
    },
    beforeMount() {
      this.roleFilter = this.userKinds[0];
    },
    methods: {
      ...mapActions('userManagement', ['displayModal']),
      emptyMessageForItems(items, filterText) {
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        } else if (items.length === 0) {
          return this.$tr('allUsersFilteredOut', { filterText });
        }
        return '';
      },
      filterUsers(users, filterText) {
        return filterAndSortUsers(
          users,
          user => userMatchesFilter(user, filterText) && this.userMatchesRole(user)
        );
      },
      closeModal() {
        this.displayModal(false);
      },
      userMatchesRole(user) {
        const { value: filterKind } = this.roleFilter;
        if (filterKind === ALL_FILTER) {
          return true;
        }
        if (user.kind === UserKinds.ASSIGNABLE_COACH) {
          return filterKind === UserKinds.COACH;
        }
        if (filterKind === UserKinds.ADMIN) {
          return user.kind === UserKinds.ADMIN || user.kind === UserKinds.SUPERUSER;
        }
        return filterKind === user.kind;
      },
      manageUserOptions(userId) {
        return [
          { label: this.$tr('editUser'), value: Modals.EDIT_USER },
          { label: this.$tr('resetUserPassword'), value: Modals.RESET_USER_PASSWORD },
          {
            label: this.$tr('deleteUser'),
            value: Modals.DELETE_USER,
            disabled: userId === this.currentUserId,
          },
        ];
      },
      handleManageUserSelection(selection, user) {
        this.selectedUser = user;
        this.displayModal(selection.value);
      },
      userCanBeEdited(user) {
        // If logged-in user is a superuser, then they can edit anybody (including other SUs).
        // Otherwise, only non-SUs can be edited.
        return this.isSuperuser || !user.is_superuser;
      },
    },
    $trs: {
      filterUserType: 'User type',
      searchText: 'Search for a user…',
      allUsers: 'All',
      admins: 'Admins',
      coaches: 'Coaches',
      learners: 'Learners',
      newUserButtonLabel: 'New User',
      userCountLabel: '{userCount} users',
      fullName: 'Full name',
      users: 'Users',
      role: 'Role',
      username: 'Username',
      edit: 'Edit',
      noUsersExist: 'No users exist',
      allUsersFilteredOut: "No users match the filter: '{filterText}'",
      optionsButtonLabel: 'Options',
      editUser: 'Edit details',
      resetUserPassword: 'Reset password',
      deleteUser: 'Delete',
      userActions: 'User management actions',
      userPageTitle: 'Users',
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

  .type-filter {
    margin-bottom: 0;
  }

  .user-roster {
    overflow-x: auto;
  }

</style>
