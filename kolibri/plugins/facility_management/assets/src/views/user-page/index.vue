<template>

  <div class="user-roster">

    <div class="header">
      <h1>{{ $tr('allUsers') }}</h1>
      <span> ( {{ $formatNumber(visibleUsers.length) }} ) </span>
    </div>

    <div class="toolbar">
      <div class="create">
        <k-button
          @click="displayModal(Modals.CREATE_USER)"
          :text="$tr('addNew')"
          :primary="true"
        />
      </div>

      <k-select
        class="kind-select"
        :label="$tr('filterUserType')"
        :options="userKinds"
        :inline="true"
        v-model="roleFilter"
      />

      <k-filter-textbox
        :placeholder="$tr('searchText')"
        v-model="searchFilter"
        class="user-filter"
      />
    </div>

    <user-table
      :users="visibleUsers"
      :emptyMessage="emptyMessage"
    >
      <template slot="action" slot-scope="userRow">
        <k-dropdown-menu
          :text="$tr('manage')"
          :options="manageUserOptions(userRow.user.id)"
          :disabled="!userCanBeEdited(userRow.user)"
          appearance="flat-button"
          @select="handleManageUserSelection($event, userRow.user)"
        />
      </template>
    </user-table>

    <!-- Modals -->
    <user-create-modal v-if="modalShown===Modals.CREATE_USER" />

    <edit-user-modal
      v-if="modalShown===Modals.EDIT_USER"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
      :kind="selectedUser.kind"
    />

    <reset-user-password-modal
      v-if="modalShown===Modals.RESET_USER_PASSWORD"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
    />

    <delete-user-modal
      v-if="modalShown===Modals.DELETE_USER"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
    />

  </div>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import kDropdownMenu from 'kolibri.coreVue.components.kDropdownMenu';
  import { currentUserId, isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import userTable from '../user-table';
  import { Modals } from '../../constants';
  import { displayModal } from '../../state/actions';
  import userRole from '../user-role';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';
  import userCreateModal from './user-create-modal';
  import editUserModal from './edit-user-modal';
  import resetUserPasswordModal from './reset-user-password-modal';
  import deleteUserModal from './delete-user-modal';

  const ALL_FILTER = 'all';

  export default {
    name: 'userPage',
    components: {
      userCreateModal,
      editUserModal,
      resetUserPasswordModal,
      deleteUserModal,
      kButton,
      kFilterTextbox,
      kDropdownMenu,
      userRole,
      kSelect,
      userTable,
      UiIcon,
    },
    data: () => ({
      searchFilter: '',
      roleFilter: null,
      selectedUser: null,
    }),
    computed: {
      Modals: () => Modals,
      userKinds() {
        return [
          { label: this.$tr('allUsers'), value: ALL_FILTER },
          { label: this.$tr('learners'), value: UserKinds.LEARNER },
          { label: this.$tr('coaches'), value: UserKinds.COACH },
          { label: this.$tr('admins'), value: UserKinds.ADMIN },
        ];
      },
      visibleUsers() {
        return filterAndSortUsers(
          this.facilityUsers,
          user => userMatchesFilter(user, this.searchFilter) && this.userMatchesRole(user)
        );
      },
      emptyMessage() {
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        } else if (this.visibleUsers.length === 0) {
          return this.$tr('allUsersFilteredOut');
        }
        return '';
      },
    },
    beforeMount() {
      this.roleFilter = this.userKinds[0];
    },
    methods: {
      userMatchesRole(user) {
        const { value: filterKind } = this.roleFilter;
        if (filterKind === ALL_FILTER) {
          return true;
        }
        if (user.kind === UserKinds.ASSIGNABLE_COACH) {
          return filterKind === UserKinds.COACH;
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
    vuex: {
      getters: {
        facilityUsers: state => state.pageState.facilityUsers,
        modalShown: state => state.pageState.modalShown,
        currentUserId,
        isSuperuser,
      },
      actions: {
        displayModal,
      },
    },
    $trs: {
      filterUserType: 'User type',
      searchText: 'Search for a user…',
      allUsers: 'All',
      admins: 'Admins',
      coaches: 'Coaches',
      learners: 'Learners',
      addNew: 'Add New',
      fullName: 'Full name',
      users: 'Users',
      role: 'Role',
      username: 'Username',
      edit: 'Edit',
      noUsersExist: 'No users exist',
      allUsersFilteredOut: 'No users match the filter',
      manage: 'Manage',
      editUser: 'Edit',
      resetUserPassword: 'Reset password',
      deleteUser: 'Delete',
      userActions: 'User management actions',
    },
  };

</script>


<style lang="stylus" scoped>

  .toolbar
    margin-bottom: 32px

  .toolbar:after
    content: ''
    display: table
    clear: both

  // Toolbar Styling
  .create
    float: right

  .header h1
    display: inline-block

  .user-roster
    overflow-x: auto
    overflow-y: hidden

  .kind-select
    margin-bottom: 0

  .user-filter
    width: 300px

</style>
