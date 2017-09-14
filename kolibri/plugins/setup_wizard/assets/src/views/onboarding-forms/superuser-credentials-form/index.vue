<template>

  <onboarding-form
    :header="$tr('adminAccountCreationHeader')"
    :description="$tr('adminAccountCreationDescription')"
    :submit-text="submitText"
    @submit="setSuperuserCredentials">

      <k-textbox
        v-model="name"
        :label="$tr('adminNameFieldLabel')"
        :autofocus="true"
        autocomplete="name"
        :maxlength="120"
        @blur="validate('name')"
        :invalid="nameIsInvalid"
        :invalidText="nameErrorMessage"
        ref="name"
      />
      <k-textbox
        v-model="username"
        :label="$tr('adminUsernameFieldLabel')"
        type="username"
        autocomplete="username"
        :maxlength="30"
        @blur="validate('username')"
        :invalid="usernameIsInvalid"
        :invalidText="usernameErrorMessage"
        ref="username"
      />
      <k-textbox
        v-model="password"
        :label="$tr('adminPasswordFieldLabel')"
        type="password"
        autocomplete="new-password"
        @blur="validate('password')"
        :invalid="passwordIsInvalid"
        :invalidText="passwordErrorMessage"
        ref="password"
      />
      <k-textbox
        v-model="passwordConfirm"
        :label="$tr('adminPasswordConfirmationFieldLabel')"
        type="password"
        autocomplete="new-password"
        @blur="validate('passwordConfirm')"
        :invalid="passwordConfirmIsInvalid"
        :invalidText="passwordConfirmErrorMessage"
        ref="passwordConfirm"
      />

  </onboarding-form>

</template>


<script>

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { submitSuperuserCredentials } from '../../../state/actions/forms';
  import onboardingForm from '../onboarding-form';

  export default {
    name: 'superuserCredentialsForm',
    $trs: {
      adminAccountCreationHeader: 'Create your Admin account',
      adminAccountCreationDescription:
        'This account allows you to manage your Facility and content on this device.',
      adminNameFieldLabel: 'Full name',
      adminUsernameFieldLabel: 'Username',
      adminPasswordFieldLabel: 'Password',
      adminPasswordConfirmationFieldLabel: 'Enter password again',
      // error messages
      nameFieldEmptyErrorMessage: 'Full name cannot be empty',
      usernameFieldEmptyErrorMessage: 'Username cannot be empty',
      usernameCharacterErrorMessage: 'Username can only contain letters, numbers, and underscores',
      passwordFieldEmptyErrorMessage: 'Password cannot be empty',
      passwordsMismatchErrorMessage: 'Passwords do not match',
      facilityFieldEmptyErrorMessage: 'Facility cannot be empty',
      setupProgressFeedback: 'Setting up your device...',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      onboardingForm,
      kTextbox,
    },
    data() {
      return {
        name: this.currentName,
        username: this.currentUsername,
        password: this.currentPassword,
        passwordConfirm: this.currentPassword,
        visitedFields: [],
      };
    },
    computed: {
      nameErrorMessage() {
        if (this.name === '') {
          return this.$tr('nameFieldEmptyErrorMessage');
        }
        return '';
      },
      usernameErrorMessage() {
        if (this.username === '') {
          return this.$tr('usernameFieldEmptyErrorMessage');
        }
        if (!/^\w+$/g.test(this.username)) {
          return this.$tr('usernameCharacterErrorMessage');
        }
        return '';
      },
      passwordErrorMessage() {
        if (this.password === '') {
          return this.$tr('passwordFieldEmptyErrorMessage');
        }
        return '';
      },
      passwordConfirmErrorMessage() {
        if (this.passwordConfirm === '') {
          return this.$tr('passwordFieldEmptyErrorMessage');
        }
        if (this.passwordConfirm !== this.password) {
          return this.$tr('passwordsMismatchErrorMessage');
        }
        return '';
      },
      nameIsInvalid() {
        return this.visitedFields.includes('name') && !!this.nameErrorMessage;
      },
      usernameIsInvalid() {
        return this.visitedFields.includes('username') && !!this.usernameErrorMessage;
      },
      passwordIsInvalid() {
        return this.visitedFields.includes('password') && !!this.passwordErrorMessage;
      },
      passwordConfirmIsInvalid() {
        return this.visitedFields.includes('passwordConfirm') && !!this.passwordConfirmErrorMessage;
      },
      formIsValid() {
        return (
          !this.usernameIsInvalid &&
          !this.passwordIsInvalid &&
          !this.passwordConfirmIsInvalid &&
          !this.facilityIsInvalid
        );
      },
    },
    methods: {
      validate(fieldName) {
        this.visitedFields.push(fieldName);
      },
      setSuperuserCredentials() {
        const focusOnInvalidField = () => {
          if (this.nameIsInvalid) {
            this.$refs.name.focus();
          } else if (this.usernameIsInvalid) {
            this.$refs.username.focus();
          } else if (this.passwordIsInvalid) {
            this.$refs.password.focus();
          } else if (this.passwordConfirmIsInvalid) {
            this.$refs.passwordConfirm.focus();
          }
        };

        this.validate('name');
        this.validate('username');
        this.validate('password');
        this.validate('passwordConfirm');

        if (this.formIsValid) {
          this.submitSuperuserCredentials(this.name, this.username, this.password);
          this.$emit('submit');
        } else {
          focusOnInvalidField();
        }
      },
    },
    vuex: {
      actions: {
        submitSuperuserCredentials,
      },
      getters: {
        currentName: state => state.onboardingData.superuser.full_name,
        currentUsername: state => state.onboardingData.superuser.username,
        currentPassword: state => state.onboardingData.superuser.password,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
