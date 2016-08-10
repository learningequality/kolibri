<template>

  <div class="user-creation-modal">
    <modal btntext="Add New">

      <h2 slot="header">Add New Account</h2>

      <div slot="body">

        <div class="user-field">
          <label for="name">Name</label>
          <input type="text" autocomplete="name"  autofocus="true" required v-model="fullName">
        </div>

        <div class="user-field">
          <label for="username">Username</label>
          <input type="text" autocomplete="username" id="username" required v-model="username">
        </div>

        <div class="user-field">
          <label for="username">Password</label>
          <input type="password" id="password" required v-model="password">
        </div>

        <div class="user-field">
          <select v-model="role">
            <option value="learner" selected> Learner </option>
            <option value="admin"> Admin </option>
          </select>
        </div>

      </div>

      <div slot="footer">
        <button class="create-btn" type="button" @click="createNewUser">Create User</button>
      </div>

      <icon-button text="Add New" :primary="false" slot="openbtn">
        <svg class="add-user" src="../icons/add_new_user.svg"></svg>
      </icon-button>
    </modal>
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      'icon-button': require('icon-button'),
      'modal': require('../modal'),
    },
    data() {
      return {
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'learner',
      };
    },
    methods: {
      createNewUser() {
        const payload = {
          password: this.password,
          username: this.username,
          full_name: this.fullName,
          facility: this.facility,
        };
        this.createUser(payload, this.role);
      },
    },
    vuex: {
      getters: {
        facility: state => state.facility,
      },
      actions: {
        createUser: actions.createUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  $button-content-size = 1em

  .user-field
    padding-bottom: 5%
    input, select
      width: 100%
    label
      position: relative

</style>
