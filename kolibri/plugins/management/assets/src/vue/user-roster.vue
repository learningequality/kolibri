<template>

  <div class="user-roster">

    <h2>
      All Users
    </h2>

    <span> ( {{ users.length }} )</span>

    <div class="toolbar">

      <select v-model="filter" name="user-filter">
        <option selected value="all"> All Users </option>
        <option v-bind:value="role" v-for="role in roles">
          {{role | capitalize}}
        </option>
        <option value="learners"> Learners </option>
      </select>

      <input type="search">

      <div class="create">
        <user-create-modal></user-create-modal>
      </div>

    </div>


    <hr>

    <table class="roster">

      <!-- Table Headers -->
      <thead>
        <tr>
          <th>Student Name</th>
          <th>Username</th>
          <th>Edit</th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody>
        <tr v-for="user in users">
          <!-- Student Name field -->
          <td>
            {{user.first_name}} {{user.last_name}}
            <span class="user-role" v-for="role in user.roles" v-if="user.roles.length">
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

  const actions = require('../actions');
  // const log = require('loglevel');


  module.exports = {
    components: {
      'user-create-modal': require('./user-create-modal.vue'),
      'user-edit-modal': require('./user-edit-modal.vue'),
    },
    // Has to be a funcion due to vue's treatment of data
    data: () => ({
      roles: [
        'admin',
        'coach',
      ],
      filter: '',
    }),
    computed: {
      visibleUsers() {
        return this.users;
      },
    },
    vuex: {
      getters: {
        users: state => state.users,
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
    float: left

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

</style>
