<template>

  <KModal
    :title="$tr('passwordChangeFormHeader')"
    size="small"
    :submitText="$tr('updateButtonLabel')"
    :cancelText="$tr('cancelButtonLabel')"
    :submitDisabled="isBusy"
    @submit="submitForm"
    @cancel="$emit('cancel')"
  >
    <PasswordTextbox
      ref="PasswordTextbox"
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
    name: 'ChangeUserPasswordModal',
    components: {
      KModal,
      PasswordTextbox,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        password: '',
        passwordValid: true,
        formSubmitted: false,
      };
    },
    computed: {
      ...mapState('profile', ['isBusy']),
    },
    methods: {
      submitForm() {
        this.formSubmitted = true;
        if (this.passwordValid) {
          this.$store.dispatch('profile/updateUserProfilePassword', this.password);
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.passwordValid) {
            this.$refs.PasswordTextbox.focus();
          }
        });
      },
    },
    $trs: {
      passwordChangeFormHeader: 'Change Password',
      cancelButtonLabel: 'cancel',
      updateButtonLabel: 'update',
    },
  };

</script>


<style lang="scss" scoped></style>
