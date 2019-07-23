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
      :autofocus="true"
      :disabled="isBusy"
      :value.sync="password"
      :isValid.sync="passwordValid"
      :shouldValidate="formSubmitted"
    />
  </KModal>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
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
        passwordValid: true,
        formSubmitted: false,
      };
    },
    computed: {
      ...mapState('userManagement', ['isBusy']),
    },
    methods: {
      ...mapActions(['handleApiError']),
      ...mapActions('userManagement', ['updateFacilityUser']),
      submitForm() {
        this.formSubmitted = true;
        if (this.passwordValid) {
          // TODO handle the error within this modal (needs new strings)
          this.updateFacilityUser({ userId: this.id, updates: { password: this.password } })
            .catch(error => this.handleApiError(error))
            .then(() => this.$emit('cancel'));
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
      resetPassword: 'Reset user password',
      username: 'Username: ',
    },
  };

</script>


<style lang="scss" scoped></style>
