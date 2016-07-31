<template>

  <div class="roster">
    <input type="search" placeholder="Search for learner...">
    <div>
      <user-create-modal></user-create-modal>
    </div>
    <div class="learner-roster">
      <ul>
        <li v-for="learner in getLearners">
          <a>{{ learner.last_name + ", " + learner.first_name + ", " + learner.role }}</a>
          <user-edit-modal :currid="learner.id" :currrole="learner.role" :currname="learner.username" :currfirstname="learner.first_name" :currlastname="learner.last_name"></user-edit-modal>
          <button @click="deleteUser(learner.id)">Delete</button>
        </li>
      </ul>
    </div>
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
        facility: state => state.facility,
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
