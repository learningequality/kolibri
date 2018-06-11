<template>

  <core-modal
    :title="$tr('passwordChangeFormHeader')"
    @cancel="closeModal"
  >
    <form @submit.prevent="submitForm">

      <k-textbox
        ref="newPassword"
        type="password"
        autocomplete="new-password"
        :label="$tr('newPasswordFieldLabel')"
        :invalid="newPasswordIsInvalid"
        :invalidText="newPasswordInvalidErrorText"
        :autofocus="true"
        @blur="newPasswordBlurred = true"
        v-model="newPassword"
      />
      <k-textbox
        ref="confirmedNewPassword"
        type="password"
        autocomplete="new-password"
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

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { updateUserProfilePassword } from '../../state/actions';

  export default {
    name: 'changeUserPasswordModal',
    components: {
      coreModal,
      kTextbox,
      kButton,
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
        return Boolean(this.newPasswordInvalidErrorText);
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
        return Boolean(this.confirmedNewPasswordInvalidErrorText);
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
