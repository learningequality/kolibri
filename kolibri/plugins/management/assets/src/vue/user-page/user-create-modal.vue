<template>

  <div class="user-creation-modal">
    <modal v-ref:modal btntext="Add New">

      <h1 slot="header" class="header">Add New Account</h1>

      <div slot="body">

        <div class="user-field">
          <label for="name">Name</label>
          <input type="text" autocomplete="name"  autofocus="true" required v-model="user.full_name">
        </div>

        <div class="user-field">
          <label for="username">Username</label>
          <input type="text" autocomplete="username" id="username" required v-model="user.username">
        </div>

        <div class="user-field">
          <label for="username">Password</label>
          <input type="password" id="password" required v-model="user.password">
        </div>
        <div class="user-field">
<<<<<<< HEAD
          <label for="role">Role</label>
          <select v-model="role">
=======
          <select v-model="user.role">
>>>>>>> upstream/master
            <option value="learner" selected> Learner </option>
            <option value="admin"> Admin </option>
          </select>
        </div>

      </div>

      <div slot="footer">
        <button class="create-btn" type="button" @click="createNewUser">Create Account</button>
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
        user: {
          username: '',
          password: '',
          full_name: '',
        },
        role: 'learner',
      };
    },
    methods: {
      createNewUser() {
        this.user.facility = this.facility;
        // using promise to ensure that the user is created before closing
        // can use this promise to have flash an error in the modal?
        this.createUser(this.user, this.role).then(() => {
          for (const userProp of Object.getOwnPropertyNames(this.user)) {
            this.user[userProp] = '';
          }
          this.$refs.modal.closeModal();
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

  @require '~core-theme'

  $button-content-size = 1em

  .user-field
    padding-bottom: 5%
    input
      width: 100%
      height: 40px
    label
      position: relative
      cursor: pointer
    select
      height: 40px
      width: 100%
  .header
    text-align: center
  .create-btn
    float: right
    background-color: $core-action-normal
    color: $core-bg-canvas
    &:hover
      border-color: transparent
      color: $core-action-light

</style>
