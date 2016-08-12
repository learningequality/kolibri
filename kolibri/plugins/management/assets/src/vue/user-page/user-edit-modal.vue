<template>

  <div class="user-edit-modal">
    <modal btntext="Edit">

      <h1 slot="header" class="header">Edit Account Info</h1>

      <div slot="body">

        <div class="user-field">
          <label for="username">Full Name</label>:
          <input type="text" class="edit-form edit-fullname" aria-label="fullname" id="name" v-model="fullName_new">
        </div>

        <div class="user-field">
          <label for="name">Username</label>:
          <input type="text" class="edit-form edit-username" aria-label="username" id="username" v-model="username_new">
        </div>

        <div class="user-field">
          <label for="user-role"><span class="visuallyhidden">User Role</span></label>
          <select v-model="user.role" id="user-role">
          <option value="learner" selected> Learner </option>
          <option value="admin"> Admin </option>
          </select>
        </div>

        <div class="user-field">
        <label for="password">Password</label>:
        <input type="password" class="edit-form" id="password" required v-model="password_new" placeholder="Please type in your password.">
        </div>

      </div>

        <div slot="footer">
          <button class="confirm-btn" type="button" @click="editUser">Confirm</button>
        </div>

        <button class="no-border" slot="openbtn">
          <span class="visuallyhidden">Edit Account Info</span>
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
          username: this.username_new,
          full_name: this.fullName_new,
          facility: this.facility,
        };
        if (this.password_new) {
          payload.password = this.password_new;
        }
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
    input
      width: 100%
      height: 40px
      font-weight: bold
      border: none
      border-bottom: 1px solid #3a3a3a
    label
      position: relative
    select
      -webkit-appearance: menulist-button
      width: 100%
      height: 40px
      font-weight: bold
      background-color: transparent

  .edit-form
    width: 200px
    margin: 0 auto
    display: block
    padding: 5px 10px
    letter-spacing: 0.08em
    border: none
    border-bottom: 1px solid $core-text-default
    height: 30px
    &:focus
      outline: none
      border-bottom: 3px solid $core-action-normal

  .edit-username
    background: url('../icons/pencil.svg') no-repeat 280px 6px
    fill: $core-action-light
    transition: all 0.15s

  .edit-fullname
    background: url('../icons/pencil.svg') no-repeat 280px 6px
    fill: $core-action-light
    transition: all 0.15s

  .header
    text-align: center

  .manage-edit
    fill: $core-action-normal
    cursor: pointer

</style>
