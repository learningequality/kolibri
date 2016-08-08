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

      <input
        v-model="searchFilter"
        svg url="../icons/search.svg"
        type="search"
        placeholder="Search for a user...">

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
        users: state => state.users,
        roles: state => state.roles,
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
    padding: 1em

  .toolbar:after
    content: ''
    display: table
    clear: both


  // Toolbar Styling
  .create
    float: right

  input[type='search']
    display: inline-block
    border: 1px solid #ccc
    box-shadow: inset 0 1px 3px #ddd
    border-radius: 2em
    padding: 0.5em 1em
    vertical-align: middle
    box-sizing: border-box
    position: relative
    left: 10px
    &:focus
      outline: none
      border-color: $core-text-annotation

  select[name='user-filter']
    float: left

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

  .search-button
    width: 20px
    height: 20px

  .searchbar .search-button
    display: inline-block
    float: left
    position: relative
    left: 5px
    top: 1px

  .searchbar:after
    content: ''
    display: table
    clear: both

  .searchbar
    border-radius: 5px
    padding: inherit
    border: 1px solid #686868
    width: 40%
    min-width: 200px
    max-width: 300px
    height: 25px
    float: left
    position: relative
    left: 10px

</style>
