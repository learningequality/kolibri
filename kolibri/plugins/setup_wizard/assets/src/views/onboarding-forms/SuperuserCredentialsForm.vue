<template>

  <OnboardingForm
    :header="$tr('adminAccountCreationHeader')"
    :description="$tr('adminAccountCreationDescription')"
    :submitText="submitText"
    @submit="submitSuperuserCredentials"
  >
    <FullNameTextbox
      ref="fullNameTextbox"
      :value.sync="name"
      :isValid.sync="nameValid"
      :shouldValidate="formSubmitted"
      :autofocus="true"
      autocomplete="name"
    />

    <UsernameTextbox
      ref="usernameTextbox"
      :value.sync="username"
      :isValid.sync="usernameValid"
      :shouldValidate="formSubmitted"
    />

    <PasswordTextbox
      ref="passwordTextbox"
      :value.sync="password"
      :isValid.sync="passwordValid"
      :shouldValidate="formSubmitted"
      autocomplete="new-password"
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
  import every from 'lodash/every';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'SuperuserCredentialsForm',
    components: {
      OnboardingForm,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      const { superuser } = this.$store.state.onboardingData;
      return {
        name: superuser.full_name,
        nameValid: true,
        username: superuser.username,
        usernameValid: true,
        password: superuser.password,
        passwordValid: true,
        formSubmitted: false,
      };
    },
    computed: {
      formIsValid() {
        return every([this.usernameValid, this.nameValid, this.passwordValid]);
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
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.saveSuperuserCredentials();
          this.$emit('submit');
        } else if (!this.nameValid) {
          this.$refs.fullNameTextbox.focus();
        } else if (!this.usernameValid) {
          this.$refs.usernameTextbox.focus();
        } else if (!this.passwordValid) {
          this.$refs.passwordTextbox.focus();
        }
      },
    },
    $trs: {
      adminAccountCreationHeader: 'Create super admin account',
      adminAccountCreationDescription:
        'This account allows you to manage the facility, content, and user accounts on this device',
      rememberThisAccountInformation:
        'Important: please remember this account information. Write it down if needed',
      // error messages
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
