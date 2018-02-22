<template>

  <div class="user-roster">

    <div class="header">
      <h1>{{ $tr('allUsers') }}</h1>
      <span> ( {{ $formatNumber(visibleUsers.length) }} ) </span>
    </div>

    <div class="toolbar">
      <div class="create">
        <k-button
          @click="openCreateUserModal"
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

    <core-table>
      <caption class="visuallyhidden">{{ $tr('users') }}</caption>

      <!-- Table Headers -->
      <thead slot="thead" v-if="usersMatchFilter">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-main-col">{{ $tr('username') }}</th>
          <th>
            <span class="visuallyhidden">{{ $tr('kind') }}</span>
          </th>
          <th>{{ $tr('fullName') }}</th>
          <th></th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers" :key="user.id">
          <td class="core-table-icon-col">
            <ui-icon icon="person" />
          </td>
          <!-- Username field -->
          <th class="core-table-main-col">{{ user.username }}</th>

          <!-- Logic for role tags -->
          <td>
            <user-role :role="user.kind" :omitLearner="true" />
          </td>

          <!-- Full Name field -->
          <td>
            <span>{{ user.full_name }}</span>
          </td>

          <!-- Edit field -->
          <td>
            <dropdown-menu
              :name="$tr('manage')"
              :options="manageUserOptions(user.id)"
              :disabled="!canEditUser(user)"
              @select="handleManageUserSelection($event, user)"
            />
          </td>

        </tr>
      </tbody>

    </core-table>

    <p v-if="noUsersExist">{{ $tr('noUsersExist') }}</p>
    <p v-if="allUsersFilteredOut">{{ $tr('allUsersFilteredOut') }}</p>


    <!-- Modals -->
    <user-create-modal v-if="showCreateUserModal" />

    <edit-user-modal
      v-if="showEditUserModal"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
      :kind="selectedUser.kind"
    />

    <reset-user-password-modal
      v-if="showResetUserPasswordModal"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
    />

    <delete-user-modal
      v-if="showDeleteUserModal"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
    />

  </div>

</template>


<script>

  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import UiIcon from 'keen-ui/src/UiIcon';
  import * as constants from '../../constants';
  import * as actions from '../../state/actions';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import userCreateModal from './user-create-modal';
  import editUserModal from './edit-user-modal';
  import resetUserPasswordModal from './reset-user-password-modal';
  import deleteUserModal from './delete-user-modal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import dropdownMenu from 'kolibri.coreVue.components.dropdownMenu';
  import userRole from '../user-role';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';
  import { currentUserId, isSuperuser } from 'kolibri.coreVue.vuex.getters';
  import kSelect from 'kolibri.coreVue.components.kSelect';

  export default {
    name: 'userPage',
    components: {
      userCreateModal,
      editUserModal,
      resetUserPasswordModal,
      deleteUserModal,
      kButton,
      kFilterTextbox,
      dropdownMenu,
      userRole,
      kSelect,
      CoreTable,
      UiIcon,
    },
    data: () => ({
      searchFilter: '',
      roleFilter: null,
      selectedUser: null,
    }),
    computed: {
      userKinds() {
        return [
          {
            label: this.$tr('allUsers'),
            value: 'all',
          },
          {
            label: this.$tr('learners'),
            value: UserKinds.LEARNER,
          },
          {
            label: this.$tr('coaches'),
            value: UserKinds.COACH,
          },
          {
            label: this.$tr('admins'),
            value: UserKinds.ADMIN,
          },
        ];
      },
      noUsersExist() {
        return this.users.length === 0;
      },
      allUsersFilteredOut() {
        return !this.noUsersExist && this.visibleUsers.length === 0;
      },
      usersMatchFilter() {
        return !this.noUsersExist && !this.allUsersFilteredOut;
      },
      visibleUsers() {
        return filterAndSortUsers(
          this.users,
          user => userMatchesFilter(user, this.searchFilter) && this.userMatchesRole(user)
        );
      },
      showEditUserModal() {
        return this.modalShown === constants.Modals.EDIT_USER;
      },
      showResetUserPasswordModal() {
        return this.modalShown === constants.Modals.RESET_USER_PASSWORD;
      },
      showDeleteUserModal() {
        return this.modalShown === constants.Modals.DELETE_USER;
      },
      showCreateUserModal() {
        return this.modalShown === constants.Modals.CREATE_USER;
      },
    },
    beforeMount() {
      this.roleFilter = this.userKinds[0];
    },
    methods: {
      userMatchesRole(user) {
        return this.roleFilter.value === 'all' || user.kind === this.roleFilter.value;
      },
      manageUserOptions(userId) {
        return [
          { label: this.$tr('editUser') },
          { label: this.$tr('resetUserPassword') },
          { label: this.$tr('deleteUser'), disabled: userId === this.currentUserId },
        ];
      },
      handleManageUserSelection(selection, user) {
        this.selectedUser = user;
        if (selection.label === this.$tr('editUser')) {
          this.displayModal(constants.Modals.EDIT_USER);
        } else if (selection.label === this.$tr('resetUserPassword')) {
          this.displayModal(constants.Modals.RESET_USER_PASSWORD);
        } else if (selection.label === this.$tr('deleteUser')) {
          this.displayModal(constants.Modals.DELETE_USER);
        }
      },
      openCreateUserModal() {
        this.displayModal(constants.Modals.CREATE_USER);
      },
      canEditUser(user) {
        if (!this.isSuperuser) {
          return !user.is_superuser;
        }
        return true;
      },
    },
    vuex: {
      getters: {
        users: state => state.pageState.facilityUsers,
        modalShown: state => state.pageState.modalShown,
        currentUserId,
        isSuperuser,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
    $trs: {
      filterUserType: 'User type',
      searchText: 'Search for a user...',
      allUsers: 'All',
      admins: 'Admins',
      coaches: 'Coaches',
      learners: 'Learners',
      addNew: 'Add New',
      fullName: 'Full name',
      users: 'Users',
      kind: 'Role',
      username: 'Username',
      edit: 'Edit',
      noUsersExist: 'No users exist',
      allUsersFilteredOut: 'No users match the filter',
      manage: 'Manage',
      editUser: 'Edit',
      resetUserPassword: 'Reset password',
      deleteUser: 'Delete',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // Padding height that separates rows from eachother
  $row-padding = 1.5em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 38px

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
