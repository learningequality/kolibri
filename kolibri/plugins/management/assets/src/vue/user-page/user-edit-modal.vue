<template>

  <core-modal
    :title="$tr('modalTitle')"
    :has-error="error_message ? true : false"
    :enableBackBtn="usr_delete || pw_reset"
    @enter="submit"
    @cancel="emitCloseSignal"
    @back="clear"
  >
    <!-- User Edit Normal -->
    <div>
      <template v-if="!usr_delete && !pw_reset">

        <div class="user-field">
          <label for="fullname">{{$tr('fullName')}}</label>:
          <input type="text" class="edit-form edit-fullname" :aria-label="$tr('fullName')" id="fullname" v-model="fullName_new">
        </div>

        <div class="user-field">
          <label for="username">{{$tr('username')}}</label>:
          <input type="text" class="edit-form edit-username" :aria-label="$tr('username')" id="username" v-model="username_new">
        </div>

        <div class="user-field">
          <label for="user-role"><span class="visuallyhidden">{{$tr('userKind')}}</span></label>
          <select v-model="kind_new" id="user-role">
            <option :value="LEARNER"> {{$tr('learner')}} </option>
            <option :value="ADMIN"> {{$tr('admin')}} </option>
            <option :value="COACH"> {{$tr('coach')}} </option>
          </select>
        </div>

        <div class="advanced-options" @keydown.enter.stop>
          <button @click="pw_reset=!pw_reset"> {{$tr('resetPw')}} </button>
          <button @click="usr_delete=!usr_delete"> {{$tr('deleteUsr')}}</button>
        </div>

        <hr class="end-modal">

      </template>

      <!-- Password Reset Mode -->
      <template v-if="pw_reset" >
        <p>{{$tr('username')}}: <b>{{ username}}</b></p>
        <div class="user-field">
          <label for="password">{{$tr('enterNewPw')}}</label>:
          <input type="password" class="edit-form" id="password" required v-model="password_new">
        </div>

        <div class="user-field">
          <label for="password-confirm">{{$tr('confirmNewPw')}}</label>:
          <input type="password" class="edit-form" id="password-confirm" required v-model="password_new_confirm">
        </div>
      </template>

      <!-- User Delete Mode -->
      <template v-if="usr_delete">
        <div class="user-field">
          {{$trHtml('deleteConfirmation', {user:username})}}
        </div>
      </template>


      <!-- Error Messages -->
      <p class="error" v-if="error_message" aria-live="polite"> {{error_message}} </p>

      <!-- Button Section TODO: cleaunup -->
      <section @keydown.enter.stop>

        <icon-button
          :text="cancelText"
          class="undo-btn"
          @click="cancelClick"
        />

        <icon-button
          :text="submitText"
          class="confirm-btn"
          :primary="true"
          @click="submit"
        />

      </section>

    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');
  const coreActions = require('kolibri.coreVue.vuex.actions');
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    $trNameSpace: 'user-edit-modal',
    $trs: {
      modalTitle: 'Edit Account Info',
      // input labels
      fullName: 'Full Name',
      username: 'Username',
      userKind: 'User Kind',
      enterNewPw: 'Enter new password',
      confirmNewPw: 'Confirm new password',
      // kind select
      learner: 'Learner',
      admin: 'Admin',
      coach: 'Coach',
      // buttons and links
      resetPw: 'Reset Password',
      deleteUsr: 'Delete User',
      save: 'Save',
      back: 'Back',
      yes: 'Yes',
      no: 'No',
      confirm: 'Confirm',
      cancel: 'Cancel',
      // confirmation messages
      // this one is going to get a little complicated
      deleteConfirmation: 'Are you sure you want to delete {user}?',
      // errors
      pwMismatch: 'Passwords must match',
      noNewPw: 'Please enter a new password',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    props: {
      userid: {
        type: String, // string is type returned from server
        required: true,
      },
      fullname: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      userkind: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        username_new: this.username,
        password_new: '',
        password_new_confirm: '',
        fullName_new: this.fullname,
        kind_new: this.userkind,
        usr_delete: false,
        pw_reset: false,
        error_message: '',
      };
    },
    computed: {
      LEARNER: () => UserKinds.LEARNER,
      COACH: () => UserKinds.COACH,
      ADMIN: () => UserKinds.ADMIN,
      submitText() {
        if (this.pw_reset) {
          return this.$tr('save');
        } else if (this.usr_delete) {
          return this.$tr('yes');
        }
        return this.$tr('confirm');
      },
      cancelText() {
        if (this.pw_reset) {
          return this.$tr('back');
        } else if (this.usr_delete) {
          return this.$tr('no');
        }
        return this.$tr('cancel');
      },
    },
    methods: {
      cancelClick() {
        if (this.pw_reset || this.usr_delete) {
          this.clear();
        } else {
          this.emitCloseSignal();
        }
      },
      clear() {
        this.usr_delete = this.pw_reset = false;
        this.username_new = this.username;
        this.fullName_new = this.fullname;
        this.kind = this.userkind;
      },
      submit() {
        // mirrors logic of how the 'confirm' buttons are displayed
        if (this.pw_reset) {
          this.changePasswordHandler();
        } else if (this.usr_delete) {
          this.deleteUserHandler();
        } else {
          this.editUserHandler();
        }
      },
      editUserHandler() {
        const payload = {
          id: this.userid,
          username: this.username_new,
          full_name: this.fullName_new,
          kind: this.kind_new,
        };
        this.updateUser(payload);
        // if logged in admin updates role to learner, redirect to learn page
        // Do SUPERUSER check, as it is theoretically possible for a DeviceAdmin
        // to have the same id as a regular user, as they are different models.
        if ((this.session_user_kind !== UserKinds.SUPERUSER) &&
          (Number(this.userid) === this.session_user_id)) {
          if (this.kind_new === UserKinds.LEARNER) {
            window.location.href = window.location.origin;
          }
        }
        // close the modal after successful submission
        this.emitCloseSignal();
      },
      deleteUserHandler() {
        // if logged in admin deleted their own account, log them out
        if (Number(this.userid) === this.session_user_id) {
          this.logout();
        }
        this.deleteUser(this.userid);
        this.emitCloseSignal();
      },
      changePasswordHandler() {
        // checks to make sure there's a new password
        if (this.password_new) {
          this.clearErrorMessage();
          if (this.password_new === this.password_new_confirm) {
            // make sure passwords match
            this.updateUser({ id: this.userid, password: this.password_new });
            this.emitCloseSignal();
          } else {
            // passwords don't match
            this.error_message = this.$tr('pwMismatch');
          }
        } else {
          // if user didn't populate the password fields
          this.error_message = this.$tr('noNewPw');
        }
      },
      emitCloseSignal() {
        this.$emit('close'); // signal parent to close
      },
      clearErrorMessage() {
        this.error_message = '';
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
        session_user_kind: state => state.core.session.kind[0],
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.coreTheme'

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

</style>
