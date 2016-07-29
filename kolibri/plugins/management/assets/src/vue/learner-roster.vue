<template>

  <div class="roster">
    <user-modal></user-modal>
    <input type="search" placeholder="Search for learner...">
    <div>
      <button @click="openModal">+ Learner</button>
    </div>
    <div class="learner-roster">
      <ul>
        <li v-for="learner in getLearners">
          <a href="#">{{ learner.last_name + ", " + learner.first_name + ", " + learner.role }}</a>
          <button @click="editUser(learner.id, learner.username, learner.last_name, learner.first_name, learner.role)">Manage</button>
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
      'user-modal': require('./user-modal.vue'),
    },
    methods: {
      openModal() {
        console.log(this.getLearners);
      },
      editUser(id) {
        const payload = {
          // password: this.passWord,
          username: 'eli',
          first_name: 'yoo',
          last_name: 'hoo',
          facility: 1,
        };
        this.updateUser(id, payload, 'learner');
      },
    },
    vuex: {
      getters: {
        getLearners: state => state.learners,
      },
      actions: {
        deleteUser: actions.deleteUser,
        updateUser: actions.updateUser,
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
