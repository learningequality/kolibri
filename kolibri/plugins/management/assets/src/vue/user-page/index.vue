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
        <option selected value="all"> All Users </option>
        <option value="admin"> Admins </option>
        <option value="learner"> Learners </option>
      </select>

      <div class="create">
        <user-create-modal></user-create-modal>
      </div>

      <div class="searchbar" role="search">
        <svg class="icon" src="../icons/search.svg" role="presentation" aria-hidden="true"></svg>
        <input
          aria-label="Search for a user..."
          type="search"
          v-model="searchFilter"
          placeholder="Search for a user...">
      </div>

    </div>

    <hr>

    <table class="roster">

      <caption class="visuallyhidden">Users</caption>

      <!-- Table Headers -->
      <thead>
        <tr>
          <th class="col-header" scope="col"> Full Name </th>
          <th class="col-header table-username" scope="col"> Username </th>
          <th class="col-header" scope="col"> Edit </th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers">
          <!-- Full Name field -->
          <th scope="row" class="table-cell">
            {{user.full_name}}

            <!-- Logic for role tags -->
            <span class="user-role" v-for="role in user.roles">
              {{role.kind | capitalize}}
            </span>
          </th>

          <!-- Username field -->
          <td class="table-cell table-username">
            {{user.username}}
          </td>

          <!-- Edit field -->
          <td class="table-cell">
            <user-edit-modal
              :userid="user.id"
              :roles="user.roles"
              :username="user.username"
              :fullname="user.full_name">
            </user-edit-modal>
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
    },
    // Has to be a funcion due to vue's treatment of data
    data: () => ({
      roleFilter: '',
      searchFilter: '',
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

  @require '~core-theme.styl'

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
    width: 88%
    border-color: transparent
    background-color: transparent
    clear: both
    &:focus
      outline: none
      border-color: transparent

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
    margin-left: 20px
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
    width: 50%
    min-width: 200px
    max-width: 300px
    height: $toolbar-height
    float: left
    margin-left: 5px

  @media screen and (min-width: $portrait-breakpoint + 1)
    .searchbar
      font-size: 1em
      width: 80%

  @media screen and (max-width: $portrait-breakpoint)
    .create, #type-filter
      box-sizing: border-box
      width: 49%
    .searchbar
      font-size: 0.9em
      width: 100%
      margin-top: 5px
      float: right
    .table-username
      display: none

</style>
