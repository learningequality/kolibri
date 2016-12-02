<template>

  <div class="user-roster">

    <div class="header">
      <h1>
        All Users
      </h1>
      <span> ( {{ visibleUsers.length }} )</span>
    </div>

    <div class="toolbar">
      <label for="type-filter" class="visuallyhidden">Filter User Type</label>
      <select v-model="roleFilter" id="type-filter" name="type-filter">
        <option value="all"> All Users </option>
        <option value="admin"> Admins </option>
        <option value="learner"> Learners </option>
      </select>

      <div class="searchbar" role="search">
        <svg class="icon" src="../icons/search.svg" role="presentation" aria-hidden="true"></svg>
        <input
          id="search-field"
          aria-label="Search for a user..."
          type="search"
          v-model="searchFilter"
          placeholder="Search for a user...">
      </div>

      <div class="create">
        <icon-button @click="openCreateUserModal" class="create-user-button" text="Add New" :primary="true">
          <svg class="add-user" src="../icons/add_new_user.svg" role="presentation"></svg>
        </icon-button>
      </div>

    </div>

    <hr>

    <!-- Modals -->
    <user-edit-modal
      v-if="editingUser"
      :userid="currentUserEdit.id"
      :username="currentUserEdit.username"
      :fullname="currentUserEdit.full_name"
      :roles="currentUserEdit.roles"
      @close="closeEditUserModal">
    </user-edit-modal>
    <user-create-modal
      v-if="creatingUser"
      @close="closeCreateUserModal">
    </user-create-modal>

    <table class="roster">

      <caption class="visuallyhidden">Users</caption>

      <!-- Table Headers -->
      <thead v-if="usersMatchFilter">
        <tr>
          <th class="col-header" scope="col"> Full Name </th>
          <th class="col-header" scope="col">
            <span class="role-header" aria-hidden="true">
              Role
            </span>
          </th>
          <th class="col-header table-username" scope="col"> Username </th>
          <th class="col-header" scope="col"> Edit </th>
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
            <span class="user-role" v-for="role in user.roles">
              {{role.kind | capitalize}}
            </span>
          </td>

          <!-- Username field -->
          <td class="table-cell table-username">
            {{user.username}}
          </td>

          <!-- Edit field -->
          <td class="table-cell">
            <icon-button class="edit-user-button" @click="openEditUserModal(user)">
              <span class="visuallyhidden">Edit Account Info</span>
              <svg src="../icons/pencil.svg"></svg>
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
        const roleFilter = this.roleFilter;
        // creates array of words in filter, removes empty strings
        const searchFilter = this.searchFilter.split(' ').filter(Boolean).map(
          // returns an array of search parameters, ignoring case
          (query) => new RegExp(query, 'i'));

        return this.users.filter((user) => {
          // fullname created using es6 templates
          const names = [user.full_name, user.username];

          let hasRole = true;
          let hasName = true;

          // check for filters
          if (roleFilter !== 'all') {
            // check for learner
            if (roleFilter === 'learner') {
              hasRole = !(user.roles.length);
            } else {
              hasRole = false;

              // actual check for roles
              user.roles.forEach(roleObject => {
                if (roleObject.kind === roleFilter) {
                  hasRole = true;
                }
              });
            }
          }

          // makes sure there's text in the search box
          if (searchFilter.length) {
            hasName = false;

            // check for searchFilter phrase in user's names
            for (const name of names) {
              // test name through all filters
              if (searchFilter.every(nameFilter => nameFilter.test(name))) {
                hasName = true;
              }
            }
          }

          // determines whether name should be on list
          return hasRole && hasName;

          // aphabetize based on username
        }).sort((user1, user2) => {
          if (user1.username[0] > user2.username[0]) {
            return 1;
          } else if (user1.username[0] < user2.username[0]) {
            return -1;
          }
          return 0;
        });
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
