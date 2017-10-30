<template>

  <div class="user-roster">

    <div class="header">
      <h1>
        {{ $tr('allUsers') }}
      </h1>
      <span> ( {{ visibleUsers.length }} )</span>
    </div>

    <div class="toolbar">
      <div class="create">
        <k-button
          @click="openCreateUserModal"
          :text="$tr('addNew')"
          :primary="true" />
      </div>

      <label for="type-filter" class="visuallyhidden">{{ $tr('filterUserType') }}</label>
      <select v-model="roleFilter" id="type-filter" name="type-filter">
        <option value="all"> {{ $tr('allUsers') }} </option>
        <option :value="ADMIN"> {{ $tr('admins') }}</option>
        <option :value="COACH"> {{ $tr('coaches') }} </option>
        <option :value="LEARNER"> {{ $tr('learners') }} </option>
      </select>

      <k-filter-textbox
        :placeholder="$tr('searchText')"
        v-model="searchFilter"
        class="searchbar"
      />

    </div>

    <hr>

    <table class="roster">

      <caption class="visuallyhidden">{{ $tr('users') }}</caption>

      <!-- Table Headers -->
      <thead v-if="usersMatchFilter">
        <tr>
          <th class="col-header table-username" scope="col"> {{ $tr('username') }} </th>
          <th class="col-header" scope="col">
            <span class="visuallyhidden">{{ $tr('kind') }}</span>
          </th>
          <th class="col-header" scope="col"> {{ $tr('fullName') }} </th>
          <th class="col-header" scope="col"></th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers" :key="user.id">
          <!-- Username field -->
          <th class="table-cell table-username" scope="col">
            {{ user.username }}
          </th>

          <!-- Logic for role tags -->
          <td class="table-cell table-role">
            <user-role :role="user.kind" :omitLearner="true" />
          </td>

          <!-- Full Name field -->
          <td scope="row" class="table-cell">
            <span class="table-name">
              {{ user.full_name }}
            </span>
          </td>

          <!-- Edit field -->
          <td class="table-cell">
            <dropdown-menu
              :name="$tr('manage')"
              :options="manageUserOptions(user.id)"
              :disabled="!canEditUser(user)"
              @select="handleManageUserSelection($event, user)"
            />
          </td>

        </tr>
      </tbody>

    </table>

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
    },
    data: () => ({
      searchFilter: '',
      roleFilter: 'all',
      selectedUser: null,
    }),
    computed: {
      LEARNER: () => UserKinds.LEARNER,
      COACH: () => UserKinds.COACH,
      ADMIN: () => UserKinds.ADMIN,
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
    methods: {
      userMatchesRole(user) {
        return this.roleFilter === 'all' || user.kind === this.roleFilter;
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
      filterUserType: 'Filter User Type',
      searchText: 'Search for a user...',
      allUsers: 'All Users',
      admins: 'Admins',
      coaches: 'Coaches',
      learners: 'Learners',
      addNew: 'Add New',
      fullName: 'Full Name',
      users: 'Users',
      kind: 'Role',
      username: 'Username',
      edit: 'Edit',
      noUsersExist: 'No Users Exist.',
      allUsersFilteredOut: 'No users match the filter.',
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

  .toolbar:after
    content: ''
    display: table
    clear: both

  // Toolbar Styling
  .create
    float: right

  #type-filter
    background-color: $core-bg-light
    border-color: $core-action-light
    height: $toolbar-height
    cursor: pointer
    margin-right: 8px

  #type-filter, .searchbar
    margin-top: 5px

  .header h1
    display: inline-block

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  tr
    text-align: left

  .roster
    min-width: 600px

  th
    text-align: inherit

  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%
    width: 30%

  .table-cell
    font-weight: normal // compensates for <th> cells
    padding-bottom: $row-padding
    color: $core-text-default

  .table-name
    $line-height = 1em
    line-height: $line-height
    max-height: ($line-height * 2)
    display: inline-block
    padding-right: 1em

  .role-header
    display: none

  .user-roster
    overflow-x: auto
    overflow-y: hidden

</style>
