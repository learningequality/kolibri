<template>

  <KModal
    :title="$tr('passwordChangeFormHeader')"
    size="medium"
    :submitText="coreString('updateAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="busy"
    :cancelDisabled="busy"
    @submit="submitForm"
    @cancel="$emit('cancel')"
  >
    <PasswordTextbox
      ref="passwordTextbox"
      :autofocus="true"
      :disabled="busy"
      :value.sync="password"
      :isValid.sync="passwordValid"
      :shouldValidate="formSubmitted"
    />
  </KModal>

</template>


<script>

  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useSnackbar from 'kolibri/composables/useSnackbar';

  export default {
    name: 'ChangeUserPasswordModal',
    components: {
      PasswordTextbox,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    data() {
      return {
        password: '',
        passwordValid: true,
        formSubmitted: false,
        busy: false,
      };
    },
    methods: {
      submitForm() {
        this.formSubmitted = true;

        if (!this.passwordValid) {
          return this.focusOnInvalidField();
        }

        this.busy = true;
        this.$store
          .dispatch('profile/updateUserProfilePassword', this.password)
          .then(() => {
            this.busy = false;
            this.$emit('cancel');
            this.createSnackbar(this.$tr('passwordChangedNotification'));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.passwordValid) {
            this.$refs.passwordTextbox.focus();
          }
        });
      },
    },
    $trs: {
      passwordChangeFormHeader: {
        message: 'Change Password',
        context:
          'Users have the option to change their password if, for example, they have forgotten it.\n\nThis is the text that appears on the change password header.',
      },
      passwordChangedNotification: {
        message: 'Your password has been changed.',
        context: 'Notification indicating a user has changed their password.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
