<template>

  <KModal
    :title="$tr('resetPassword')"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="isBusy"
    @submit="submitForm"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('username') }}<strong>{{ username }}</strong></p>

    <PasswordTextbox
      ref="passwordTextbox"
      :autofocus="true"
      :disabled="isBusy"
      :value.sync="password"
      :isValid.sync="passwordValid"
      :shouldValidate="formSubmitted"
    />
  </KModal>

</template>


<script>

  import { mapState } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ResetUserPasswordModal',
    components: {
      KModal,
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
      };
    },
    computed: {
      ...mapState('userManagement', ['isBusy']),
    },
    methods: {
      submitForm() {
        this.formSubmitted = true;
        if (this.passwordValid) {
          // TODO handle the error within this modal (needs new strings)
          this.$store
            .dispatch('userManagement/updateFacilityUserPassword', {
              userId: this.id,
              password: this.password,
            })
            .then(() => {
              this.$emit('cancel');
              this.$store.dispatch(
                'createSnackbar',
                this.$tr('passwordChangedNotification', { username: this.username })
              );
            })
            .catch(error => this.$store.dispatch('handleApiError', error));
        } else {
          this.focusOnInvalidField();
        }
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
      resetPassword: 'Reset user password',
      username: 'Username: ',
      passwordChangedNotification: "Password changed for '{username}'",
    },
  };

</script>


<style lang="scss" scoped></style>
