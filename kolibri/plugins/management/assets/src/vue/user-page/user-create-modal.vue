<template>

  <div class="user-creation-modal">
    <modal v-ref:modal btntext="Add New">

      <h1 slot="header">Add New Account</h1>

      <div slot="body">

        <div class="user-field">
          <label for="name">Name</label>
          <input type="text" autocomplete="name"  autofocus="true" required v-model="full_name">
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
        <p v-if="errorMessage">{{errorMessage}}</p>
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
        full_name: '',
        role: 'learner',
        errorMessage: '',
      };
    },
    methods: {
      createNewUser() {
        const newUser = {
          username: this.username,
          password: this.password,
          full_name: this.full_name,
          facility: this.facility,
        };
        // using promise to ensure that the user is created before closing
        this.createUser(newUser, this.role).then(
          () => {
            this.full_name = '';
            this.username = '';
            this.password = '';
            this.$refs.modal.closeModal();
          }).catch((error) => {
            if (error.status.code === 409) {
              this.errorMessage = error.entity;
            } else if (error.status.code === 403) {
              this.errorMessage = error.entity;
            } else {
              this.errorMessage = `Whoops! Something went wrong.`;
            }
          });
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
