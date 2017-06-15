<template>

  <core-modal
    :title="titleText"
    :has-error="error_message ? true : false"
    :enableBackBtn="usr_delete || pw_reset"
    @enter="submit"
    @cancel="close"
    @back="clear"
  >
    <!-- User Edit Normal -->
    <div>
      <template v-if="!usr_delete && !pw_reset">

        <core-textbox
          :label="$tr('fullName')"
          type="text"
          class="user-field"
          :aria-label="$tr('fullName')"
          v-model="fullName_new"/>

        <core-textbox
          :label="$tr('username')"
          type="text"
          class="user-field"
          :aria-label="$tr('username')"
          v-model="username_new"/>

        <div class="user-field">
          <label for="user-role"><span class="visuallyhidden">{{$tr('userKind')}}</span></label>
          <select v-model="kind_new" id="user-role">
            <option :value="LEARNER"> {{$tr('learner')}} </option>
            <option :value="COACH"> {{$tr('coach')}} </option>
            <option :value="ADMIN"> {{$tr('admin')}} </option>
          </select>
        </div>

        <div class="advanced-options" @keydown.enter.stop>
          <button @click="pw_reset=!pw_reset"> {{$tr('resetPw')}} </button>
          <button @click="usr_delete=!usr_delete" :disabled="userid === session_user_id"> {{$tr('deleteUsr')}}</button>
        </div>

        <hr class="end-modal">

      </template>

      <!-- Password Reset Mode -->
      <template v-if="pw_reset" >
        <p>{{$tr('username')}}: <b>{{ username}}</b></p>

        <core-textbox
          :label="$tr('enterNewPw')"
          type="password"
          class="user-field"
          :aria-label="$tr('enterNewPw')"
          v-model="password_new"/>
        <core-textbox
          :label="$tr('confirmNewPw')"
          type="password"
          class="user-field"
          :aria-label="$tr('confirmNewPw')"
          v-model="password_new_confirm"/>
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

  const actions = require('../../state/actions');
  const coreActions = require('kolibri.coreVue.vuex.actions');
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    $trNameSpace: 'userEditModal',
    $trs: {
      editTitle: 'Edit account info',
      passwordTitle: 'Reset account password',
      deleteTitle: 'Delete account',
      // input labels
      fullName: 'Full name',
      username: 'Username',
      userKind: 'User kind',
      enterNewPw: 'Enter new password',
      confirmNewPw: 'Confirm new password',
      // kind select
      learner: 'Learner',
      admin: 'Admin',
      coach: 'Coach',
      // buttons and links
      resetPw: 'Reset password',
      deleteUsr: 'Delete user',
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
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
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
      titleText() {
        if (this.pw_reset) {
          return this.$tr('passwordTitle');
        } else if (this.usr_delete) {
          return this.$tr('deleteTitle');
        }
        return this.$tr('editTitle');
      },
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
          this.close();
        }
      },
      clear() {
        this.usr_delete = false;
        this.pw_reset = false;
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
        this.close();
      },
      deleteUserHandler() {
        // if logged in admin deleted their own account, log them out
        if (Number(this.userid) === this.session_user_id) {
          this.logout();
        }
        this.deleteUser(this.userid);
        this.close();
      },
      changePasswordHandler() {
        // checks to make sure there's a new password
        if (this.password_new) {
          this.clearErrorMessage();
          if (this.password_new === this.password_new_confirm) {
            // make sure passwords match
            this.updateUser({ id: this.userid, password: this.password_new });
            this.close();
          } else {
            // passwords don't match
            this.error_message = this.$tr('pwMismatch');
          }
        } else {
          // if user didn't populate the password fields
          this.error_message = this.$tr('noNewPw');
        }
      },
      close() {
        this.displayModal(false);
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
        displayModal: actions.displayModal,
      },
      getters: {
        session_user_id: state => state.core.session.user_id,
        session_user_kind: state => state.core.session.kind[0],
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

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
    margin-bottom: 5%
    select
      -webkit-appearance: menulist-button
      width: 100%
      height: 40px
      font-weight: bold
      background-color: transparent
    p
      text-align: center

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
    color: $core-text-error

</style>
