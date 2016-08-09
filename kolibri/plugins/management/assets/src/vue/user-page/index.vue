<template>

  <div class="user-roster">

    <h2>
      All Users
    </h2>

    <span> ( {{ users.length }} )</span>

    <div class="toolbar">
      <select v-model="roleFilter" name="user-filter">
        <option selected value="all"> All Users </option>
        <option v-bind:value="role" v-for="role in roles">
          {{role.kind | capitalize}}s
        </option>
        <option value="learner"> Learners </option>
      </select>

    <div class="searchbar">
        <svg class="search-button" src="../icons/search.svg"></svg>
        <input
        type="search"
        v-model="searchFilter"
        placeholder="Search for a user...">
    </div>

      <div class="create">
        <user-create-modal></user-create-modal>
      </div>

    </div>

    <hr>

    <table class="roster">

      <!-- Table Headers -->
      <thead>
        <tr>
          <th> Student Name </th>
          <th> Username </th>
          <th> Edit </th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody>
        <tr v-for="user in visibleUsers">
          <!-- Student Name field -->
          <td>
            {{user.first_name}} {{user.last_name}}

            <!-- Logic for role tags -->
            <span class="user-role" v-for="role in user.roles">
              {{role.kind | capitalize}}
            </span>
          </td>

          <!-- Username field -->
          <td>
            {{user.username}}
          </td>

          <!-- Edit field -->
          <td>
            <user-edit-modal
              :userid="user.id"
              :roles="user.roles"
              :username="user.username"
              :firstname="user.first_name"
              :lastname="user.last_name">
            </user-edit-modal>
          </td>

          <!-- <button @click="deleteUser(user.id)">Delete</button> -->
        </tr>
      </tbody>

    </table>

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
      visibleUsers() {
        const roleFilter = this.roleFilter;
        // creates array of words in filter, removes empty strings
        const searchFilter = this.searchFilter.split(' ').filter(Boolean).map(
          // returns an array of search parameters, ignoring case
          (query) => new RegExp(query, 'i'));

        return this.users.filter((user) => {
          // fullname created using es6 templates
          const fullname = `${user.first_name} ${user.last_name}`;
          const names = [fullname, user.username];

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
                if (roleObject.kind === roleFilter.kind) {
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
        }).sort((user1, user2) => user1.username[0] > user2.username[0]);
      },
    },
    vuex: {
      getters: {
        users: state => state.pageState.users,
        roles: state => state.pageState.roles,
      },
      actions: {
        deleteUser: actions.deleteUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme'

  // Padding height that separates rows from eachother
  $row-padding = 1.5em

  .user-roster
    padding: 1em 2em
    background-color: white
    position: relative
    top: 2em
    width: 100%
    border-radius: 4px

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

  select[name='user-filter']
    float: left
    background-color: $core-bg-light
    border-color: $core-action-light
    height: 35px
    outline: none

  .roster
    width: 100%
    /*background-color: $core-bg-light*/
    /*padding-top:*/


    /*Prevent lists that are too long*/
    max-height: 300px
    overflow:hidden
    overflow-y:scroll

  h2
    display: inline-block

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  tr
    text-align: left

  th
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%

  td
    padding-bottom: $row-padding
    color: $core-text-default

  .user-role
    background-color: $core-text-annotation
    color: $core-bg-light
    padding-left: 1em
    padding-right: 1em
    border-radius: 40px
    margin-left: 20px

  .searchbar .search-button
    display: inline-block
    float: left
    position: relative
    fill: $core-text-annotation
    left: 5px
    top: 5px

  // .searchbar:after
  //   content: ''
  //   display: table
  //   clear: both

  .searchbar
    border-radius: 5px
    padding: inherit
    border: 1px solid #c0c0c0
    width: 50%
    min-width: 200px
    max-width: 300px
    height: 35px
    float: left
    position: relative
    left: 10px
    @media screen and (min-width: $portrait-breakpoint + 1)
      font-size: 1em
      width: 100%
    @media screen and (max-width: $portrait-breakpoint)
      font-size: 0.8em
      width: 100%
      display: table-row

</style>
