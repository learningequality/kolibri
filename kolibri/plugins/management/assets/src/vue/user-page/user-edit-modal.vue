<template>

  <div class="user-edit-modal">
    <modal @open="clear" title="Edit Account Info" :error="error_message ? true : false">

      <!-- User Edit Normal -->
      <div @keyup.enter="editUser">
        <template v-if="!usr_delete && !pw_reset">

          <div class="user-field">
            <label for="fullname">Full Name</label>:
            <input type="text" class="edit-form edit-fullname" aria-label="fullname" id="fullname" v-model="fullName_new">
          </div>

          <div class="user-field">
            <label for="username">Username</label>:
            <input type="text" class="edit-form edit-username" aria-label="username" id="username" v-model="username_new">
          </div>

          <div class="user-field">
            <label for="user-role"><span class="visuallyhidden">User Role</span></label>
            <select v-model="role_new" id="user-role">
              <option :selected="role_new == learner" v-if="role_new" value="learner"> Learner </option>
              <option :selected="role_new == admin" value="admin"> Admin </option>
            </select>
          </div>

          <div class="advanced-options">
            <button @click="pw_reset=!pw_reset"> Reset Password </button>
            <button @click="usr_delete=!usr_delete"> Delete User</button>
          </div>

          <hr class="end-modal">

        </template>

        <!-- Password Reset Mode -->
        <template v-if="pw_reset" >
          <p>Username: <b>{{username_new}}</b></p>
          <div class="user-field">
            <label for="password">Enter new password</label>:
            <input type="password" class="edit-form" id="password" required v-model="password_new">
          </div>

          <div class="user-field">
            <label for="password-confirm">Confirm new password</label>:
            <input type="password" class="edit-form" id="password-confirm" required v-model="password_new_confirm">
          </div>
        </template>

        <!-- User Delete Mode -->
        <template v-if="usr_delete">
          <div class="user-field">
            <p>Are you sure you want to delete <b>{{username_new}}</b>?</p>
          </div>
        </template>


        <!-- Error Messages -->
        <p class="error" v-if="error_message" aria-live="polite"> {{error_message}} </p>
        <p class="confirm" v-if="confirmation_message"> {{confirmation_message}} </p>

        <!-- Button Section TODO: cleaunup -->
        <button v-if="!usr_delete && !pw_reset" class="undo-btn" type="button" @click="close">
          Cancel
        </button>

        <button v-else class="undo-btn" type="button" @click="clear">
          <!-- For reset option -->
          <template v-if="pw_reset"> Back </template>
          <!-- For delete option -->
          <template v-if="usr_delete"> No </template>
        </button>


        <button v-if="!usr_delete && !pw_reset" class="confirm-btn" type="button" @click="editUser">
          Confirm
        </button>

        <button v-if="pw_reset" class="confirm-btn" type="button" @click="changePassword">
          Save
        </button>

        <button v-if="usr_delete" class="confirm-btn" type="button" @click="delete">
          Yes
        </button>
      </div>
    </modal>

  </div>

</template>


<script>

  const actions = require('../../actions');
  const coreActions = require('kolibri').coreActions;
  const UserKinds = require('kolibri').constants.UserKinds;

  module.exports = {
    components: {
      modal: require('../modal'),
    },
    props: [
      'userid', 'username', 'fullname', 'roles', // TODO - validation
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
    ready() {
      // only because this modal is conditionally created
      this.open();
    },
    methods: {
      editUser() {
        const payload = {
          username: this.username_new,
          full_name: this.fullName_new,
          facility: this.facility,
        };
        this.updateUser(this.userid, payload, this.role_new);
        // if logged in admin updates role to learner, redirect to learn page
        if (Number(this.userid) === this.session_user_id) {
          if (this.role_new === UserKinds.LEARNER.toLowerCase()) {
            window.location.href = window.location.origin;
          }
        }

        // close the modal after successful submission
        this.close();
      },
      delete() {
        // if logged in admin deleted their own account, log them out
        if (Number(this.userid) === this.session_user_id) {
          this.logout(this.Kolibri);
        }
        this.deleteUser(this.userid);
      },
      changePassword() {
        // checks to make sure there's a new password
        if (this.password_new) {
          this.clearErrorMessage();
          this.clearConfirmationMessage();

          // make sure passwords match
          if (this.password_new === this.password_new_confirm) {
            const payload = {
              username: this.username_new,
              full_name: this.fullName_new,
              facility: this.facility,
              password: this.password_new,
            };
            this.updateUser(this.userid, payload, this.role_new);
            this.confirmation_message = 'Password change successful.';

          // passwords don't match
          } else {
            this.error_message = 'Passwords must match.';
          }

        // if user didn't populate the password fields
        } else {
          this.error_message = 'Please enter a new password.';
        }
      },
      clear() {
        this.$data = this.$options.data();
      },
      open() {
        this.$emit('open');
        this.$broadcast('open');
      },
      close() {
        this.$emit('close');
        this.$broadcast('close');
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
        logout: coreActions.kolibriLogout,
        updateUser: actions.updateUser,
        deleteUser: actions.deleteUser,
      },
      getters: {
        session_user_id: state => state.core.session.user_id,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

  .title
    display: inline

  .confirm-btn, .undo-btn
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
