<template>

  <KModal
    :title="$tr('resetPassword')"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="busy"
    :cancelDisabled="busy"
    @submit="submitForm"
    @cancel="$emit('cancel')"
  >
    <p>
      {{ $tr('username') }}<strong>{{ username }}</strong>
    </p>

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

  export default {
    name: 'ResetUserPasswordModal',
    components: {
      PasswordTextbox,
    },
    mixins: [commonCoreStrings],
    props: {
      id: {
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
        password: '',
        passwordValid: false,
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
          .dispatch('userManagement/updateFacilityUserPassword', {
            userId: this.id,
            password: this.password,
          })
          .then(() => {
            this.busy = false;
            this.$emit('cancel');
            this.showSnackbarNotification('passwordReset');
          })
          .catch(error => this.$store.dispatch('handleApiError', { error }));
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
      resetPassword: {
        message: 'Reset user password',
        context: "Refers to the 'Reset password' option in the Facility > Users section.",
      },
      username: {
        message: 'Username: ',
        context: "Displayed in the 'Reset user password' window.\n",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
