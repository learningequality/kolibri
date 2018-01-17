<template>

  <core-modal
    :title="$tr('passwordChangeFormHeader')"
    @cancel="closeModal"
  >
    <form @submit.prevent="submitForm">

      <k-textbox
        ref="currentPassword"
        type="password"
        :label="$tr('currentPasswordFieldLabel')"
        :autofocus="true"
        :invalid="currentPasswordIsInvalid"
        :invalidText="currentPasswordInvalidErrorText"
        @blur="currentPasswordBlurred = true"
        v-model="password"
      />
      <k-textbox
        ref="newPassword"
        type="new-password"
        :label="$tr('newPasswordFieldLabel')"
        :invalid="newPasswordIsInvalid"
        :invalidText="newPasswordInvalidErrorText"
        @blur="newPasswordBlurred = true"
        v-model="newPassword"
      />
      <k-textbox
        ref="confirmedNewPassword"
        type="new-password"
        :label="$tr('confirmNewPasswordFieldLabel')"
        :invalid="confirmedNewPasswordIsInvalid"
        :invalidText="confirmedNewPasswordInvalidErrorText"
        @blur="confirmedNewPasswordBlurred = true"
        v-model="confirmedNewPassword"
      />

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancelButtonLabel')"
          :primary="false"
          appearance="flat-button"
          @click="closeModal"
        />
        <k-button
          type="submit"
          :text="$tr('updateButtonLabel')"
          :primary="true"
          appearance="raised-button"
          :disabled="isBusy"
        />
      </div>

    </form>
  </core-modal>

</template>


<script>

  // import { updateUser, displayModal } from '../../state/actions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'changeUserPasswordModal',
    components: {
      coreModal,
      kTextbox,
      kButton,
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
    },
    data() {
      return {
        currentPassword: '',
        newPassword: '',
        confirmedNewPassword: '',
        currentPasswordBlurred: false,
        newPasswordBlurred: false,
        confirmedNewPasswordBlurred: false,
        submittedForm: false,
      };
    },
    computed: {
      currentPasswordIsInvalid() {
        return !!this.currentPasswordInvalidErrorText;
      },
      currentPasswordInvalidErrorText() {
        // TODO add wrong password text
        if (this.currentPasswordBlurred || this.submittedForm) {
          if (this.currentPassword === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      newPasswordInvalidErrorText() {
        if (this.newPasswordBlurred || this.submittedForm) {
          if (this.newPassword === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      newPasswordIsInvalid() {
        return !!this.newPasswordInvalidErrorText;
      },
      confirmedNewPasswordInvalidErrorText() {
        if (this.confirmedNewPasswordBlurred || this.submittedForm) {
          if (this.confirmedNewPassword === '') {
            return this.$tr('required');
          }
          if (this.confirmedNewPassword !== this.password) {
            return this.$tr('passwordMismatchErrorMessage');
          }
        }
        return '';
      },
      confirmedNewPasswordIsInvalid() {
        return !!this.confirmedNewPasswordInvalidErrorText;
      },
      formIsValid() {
        return !this.newPasswordIsInvalid && !this.confirmedNewPasswordIsInvalid;
      },
    },
    methods: {
      closeModal() {
        this.$emit('closePasswordModal');
      },
      submitForm() {
        this.submittedForm = true;
        if (this.formIsValid) {
          this.updateUser(this.id, { password: this.password });
        } else {
          if (this.newPasswordIsInvalid) {
            this.$refs.newPassword.focus();
          } else if (this.confirmedNewPasswordIsInvalid) {
            this.$refs.confirmedNewPassword.focus();
          }
        }
      },
    },
    vuex: {
      actions: {
        // updateUser,
        // displayModal,
      },
      getters: {
        isBusy: state => state.pageState.isBusy,
      },
    },
    $trs: {
      passwordChangeFormHeader: 'Change Password',
      currentPasswordFieldLabel: 'Enter current password',
      newPasswordFieldLabel: 'Enter new password',
      confirmNewPasswordFieldLabel: 'Re-enter new password',
      passwordMismatchErrorMessage: 'New passwords do not match',
      required: 'This field is required',
      cancelButtonLabel: 'cancel',
      updateButtonLabel: 'update',
    },
  };

</script>


<style lang="stylus" scoped></style>
