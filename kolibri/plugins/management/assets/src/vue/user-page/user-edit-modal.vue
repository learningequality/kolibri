<template>

  <div>
    <modal @open="clear" title="Edit Account Info" :has-error="error_message ? true : false">
      <!-- User Edit Normal -->
      <div @keydown.enter="editUser">
        <template v-if="!usr_delete && !pw_reset">

          <name :namemodel.sync="fullName_new"></name>

          <username :usernamemodel.sync="username_new"></username>

          <role :rolemodel.sync="role_new"></role>

          <div class="advanced-options">
            <button @click="pw_reset=!pw_reset"> Reset Password </button>
            <button @click="usr_delete=!usr_delete"> Delete User</button>
          </div>

          <hr class="end-modal">

        </template>

        <!-- Password Reset Mode -->
        <template v-if="pw_reset" >

          <field-wrapper>
            Username: <b>{{username_new}}</b>
          </field-wrapper>

          <password-and-confirm
            :passwordmodel.sync="password_new"
            :confirmpasswordmodel.sync="password_new_confirm">
          </password-and-confirm>
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
        <section class="button-section" @keydown.enter.stop>
          <icon-button
            :text="$tr('cancel')"
            v-if="!usr_delete && !pw_reset"
            @click="close">
          </icon-button>

          <icon-button
            :text="$tr('no')"
            v-if="usr_delete"
            @click="clear">
          </icon-button>

          <icon-button
            :text="$tr('back')"
            v-if="pw_reset"
            @click="clear">
          </icon-button>

          <icon-button
            v-if="!usr_delete && !pw_reset"
            :text="$tr('confirm')"
            @click="editUser">
          </icon-button>

          <icon-button
            v-if="pw_reset"
            :text="$tr('save')"
            @click="changePassword">
          </icon-button>

          <icon-button
            v-if="usr_delete"
            :text="$tr('yes')"
            @click="delete">
          </icon-button>
        </section>
      </div>
    </modal>
  </div>

</template>


<script>

  const actions = require('../../actions');
  const coreActions = require('kolibri').coreActions;
  const UserKinds = require('kolibri').constants.UserKinds;

  module.exports = {
    $trNameSpace: 'management',
    $trs: {
      back: 'Back',
      cancel: 'Cancel',
      close: 'Close',
      confirm: 'Confirm',
      save: 'Save',
      yes: 'Yes',
      no: 'No',
    },
    components: {
      'icon-button': require('icon-button'),
      'modal': require('../modal'),
      'name': require('../user-input/name'),
      'username': require('../user-input/username'),
      'role': require('../user-input/role'),
      'password-and-confirm': require('../user-input/password-and-confirm'),
      'field-wrapper': require('../user-input/field-wrapper'),
    },
    props: {
      userid: {
        type: Number,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      fullname: {
        type: String,
        required: true,
      },
      roles: {
        type: Array,
        required: true,
      },
    },
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
        if (this.userid === this.session_user_id) {
          this.logout(this.Kolibri);
        }
        this.deleteUser(this.userid);

        this.close();
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

  .button-section
    button
      width: 48%

  .confirm-btn
    float: right

  .cancel-btn
    float:left

  .delete-btn
    width: 100%

  .open-btn
    background-color: $core-bg-light

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
