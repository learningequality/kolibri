<template>

  <div class="user-roster">

    <div class="header">
      <h1>
        {{$tr('allUsers')}}
      </h1>
      <span> ( {{ visibleUsers.length }} )</span>
    </div>

    <div class="toolbar">
      <div class="create">
        <k-button
          @click="openCreateUserModal"
          :text="$tr('addNew')"
          :primary="true"/>
      </div>

      <label for="type-filter" class="visuallyhidden">{{$tr('filterUserType')}}</label>
      <select v-model="roleFilter" id="type-filter" name="type-filter">
        <option value="all"> {{$tr('allUsers')}} </option>
        <option :value="ADMIN"> {{$tr('admins')}}</option>
        <option :value="COACH"> {{$tr('coaches')}} </option>
        <option :value="LEARNER"> {{$tr('learners')}} </option>
      </select>

      <k-filter-textbox
        :placeholder="$tr('searchText')"
        v-model="searchFilter"
        class="searchbar"
      />

    </div>

    <hr>

    <!-- Modals -->
    <user-edit-modal
      v-if="showEditUserModal"
      :userid="currentUserEdit.id"
      :fullname="currentUserEdit.full_name"
      :username="currentUserEdit.username"
      :userkind="currentUserEdit.kind"
    />
    <user-create-modal
      v-if="showCreateUserModal"/>

    <table class="roster">

      <caption class="visuallyhidden">{{$tr('users')}}</caption>

      <!-- Table Headers -->
      <thead v-if="usersMatchFilter">
        <tr>
          <th class="col-header table-username" scope="col"> {{$tr('username')}} </th>
          <th class="col-header" scope="col">
            <span class="visuallyhidden">{{ $tr('kind') }}</span>
          </th>
          <th class="col-header" scope="col"> {{$tr('fullName')}} </th>
          <th class="col-header" scope="col"> {{$tr('edit')}} </th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers">
          <!-- Username field -->
          <th class="table-cell table-username" scope="col">
            {{user.username}}
          </th>

          <!-- Logic for role tags -->
          <td class="table-cell table-role">
            <user-role :role="user.kind" :omitLearner="true" />
          </td>

          <!-- Full Name field -->
          <td scope="row" class="table-cell">
            <span class="table-name">
              {{user.full_name}}
            </span>
          </td>

          <!-- Edit field -->
          <td class="table-cell">
            <k-button @click="openEditUserModal(user)" :text="$tr('editAccountInfo')" :raised="false"/>
          </td>

        </tr>
      </tbody>

    </table>

    <p v-if="noUsersExist">{{ $tr('noUsersExist') }}</p>
    <p v-if="allUsersFilteredOut">{{ $tr('allUsersFilteredOut') }}</p>

  </div>

</template>


<script>

  import * as constants from '../../constants';
  import * as actions from '../../state/actions';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import orderBy from 'lodash/orderBy';
  import userCreateModal from './user-create-modal';
  import userEditModal from './user-edit-modal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import userRole from '../user-role';
  export default {
    components: {
      userCreateModal,
      userEditModal,
      kButton,
      kFilterTextbox,
      userRole,
    },
    data: () => ({
      roleFilter: 'all',
      searchFilter: '',
      currentUserEdit: null,
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
        const searchFilter = this.searchFilter;
        const roleFilter = this.roleFilter;
        function matchesText(user) {
          const searchTerms = searchFilter.split(' ').filter(Boolean).map(val => val.toLowerCase());
          const fullName = user.full_name.toLowerCase();
          const username = user.username.toLowerCase();
          return searchTerms.every(term => fullName.includes(term) || username.includes(term));
        }
        function matchesRole(user) {
          if (roleFilter === 'all') {
            return true;
          }
          return user.kind === roleFilter;
        }
        const filteredUsers = this.users.filter(user => matchesText(user) && matchesRole(user));
        return orderBy(filteredUsers, [user => user.username.toUpperCase()], ['asc']);
      },
      showEditUserModal() {
        return this.modalShown === constants.Modals.EDIT_USER;
      },
      showCreateUserModal() {
        return this.modalShown === constants.Modals.CREATE_USER;
      },
    },
    methods: {
      openEditUserModal(user) {
        this.currentUserEdit = user;
        this.displayModal(constants.Modals.EDIT_USER);
      },
      openCreateUserModal() {
        this.displayModal(constants.Modals.CREATE_USER);
      },
    },
    vuex: {
      getters: {
        users: state => state.pageState.facilityUsers,
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        deleteUser: actions.deleteUser,
        displayModal: actions.displayModal,
      },
    },
    name: 'userPage',
    $trs: {
      filterUserType: 'Filter User Type',
      editAccountInfo: 'Edit',
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
    width: 100%
    word-break: break-all

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

  @media print
    .toolbar
      display: none
    .user-roster
      width: 500px

  // TODO temporary fix until remove width calculation from learn
  @media screen and (max-width: 840px)
    .create, #type-filter
      box-sizing: border-box
    .table-username
      display: none
    .table-name
      overflow: hidden
      text-overflow: ellipsis
      white-space: nowrap
      width: 100px
    .col-header
      width: 50%

</style>
