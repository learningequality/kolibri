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

  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ChangeUserPasswordModal',
    components: {
      PasswordTextbox,
    },
    mixins: [commonCoreStrings],
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
            this.$store.dispatch('createSnackbar', this.$tr('passwordChangedNotification'));
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
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
      passwordChangeFormHeader: 'Change Password',
      passwordChangedNotification: 'Your password has been changed.',
    },
  };

</script>


<style lang="scss" scoped></style>
