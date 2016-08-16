<template>

  <div class="user-edit-modal">
    <modal v-ref:modal btntext="Edit">

      <h1 slot="header" class="header">Edit Account Info</h1>

      <div @keyup.enter="editUser" v-if="!usr_delete && !pw_reset" slot="body">

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
          <select v-model="role_new" id="user-role">
            <option :selected="role_new == admin ? true : false" v-if="role_new" value="learner"> Learner </option>
            <option :selected="role_new == admin ? true : false" value="admin"> Admin </option>
          </select>
        </div>

        <div class="advanced-options" v-if="!pw_reset && !usr_delete">
          <button @click="pw_reset=!pw_reset"> Reset Password </button>
          <button @click="usr_delete=!usr_delete"> Delete User</button>
        </div>

        <hr class="end-modal">

      </div>

      <div @keyup.enter="editUser" v-if="pw_reset" slot="body">
        <p>Username: <b>{{username_new}}</b></p>
        <div class="user-field">
          <label for="password">Enter new password</label>:
          <input type="password" class="edit-form" id="password" required v-model="password_new">
        </div>

        <div class="user-field">
          <label for="password-confirm">Confirm new password</label>:
          <input type="password" class="edit-form" id="password-confirm" required v-model="password_new_confirm">
        </div>
      </div>

      <div @keyup.enter="editUser" v-if="usr_delete" slot="body">
        <div class="user-field">
          <p> Are you sure you want to delete
          <b>{{username_new}}</b>?
          </p>
        </div>
      </div>

      <div slot="footer">
        <p class="error" v-if="error_message"> {{error_message}} </p>
        <p class="confirm" v-if="confirmation_message"> {{confirmation_message}} </p>
        <button class="cancel-btn" type="button" @click="cancel">
          <!-- For reset option -->
          <template v-if="pw_reset"> Back </template>
          <!-- For delete option -->
          <template v-if="usr_delete"> No </template>
          <!-- For main window -->
          <template v-if="!pw_reset && !usr_delete"> Cancel </template>
        </button>

        <button class="confirm-btn" type="button" @click="editUser">
          <template v-if="pw_reset"> Save </template>
          <template v-if="usr_delete"> Yes </template>
          <template v-if="!pw_reset && !usr_delete"> Confirm </template>
        </button>
        <br>

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
        password_new_confirm: '',
        fullName_new: this.fullname,
        role_new: this.roles.length ? this.roles[0].kind : 'learner',
        usr_delete: false,
        pw_reset: false,
        error_message: '',
        confirmation_message: '',
      };
    },
    methods: {
      editUser() {
        let updatable = true;
        // delete the user if that's the option selected
        if (this.usr_delete) {
          this.deleteUser(this.userid);
        } else {
          const payload = {
            username: this.username_new,
            full_name: this.fullName_new,
            facility: this.facility,
          };

          // check to see if there's a new password
          if (this.password_new) {
            updatable = false;
            this.clearErrorMessage();
            this.clearConfirmationMessage();
            // make sure passwords match
            if (this.password_new === this.password_new_confirm) {
              payload.password = this.password_new;
              this.confirmation_message = 'Password change successful.';
            } else {
              this.error_message = 'Passwords must match.';
            }
          }

          if (updatable) {
            // save user changes
            this.updateUser(this.userid, payload, this.role_new);
            this.password_new = '';
            this.password_new_confirm = '';
            if (!(this.usr_delete || this.pw_reset)) {
              this.cancel();
            }
          }
        }
      },
      cancel() {
        if (this.usr_delete || this.pw_reset) {
          this.usr_delete = this.pw_reset = false;
        } else {
          this.$refs.modal.closeModal();
        }

        this.clearErrorMessage();
        this.clearConfirmationMessage();
      },
      clearErrorMessage() {
        this.error_message = '';
      },
      clearConfirmationMessage() {
        this.confirmation_message = '';
      },
    },
    vuex: {
      actions: {
        updateUser: actions.updateUser,
        deleteUser: actions.deleteUser,
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

  .confirm-btn, .cancel-btn
    width: 48%

  .confirm-btn
    float: right
    background-color: $core-action-normal
    color: white
    &:hover
      border-color: $core-action-normal

  .cancel-btn
    float:left

  .delete-btn
    width: 100%

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
    p
      text-align: center

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

  .header
    text-align: center

  .manage-edit
    fill: $core-action-normal
    cursor: pointer

  .advanced-options
    padding-bottom: 5%
    button
      display: block
      border: none

  .end-modal
    position: relative
    width: 378px
    left: -30px

  p
    word-break: keep-all

  .error
    color: red
  .confirm
    color: green

</style>
