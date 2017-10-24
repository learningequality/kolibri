<template>

  <core-modal :title="$tr('editUser')" @cancel="displayModal(false)">
    <form @submit.prevent="submitForm">

      <ui-alert v-if="error" type="error" :dismissible="false">{{ error }}</ui-alert>

      <k-textbox
        ref="name"
        type="text"
        :label="$tr('fullName')"
        :autofocus="true"
        :maxlength="120"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        @blur="nameBlurred = true"
        v-model="newName"
      />

      <k-textbox
        ref="username"
        type="text"
        :label="$tr('username')"
        :maxlength="30"
        :invalid="usernameIsInvalid"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
        v-model="newUsername"
      />

      <div>
        <label for="user-role">
          <span class="visuallyhidden">{{ $tr('userKind') }}</span>
        </label>
        <select v-model="newKind" id="user-role">
          <option :value="LEARNER"> {{ $tr('learner') }} </option>
          <option :value="COACH"> {{ $tr('coach') }} </option>
          <option :value="ADMIN"> {{ $tr('admin') }} </option>
        </select>
      </div>

      <div class="ta-r">
        <k-button
          :text="$tr('cancel')"
          :primary="false"
          appearance="flat-button"
          @click="displayModal(false)"
        />
        <k-button
          type="submit"
          :text="$tr('save')"
          :primary="true"
          appearance="raised-button"
          :disabled="isBusy"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import { updateUser, displayModal } from '../../state/actions';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'kolibri.lib.uiAlert';

  export default {
    name: 'editUserModal',
    $trs: {
      editUser: 'Edit user',
      fullName: 'Full name',
      username: 'Username',
      userKind: 'User kind',
      admin: 'Admin',
      coach: 'Coach',
      learner: 'Learner',
      save: 'Save',
      cancel: 'Cancel',
      required: 'This field is required',
      usernameNotAlphaNumUnderscore: 'Username can only contain letters, numbers, and underscores',
    },
    components: {
      kButton,
      coreModal,
      kTextbox,
      uiAlert,
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      kind: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        newName: this.name,
        newUsername: this.username,
        newKind: this.kind,
        nameBlurred: false,
        usernameBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      LEARNER: () => UserKinds.LEARNER,
      COACH: () => UserKinds.COACH,
      ADMIN: () => UserKinds.ADMIN,
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.newName === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return !!this.nameIsInvalidText;
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.newUsername === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.newUsername)) {
            return this.$tr('usernameNotAlphaNumUnderscore');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return !!this.usernameIsInvalidText;
      },
      formIsValid() {
        return !this.nameIsInvalid && !this.usernameIsInvalid;
      },
    },
    methods: {
      submitForm() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          const userUpdates = {};
          if (this.newUsername !== this.username) {
            userUpdates.username = this.newUsername;
          }
          if (this.newName !== this.name) {
            userUpdates.full_name = this.newName;
          }
          if (this.newKind !== this.kind) {
            userUpdates.kind = this.newKind;
          }
          this.updateUser(this.id, userUpdates);
          if (
            this.currentUserId === this.id &&
            this.currentUserKind !== UserKinds.SUPERUSER &&
            this.newKind === UserKinds.LEARNER
          ) {
            window.location.href = window.location.origin;
          }
        } else {
          if (this.nameIsInvalid) {
            this.$refs.name.focus();
          } else if (this.usernameIsInvalid) {
            this.$refs.username.focus();
          }
        }
      },
    },
    vuex: {
      actions: {
        updateUser,
        displayModal,
      },
      getters: {
        currentUserId: state => state.core.session.user_id,
        currentUserKind: state => state.core.session.kind[0],
        error: state => state.pageState.error,
        isBusy: state => state.pageState.isBusy,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  select
    width: 100%
    background-color: transparent
    margin-top: 16px
    margin-bottom: 16px

  .ta-r
    text-align: right

</style>
