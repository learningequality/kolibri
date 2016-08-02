<template>

  <h2>
    All Users
  </h2>

  <span> ( {{ getUsers.length }} )</span>

  <div class="toolbar">

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
      <tr v-for="learner in getUsers">
        <!-- Student Name field -->
        <td>
          {{learner.first_name}} {{learner.last_name}}
          <!-- {{learner.roles.length ? learner.roles[0].kind : "learner" }} -->
        </td>

        <!-- Username field -->
        <td>
          {{learner.username}}
        </td>

        <!-- Edit field -->
        <td>
          <user-edit-modal
            :userid="learner.id"
            :roles="learner.roles"
            :username="learner.username"
            :firstname="learner.first_name"
            :lastname="learner.last_name">
          </user-edit-modal>
        </td>

        <!-- <button @click="deleteUser(learner.id)">Delete</button> -->
      </tr>
    </tbody>

  </table>

  

</template>


<script>

  const actions = require('../actions');


  module.exports = {
    components: {
      'user-create-modal': require('./user-create-modal.vue'),
      'user-edit-modal': require('./user-edit-modal.vue'),
    },
    vuex: {
      getters: {
        getUsers: state => state.users,
      },
      actions: {
        deleteUser: actions.deleteUser,
      },
    }
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme'

  /*Padding height that separates rows from eachother*/
  $row-padding = 1.5em

  .toolbar:after
    content: ''
    display: table
    clear: both


  .create
    float: right

  input[type='search']
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
    color: $core-text-annotation

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

</style>
