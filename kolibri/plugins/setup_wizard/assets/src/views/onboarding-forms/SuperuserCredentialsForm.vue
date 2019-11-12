<template>

  <OnboardingForm
    class="credentials-form"
    :header="$tr('adminAccountCreationHeader')"
    :description="$tr('adminAccountCreationDescription')"
    :submitText="submitText"
    @submit="submitForm"
  >
    <FullNameTextbox
      ref="fullNameTextbox"
      :value.sync="fullName"
      :isValid.sync="fullNameValid"
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

    <GenderSelect
      :value.sync="gender"
      class="select"
    />

    <BirthYearSelect
      :value.sync="birthYear"
      class="select"
    />

    <PrivacyLinkAndModal />

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
  import BirthYearSelect from 'kolibri.coreVue.components.BirthYearSelect';
  import GenderSelect from 'kolibri.coreVue.components.GenderSelect';
  import PrivacyLinkAndModal from 'kolibri.coreVue.components.PrivacyLinkAndModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { DemographicConstants } from 'kolibri.coreVue.vuex.constants';
  import OnboardingForm from './OnboardingForm';

  const { DEFERRED } = DemographicConstants;

  export default {
    name: 'SuperuserCredentialsForm',
    components: {
      OnboardingForm,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      BirthYearSelect,
      GenderSelect,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings],
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      const { superuser } = this.$store.state.onboardingData;
      return {
        fullName: superuser.full_name,
        fullNameValid: false,
        username: superuser.username,
        usernameValid: false,
        password: superuser.password,
        passwordValid: false,
        birthYear: superuser.birth_year,
        gender: superuser.gender,
        formSubmitted: false,
      };
    },
    computed: {
      formIsValid() {
        return every([this.usernameValid, this.fullNameValid, this.passwordValid]);
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
          full_name: this.fullName,
          username: this.username,
          password: this.password,
          birth_year: this.birthYear || DEFERRED,
          gender: this.gender || DEFERRED,
        });
      },
      submitForm() {
        this.formSubmitted = true;
        // Have to wait a tick to let inputs react to this.formSubmitted
        this.$nextTick().then(() => {
          if (this.formIsValid) {
            this.saveSuperuserCredentials();
            this.$emit('submit');
          } else {
            this.focusOnInvalidField();
          }
        });
      },
      focusOnInvalidField() {
        this.$nextTick().then(() => {
          if (!this.fullNameValid) {
            this.$refs.fullNameTextbox.focus();
          } else if (!this.usernameValid) {
            this.$refs.usernameTextbox.focus();
          } else if (!this.passwordValid) {
            this.$refs.passwordTextbox.focus();
          }
        });
      },
    },
    $trs: {
      adminAccountCreationHeader: 'Create super admin account',
      adminAccountCreationDescription:
        'This account allows you to manage the facility, content, and user accounts on this device',
      rememberThisAccountInformation:
        'Important: please remember this account information. Write it down if needed',
    },
  };

</script>


<style lang="scss" scoped>

  // Need to make this form narrower to fit Keen-UI components
  .credentials-form {
    width: 400px !important;
  }

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

  .select {
    margin: 18px 0 36px;
  }

</style>
