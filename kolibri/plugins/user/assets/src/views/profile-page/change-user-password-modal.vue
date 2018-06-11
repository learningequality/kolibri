<template>

  <core-modal
    :title="$tr('passwordChangeFormHeader')"
    size="small"
    :submitText="$tr('updateButtonLabel')"
    :cancelText="$tr('cancelButtonLabel')"
    :submitDisabled="isBusy"
    @submit="submitForm"
    @cancel="closeModal"
  >
    <k-textbox
      ref="newPassword"
      type="new-password"
      :label="$tr('newPasswordFieldLabel')"
      :invalid="newPasswordIsInvalid"
      :invalidText="newPasswordInvalidErrorText"
      :autofocus="true"
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
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { updateUserProfilePassword } from '../../state/actions';

  export default {
    name: 'changeUserPasswordModal',
    components: {
      coreModal,
      kTextbox,
    },
    data() {
      return {
        newPassword: '',
        confirmedNewPassword: '',
        newPasswordBlurred: false,
        confirmedNewPasswordBlurred: false,
        submittedForm: false,
      };
    },
    computed: {
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
          if (this.confirmedNewPassword !== this.newPassword) {
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
        this.$emit('cancel');
      },
      submitForm() {
        this.submittedForm = true;
        if (this.formIsValid) {
          this.updateUserProfilePassword(this.newPassword);
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
        updateUserProfilePassword,
      },
      getters: {
        isBusy: state => state.pageState.busy,
      },
    },
    $trs: {
      passwordChangeFormHeader: 'Change Password',
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
