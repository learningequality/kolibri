<template>

  <OnboardingForm
    :header="$tr('adminAccountCreationHeader')"
    :description="$tr('adminAccountCreationDescription')"
    :submitText="submitText"
    @submit="submitSuperuserCredentials"
  >

    <KTextbox
      ref="name"
      v-model="name"
      :label="coreCommon$tr('fullNameLabel')"
      :autofocus="true"
      autocomplete="name"
      :maxlength="120"
      :invalid="nameIsInvalid"
      :invalidText="nameErrorMessage"
      @blur="visitedFields.name = true"
    />
    <KTextbox
      ref="username"
      v-model="username"
      :label="coreCommon$tr('usernameLabel')"
      type="username"
      autocomplete="username"
      :maxlength="30"
      :invalid="usernameIsInvalid"
      :invalidText="usernameErrorMessage"
      @blur="visitedFields.username = true"
    />
    <KTextbox
      ref="password"
      v-model="password"
      :label="$tr('adminPasswordFieldLabel')"
      type="password"
      autocomplete="new-password"
      :invalid="passwordIsInvalid"
      :invalidText="passwordErrorMessage"
      @blur="visitedFields.password = true"
    />
    <KTextbox
      ref="passwordConfirm"
      v-model="passwordConfirm"
      :label="$tr('adminPasswordConfirmationFieldLabel')"
      type="password"
      autocomplete="new-password"
      :invalid="passwordConfirmIsInvalid"
      :invalidText="passwordConfirmErrorMessage"
      @blur="visitedFields.passwordConfirm = true"
    />
    <div slot="footer" class="reminder">
      <div class="icon">
        <mat-svg category="alert" name="warning" />
      </div>
      <p class="text">
        {{ $tr('rememberThisAccountInformation') }}
      </p>
    </div>
  </OnboardingForm>

</template>


<script>

  import { mapMutations } from 'vuex';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import { validateUsername } from 'kolibri.utils.validators';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'SuperuserCredentialsForm',
    components: {
      OnboardingForm,
      KTextbox,
    },
    mixins: [coreStringsMixin],
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        name: this.$store.state.onboardingData.superuser.full_name,
        username: this.$store.state.onboardingData.superuser.username,
        password: this.$store.state.onboardingData.superuser.password,
        passwordConfirm: this.$store.state.onboardingData.superuser.password,
        visitedFields: {
          name: false,
          username: false,
          password: false,
          passwordConfirm: false,
        },
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
        return !this.usernameIsInvalid && !this.passwordIsInvalid && !this.passwordConfirmIsInvalid;
      },
    },
    beforeDestroy() {
      // saves data if going backwards in wizard
      this.saveSuperuserCredentials();
    },
    methods: {
      ...mapMutations({
        setSuperuser: 'SET_SU',
      }),
      saveSuperuserCredentials() {
        this.setSuperuser({
          name: this.name,
          username: this.username,
          password: this.password,
        });
      },
      submitSuperuserCredentials() {
        for (const field in this.visitedFields) {
          this.visitedFields[field] = true;
        }
        if (this.formIsValid) {
          this.saveSuperuserCredentials();
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
    $trs: {
      adminAccountCreationHeader: 'Create super admin account',
      adminAccountCreationDescription:
        'This account allows you to manage the facility, content, and user accounts on this device',
      adminPasswordFieldLabel: 'Password',
      adminPasswordConfirmationFieldLabel: 'Enter password again',
      rememberThisAccountInformation:
        'Important: please remember this account information. Write it down if needed',
      // error messages
      nameFieldEmptyErrorMessage: 'Full name cannot be empty',
      usernameFieldEmptyErrorMessage: 'Username cannot be empty',
      usernameCharacterErrorMessage: 'Username can only contain letters, numbers, and underscores',
      passwordFieldEmptyErrorMessage: 'Password cannot be empty',
      passwordsMismatchErrorMessage: 'Passwords do not match',
      facilityFieldEmptyErrorMessage: 'Facility cannot be empty',
      setupProgressFeedback: 'Setting up your device...',
    },
  };

</script>


<style lang="scss" scoped>

  .reminder {
    display: table;

    .icon {
      display: table-cell;
      width: 5%;
      min-width: 32px;
    }

    .text {
      display: table-cell;
      width: 90%;
      vertical-align: top;
    }
  }

</style>
