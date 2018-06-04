<template>

  <onboarding-form
    :header="$tr('adminAccountCreationHeader')"
    :description="$tr('adminAccountCreationDescription')"
    :submitText="submitText"
    @submit="setSuperuserCredentials"
  >

    <k-textbox
      v-model="name"
      :label="$tr('adminNameFieldLabel')"
      :autofocus="true"
      autocomplete="name"
      :maxlength="120"
      @blur="visitedFields.name = true"
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
      @blur="visitedFields.username = true"
      :invalid="usernameIsInvalid"
      :invalidText="usernameErrorMessage"
      ref="username"
    />
    <k-textbox
      v-model="password"
      :label="$tr('adminPasswordFieldLabel')"
      type="password"
      autocomplete="new-password"
      @blur="visitedFields.password = true"
      :invalid="passwordIsInvalid"
      :invalidText="passwordErrorMessage"
      ref="password"
    />
    <k-textbox
      v-model="passwordConfirm"
      :label="$tr('adminPasswordConfirmationFieldLabel')"
      type="password"
      autocomplete="new-password"
      @blur="visitedFields.passwordConfirm = true"
      :invalid="passwordConfirmIsInvalid"
      :invalidText="passwordConfirmErrorMessage"
      ref="passwordConfirm"
    />

  </onboarding-form>

</template>


<script>

  import { mapState, mapActions } from 'kolibri.utils.vuexCompat';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { validateUsername } from 'kolibri.utils.validators';
  import { submitSuperuserCredentials } from '../../../state/actions/forms';
  import onboardingForm from '../onboarding-form';

  function currentName(state) {
    return state.onboardingData.superuser.full_name;
  }

  function currentUsername(state) {
    return state.onboardingData.superuser.username;
  }

  function currentPassword(state) {
    return state.onboardingData.superuser.password;
  }

  export default {
    name: 'superuserCredentialsForm',
    components: {
      onboardingForm,
      kTextbox,
    },
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
    data() {
      return {
        name: currentName(this.$store.state),
        username: currentUsername(this.$store.state),
        password: currentPassword(this.$store.state),
        passwordConfirm: this.currentPassword,
        visitedFields: {
          name: false,
          username: false,
          password: false,
          passwordConfirm: false,
        },
      };
    },
    computed: {
      ...mapState({
        currentName,
        currentUsername,
        currentPassword,
      }),
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
        if (!validateUsername(this.username)) {
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
        return this.visitedFields.name && Boolean(this.nameErrorMessage);
      },
      usernameIsInvalid() {
        return this.visitedFields.username && Boolean(this.usernameErrorMessage);
      },
      passwordIsInvalid() {
        return this.visitedFields.password && Boolean(this.passwordErrorMessage);
      },
      passwordConfirmIsInvalid() {
        return this.visitedFields.passwordConfirm && Boolean(this.passwordConfirmErrorMessage);
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
      ...mapActions({
        submitSuperuserCredentials,
      }),
      setSuperuserCredentials() {
        for (const field in this.visitedFields) {
          this.visitedFields[field] = true;
        }

        if (this.formIsValid) {
          this.submitSuperuserCredentials(this.name, this.username, this.password);
          this.$emit('submit');
        } else if (this.nameIsInvalid) {
          this.$refs.name.focus();
        } else if (this.usernameIsInvalid) {
          this.$refs.username.focus();
        } else if (this.passwordIsInvalid) {
          this.$refs.password.focus();
        } else if (this.passwordConfirmIsInvalid) {
          this.$refs.passwordConfirm.focus();
        }
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
