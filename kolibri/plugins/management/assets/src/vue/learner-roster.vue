<template>

  <div class="roster">
    <input type="search" placeholder="Search for learner...">
    <div>
      <user-create-modal></user-create-modal>
    </div>

    <table class="learner-roster">
      <tr>
        <!-- Might want to populate this another way -->
        <td>Student Name</td>
        <td>Username</td>
        <td>Edit</td>
      </tr>

      <tr v-for="learner in getLearners">
        <!-- Student Name field -->
        <td>
          {{ learner.first_name + " " + learner.last_name}}
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
    </table>
  </div>
  <div class="sidebar">
    <div class="learner-count">
      <div>Total:</div>
      <div>{{ getLearners.length }}</div>
    </div>
  </div>

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
        getLearners: state => state.learners,
      },
      actions: {
        deleteUser: actions.deleteUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .roster, .sidebar
    display: inline-block

  .learner-count
    border: solid, 1px, black
  .learner-roster
    height: 300px
    overflow:hidden
    overflow-y:scroll

</style>
