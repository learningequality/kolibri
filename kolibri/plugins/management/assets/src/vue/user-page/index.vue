<template>

  <div class="user-roster">

    <div class="header">
      <h1>
        {{$tr('allUsers')}}
      </h1>
      <span> ( {{ visibleUsers.length }} )</span>
    </div>

    <div class="toolbar">
      <label for="type-filter" class="visuallyhidden">{{$tr('filterUserType')}}</label>
      <select v-model="roleFilter" id="type-filter" name="type-filter">
        <option value="all"> {{$tr('allUsers')}} </option>
        <option :value="ADMIN"> {{$tr('admins')}}</option>
        <option :value="COACH"> {{$tr('coaches')}} </option>
        <option :value="LEARNER"> {{$tr('learners')}} </option>
      </select>

      <div class="searchbar" role="search">
        <svg class="icon" src="../icons/search.svg" aria-hidden="true"/>
        <input
          id="search-field"
          :aria-label="$tr('searchText')"
          type="search"
          v-model="searchFilter"
          :placeholder="$tr('searchText')">
      </div>

      <div class="create">
        <icon-button 
          @click="openCreateUserModal" 
          class="create-user-button" 
          :text="$tr('addNew')" 
          :primary="true">
          <svg class="add-user" src="../icons/add_new_user.svg"/>
        </icon-button>
      </div>

    </div>

    <hr>

    <!-- Modals -->
    <user-edit-modal
      v-if="editingUser"
      :userid="currentUserEdit.id"
      :fullname="currentUserEdit.full_name"
      :username="currentUserEdit.username"
      :userkind="currentUserEdit.kind"
      @close="closeEditUserModal"
    />
    <user-create-modal
      v-if="creatingUser"
      @close="closeCreateUserModal"/>

    <table class="roster">

      <caption class="visuallyhidden">{{$tr('users')}}</caption>

      <!-- Table Headers -->
      <thead v-if="usersMatchFilter">
        <tr>
          <th class="col-header" scope="col"> {{$tr('fullName')}} </th>
          <th class="col-header" scope="col">
            <span class="role-header" aria-hidden="true">
              {{$tr('kind')}}
            </span>
          </th>
          <th class="col-header table-username" scope="col"> {{$tr('username')}} </th>
          <th class="col-header" scope="col"> {{$tr('edit')}} </th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers">
          <!-- Full Name field -->
          <th scope="row" class="table-cell">
            <span class="table-name">
              {{user.full_name}}
            </span>
          </th>

          <!-- Logic for role tags -->
          <td class="table-cell table-role">
            <span v-if="user.kind !== LEARNER" class="user-role">
              {{ user.kind === ADMIN ? $tr('admin', {count: 1}) : $tr('coach') }}
            </span>
          </td>

          <!-- Username field -->
          <td class="table-cell table-username">
            {{user.username}}
          </td>

          <!-- Edit field -->
          <td class="table-cell">
            <icon-button class="edit-user-button" @click="openEditUserModal(user)">
              <span class="visuallyhidden">$tr('editAccountInfo')</span>
              <svg src="../icons/pencil.svg"/>
            </icon-button>
          </td>

        </tr>
      </tbody>

    </table>

    <p v-if="noUsersExist">{{ $tr('noUsersExist') }}</p>
    <p v-if="allUsersFilteredOut">{{ $tr('allUsersFilteredOut') }}</p>

  </div>

</template>


<script>

  const actions = require('../../actions');
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    components: {
      'user-create-modal': require('./user-create-modal'),
      'user-edit-modal': require('./user-edit-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    // Has to be a funcion due to vue's treatment of data
    data: () => ({
      roleFilter: 'all',
      searchFilter: '',
      creatingUser: false,
      editingUser: false,
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
        return !this.noUsersExist && (this.visibleUsers.length === 0);
      },
      usersMatchFilter() {
        return !this.noUsersExist && !this.allUsersFilteredOut;
      },
      visibleUsers() {
        const searchFilter = this.searchFilter;
        const roleFilter = this.roleFilter;

        function matchesText(user) {
          const searchTerms = searchFilter
            .split(' ')
            .filter(Boolean)
            .map(val => val.toLowerCase());

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

        return this.users
          .filter(user => matchesText(user) && matchesRole(user))
          .sort((user1, user2) => user1.username.localeCompare(user2.username));
      },
    },
    methods: {
      openEditUserModal(user) {
        this.currentUserEdit = user;
        this.editingUser = true;
      },
      closeEditUserModal() {
        this.editingUser = false;
        this.currentUserEdit = {};
      },
      openCreateUserModal() {
        this.creatingUser = true;
      },
      closeCreateUserModal() {
        this.creatingUser = false;
      },
    },
    vuex: {
      getters: {
        users: state => state.pageState.users,
      },
      actions: {
        deleteUser: actions.deleteUser,
      },
    },
    $trNameSpace: 'userPage',
    $trs: {
      // input & accessibility labels
      filterUserType: 'Filter User Type',
      editAccountInfo: 'Edit Account Information',
      searchText: 'Search for a user...',
      // filter select entries
      allUsers: 'All Users',
      admins: 'Admins',
      coaches: 'Coaches',
      learners: 'Learners',
      // edit button text
      addNew: 'Add New',
      // user tags
      admin: 'Admin',
      coach: 'Coach',
      // table info
      fullName: 'Full Name',
      users: 'Users',
      kind: 'Kind',
      username: 'Username',
      edit: 'Edit',
      // search-related error messages
      noUsersExist: 'No Users Exist.',
      allUsersFilteredOut: 'No users match the filter.',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

  // Padding height that separates rows from eachother
  $row-padding = 1.5em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px

  .toolbar:after
    content: ''
    display: table
    clear: both

  // Toolbar Styling
  .create
    float: right

  input[type='search']
    display: inline-block
    box-sizing: border-box
    position: relative
    top: 0
    left: 10px
    height: 100%
    width: 85%
    border-color: transparent
    background-color: transparent
    clear: both

  #type-filter
    float: left
    background-color: $core-bg-light
    border-color: $core-action-light
    height: $toolbar-height
    cursor: pointer

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

  .user-role
    background-color: $core-text-annotation
    color: $core-bg-light
    padding-left: 1em
    padding-right: 1em
    border-radius: 40px
    font-size: 0.875em
    display: inline-block
    text-transform: capitalize
    white-space: nowrap

  .searchbar .icon
    display: inline-block
    float: left
    position: relative
    fill: $core-text-annotation
    left: 5px
    top: 5px

  .searchbar
    border-radius: 5px
    padding: inherit
    border: 1px solid #c0c0c0
    width: 300px
    height: $toolbar-height
    float: left
    margin-left: 5px

  .edit-user-button
    border: none
    svg
      fill: $core-action-normal
      cursor: pointer
      &:hover
        fill: $core-action-dark

  .create-user-button
    width: 100%


  @media screen and (min-width: $portrait-breakpoint + 1)
    .searchbar
      font-size: 0.9em
      min-width: 170px
      width: 45%
    #search-field
      width: 80%

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
      width: 49%
    .create
      margin-top: -78px
    .searchbar
      font-size: 0.9em
      width: 100%
      margin-top: 5px
      float: right
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
