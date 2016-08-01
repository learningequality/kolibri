<template>

  <div class="roster">
    <div>
      <user-create-modal></user-create-modal>
    </div>
    <div class="user-roster">
      <ul>
        <li v-for="user in getUsers">
          <a>{{ user.last_name + ", " + user.first_name + ", "}} {{user.roles.length ? user.roles[0].kind : "user" }}</a>
          <user-edit-modal :userid="user.id" :roles="user.roles" :username="user.username" :firstname="user.first_name" :lastname="user.last_name"></user-edit-modal>
          <button @click="deleteUser(user.id)">Delete</button>
        </li>
      </ul>
    </div>
  </div>
  <div class="sidebar">
    <div class="user-count">
      <div>Total:</div>
      <div>{{ getUsers.length }}</div>
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
        getUsers: state => state.users,
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

  .user-count
    border: solid, 1px, black
  .user-roster
    height: 300px
    overflow:hidden
    overflow-y:scroll

</style>
