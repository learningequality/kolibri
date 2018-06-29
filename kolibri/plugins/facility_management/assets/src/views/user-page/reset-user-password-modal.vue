<template>

  <core-modal
    :title="$tr('resetPassword')"
    @cancel="displayModal(false)"
  >
    <form @submit.prevent="submitForm">

      <p>{{ $tr('username') }}: <strong>{{ username }}</strong></p>

      <k-textbox
        ref="password"
        type="password"
        :label="$tr('newPassword')"
        :autofocus="true"
        :invalid="passwordIsInvalid"
        :invalidText="passwordIsInvalidText"
        @blur="passwordBlurred = true"
        v-model="password"
      />
      <k-textbox
        ref="confirmedPassword"
        type="password"
        :label="$tr('confirmNewPassword')"
        :invalid="confirmedPasswordIsInvalid"
        :invalidText="confirmedPasswordIsInvalidText"
        @blur="confirmedPasswordBlurred = true"
        v-model="confirmedPassword"
      />

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          :primary="false"
          appearance="flat-button"
          @click="displayModal(false)"
        />
        <k-button
          type="submit"
          :text="$tr('save')"
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
  import { handleApiError } from 'kolibri.coreVue.vuex.actions';
  import { displayModal } from '../../state/actions';
  import { updateFacilityUser } from '../../state/actions/user';

  export default {
    name: 'resetUserPasswordModal',
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
        password: '',
        confirmedPassword: '',
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        submittedForm: false,
      };
    },
    computed: {
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.submittedForm) {
          if (this.password === '') {
            return this.$tr('required');
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
            return this.$tr('required');
          }
          if (this.confirmedPassword !== this.password) {
            return this.$tr('passwordMatchError');
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
      submitForm() {
        this.submittedForm = true;
        if (this.formIsValid) {
          // TODO handle the error within this modal (needs new strings)
          this.updateFacilityUser({ userId: this.id, updates: { password: this.password } })
            .catch(error => this.handleApiError(error))
            .then(() => this.displayModal(false));
        } else {
          if (this.passwordIsInvalid) {
            this.$refs.password.focus();
          } else if (this.confirmedPasswordIsInvalid) {
            this.$refs.confirmedPassword.focus();
          }
        }
      },
    },
    vuex: {
      actions: {
        updateFacilityUser,
        displayModal,
        handleApiError,
      },
      getters: {
        isBusy: state => state.pageState.isBusy,
      },
    },
    $trs: {
      resetPassword: 'Reset user password',
      username: 'Username',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
      passwordMatchError: 'Passwords do not match',
      required: 'This field is required',
      cancel: 'cancel',
      save: 'Save',
    },
  };

</script>


<style lang="stylus" scoped></style>
