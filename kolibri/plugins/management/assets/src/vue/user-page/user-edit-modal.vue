<template>

  <div class="user-edit-modal">
    <modal btntext="Edit">
      
      <h1 slot="header">Edit User</h1>
      
      <div slot="body">
        
        <div class="user-field">
        <label for="username">Username</label>:
        <input type="text" id="username" v-model="username_new" placeholder="Please type in your username.">
        </div>

        <div class="user-field">
        <label for="password">Password</label>:
        <input type="text" id="password" v-model="password_new" placeholder="Please type in your password.">
        </div>

        <div class="user-field">
        <label for="name">Full name</label>:
        <input type="text" id="name" v-model="fullName_new" placeholder="Please type in your first name.">
        </div>

        <!-- radio buttons for selecting role -->
        <fieldset>
        <legend>User role:</legend>
        <input type="radio" id="learner" value="learner" v-model="role_new"> <label for="learner">Learner</label> <br>
        <input type="radio" id="admin" value="admin" v-model="role_new"> <label for="admin">Admin</label>
        </fieldset>

      </div>

      <div slot="footer">
        <button class="confirm-btn" type="button" @click="editUser">Confirm</button>
      </div>

      <button class="no-border" slot="openbtn">
        <span class="visuallyhidden">Edit User</span>
        <svg class="manage-edit" src="../icons/pencil.svg"></svg>
      </button>

    </modal>
    
  </div>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    components: {
      modal: require('../modal'),
    },
    props: [
      'userid', 'username', 'fullname', 'roles',
    ],
    data() {
      return {
        username_new: this.username,
        password_new: '',
        fullName_new: this.fullname,
        role_new: this.roles.length ? this.roles[0].kind : 'learner',
      };
    },
    methods: {
      editUser() {
        const payload = {
          password: this.password_new,
          username: this.username_new,
          full_name: this.fullName_new,
          facility: this.facility,
        };
        this.updateUser(this.userid, payload, this.role_new);
      },
    },
    vuex: {
      getters: {
        facility: state => state.facility,
      },
      actions: {
        updateUser: actions.updateUser,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .title
    display: inline

  .no-border
    border: none

  .confirm-btn
    float: right

  .open-btn
    background-color: $core-bg-light

  .user-field
    padding-bottom: 5%
    input, select
      width: 100%
    label
      position: relative

  .manage-edit
    fill: $core-action-normal
    cursor: pointer

</style>
