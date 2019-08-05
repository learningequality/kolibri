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

    <KTextbox
      ref="password"
      v-model="password"
      type="password"
      :label="$tr('newPassword')"
      :autofocus="true"
      :invalid="passwordIsInvalid"
      :invalidText="passwordIsInvalidText"
      @blur="passwordBlurred = true"
    />
    <KTextbox
      ref="confirmedPassword"
      v-model="confirmedPassword"
      type="password"
      :label="$tr('confirmNewPassword')"
      :invalid="confirmedPasswordIsInvalid"
      :invalidText="confirmedPasswordIsInvalidText"
      @blur="confirmedPasswordBlurred = true"
    />
  </KModal>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import KTextbox from 'kolibri.shared.KTextbox';
  import KModal from 'kolibri.shared.KModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ResetUserPasswordModal',
    components: {
      KModal,
      KTextbox,
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
        confirmedPassword: '',
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        submittedForm: false,
      };
    },
    computed: {
      ...mapState('userManagement', ['isBusy']),
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.submittedForm) {
          if (this.password === '') {
            return this.coreString('requiredFieldLabel');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        return Boolean(this.passwordIsInvalidText);
      },
      confirmedPasswordIsInvalidText() {
        if (this.confirmedPasswordBlurred || this.submittedForm) {
          if (this.confirmedPassword === '') {
            return this.coreString('requiredFieldLabel');
          }
          if (this.confirmedPassword !== this.password) {
            return this.coreString('passwordsMismatchError');
          }
        }
        return '';
      },
      confirmedPasswordIsInvalid() {
        return Boolean(this.confirmedPasswordIsInvalidText);
      },
      formIsValid() {
        return !this.passwordIsInvalid && !this.confirmedPasswordIsInvalid;
      },
    },
    methods: {
      ...mapActions(['handleApiError']),
      ...mapActions('userManagement', ['updateFacilityUser']),
      submitForm() {
        this.submittedForm = true;
        if (this.formIsValid) {
          // TODO handle the error within this modal (needs new strings)
          this.updateFacilityUser({ userId: this.id, updates: { password: this.password } })
            .catch(error => this.handleApiError(error))
            .then(() => this.$emit('cancel'));
        } else {
          if (this.passwordIsInvalid) {
            this.$refs.password.focus();
          } else if (this.confirmedPasswordIsInvalid) {
            this.$refs.confirmedPassword.focus();
          }
        }
      },
    },
    $trs: {
      resetPassword: 'Reset user password',
      username: 'Username: ',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
    },
  };

</script>


<style lang="scss" scoped></style>
