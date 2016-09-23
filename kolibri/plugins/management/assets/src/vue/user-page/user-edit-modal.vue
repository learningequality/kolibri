<template>

  <core-modal
    title="Edit Account Info"
    :has-error="error_message ? true : false"
    @enter="editUser"
    @cancel="close"
  >
    <!-- User Edit Normal -->
    <div>
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

        <div class="advanced-options" @keydown.enter.stop>
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
      <section @keydown.enter.stop>

        <icon-button
          v-if="!usr_delete && !pw_reset"
          text="Cancel"
          class="undo-btn"
          @click="close">
        </icon-button>

        <!-- 'Back' for reset, 'No' for delete -->
        <icon-button
          v-else
          :text="pw_reset ? 'Back' : 'No'"
          class="undo-btn"
          @click="clear">
        </icon-button>

        <icon-button
          v-if="!usr_delete && !pw_reset"
          text="Confirm"
          class="confirm-btn"
          :primary="true"
          @click="editUser">
        </icon-button>

        <icon-button
          v-if="pw_reset"
          text="Save"
          class="confirm-btn"
          :primary="true"
          @click="changePassword">
        </icon-button>

        <icon-button
          v-if="usr_delete"
          text="Yes"
          class="confirm-btn"
          :primary="true"
          @click="delete">
        </icon-button>

      </section>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');
  const coreActions = require('kolibri/coreVue/vuex/actions');
  const UserKinds = require('kolibri/coreVue/vuex/constants').UserKinds;

  module.exports = {
    components: {
      'icon-button': require('kolibri/coreVue/components/iconButton'),
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
    attached() {
      // clear form on load
      this.clear();
    },
    methods: {
      clear() {
        this.$data = this.$options.data();
      },
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
      close() {
        this.$emit('close'); // signal parent to close
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

  @require '~kolibri/styles/coreTheme'

  .title
    display: inline

  .confirm-btn, .undo-btn
    width: 48%

  .confirm-btn
    float: right

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

  p
    word-break: keep-all

  .error
    color: red
  .confirm
    color: green

</style>
