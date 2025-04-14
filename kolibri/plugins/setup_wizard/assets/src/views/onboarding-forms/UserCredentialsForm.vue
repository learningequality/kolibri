<template>

  <OnboardingStepBase
    dir="auto"
    :title="header"
    :footerMessageType="footerMessageType"
    :step="step"
    :steps="steps"
    :description="description"
    :noBackAction="noBackAction"
    @continue="handleContinue"
  >
    <slot name="aboveform"></slot>

    <!-- VUE3-COMPAT: linter doesn't like that we are injecting "footer" slot from
         inside a slot default
    -->
    <form>
      <!-- Hiding the fullname and username textboxes, but their values are filled in and presumed
           valid if we're given the user that we're taking credentials for (ie, just entering
           password for admin)
      -->
      <FullNameTextbox
        v-show="!selectedUser"
        ref="fullNameTextbox"
        :value.sync="fullName"
        :isValid.sync="fullNameValid"
        :shouldValidate="formSubmitted"
        :disabled="disabled"
        :autofocus="true"
        autocomplete="name"
      />

      <UsernameTextbox
        v-show="!selectedUser"
        ref="usernameTextbox"
        :value.sync="username"
        :isValid.sync="usernameValid"
        :disabled="disabled"
        :shouldValidate="formSubmitted"
        :errors.sync="caughtErrors"
        :isUniqueValidator="!selectedUser ? uniqueUsernameValidator : () => true"
      />

      <KButton
        v-if="usernameNotUnique"
        :text="$tr('signInInstead')"
        class="link"
        appearance="basic-link"
        @click="handleSignIn"
      />

      <PasswordTextbox
        ref="passwordTextbox"
        :value.sync="password"
        :disabled="disabled"
        :isValid.sync="passwordValid"
        :shouldValidate="formSubmitted"
        :showConfirmationInput="!selectedUser"
        :shouldValidateOnEnter="false"
        autocomplete="new-password"
      />

      <!-- NOTE: Demographic info forms were removed in PR #6053 -->

      <PrivacyLinkAndModal v-if="!hidePrivacyLink" />
    </form>

    <slot name="footer">
      <div class="reminder">
        <div class="icon">
          <KIcon icon="warning" />
        </div>
        <p class="text">
          {{ coreString('rememberThisAccountInformation') }}
        </p>
      </div>
    </slot>
  </OnboardingStepBase>

</template>


<script>

  import every from 'lodash/every';
  import get from 'lodash/get';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import FullNameTextbox from 'kolibri-common/components/userAccounts/FullNameTextbox';
  import UsernameTextbox from 'kolibri-common/components/userAccounts/UsernameTextbox';
  import PasswordTextbox from 'kolibri-common/components/userAccounts/PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri-common/components/userAccounts/PrivacyLinkAndModal';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'UserCredentialsForm',
    components: {
      OnboardingStepBase,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings, commonSyncElements],
    inject: ['wizardService'],
    props: {
      disabled: {
        type: Boolean,
        default: false,
      },
      // Pass this as true if you want to handle the continue on your own from a parent component
      doNotContinue: {
        type: Boolean,
        default: false,
      },
      step: {
        type: Number,
        default: null,
      },
      steps: {
        type: Number,
        default: null,
      },
      footerMessageType: {
        type: String,
        default: null,
      },
      // A passthrough to the onboarding step base to hide "GO BACK" when needed
      noBackAction: {
        type: Boolean,
        default: false,
      },
      uniqueUsernameValidator: {
        type: Function,
        default: null,
      },
      hidePrivacyLink: {
        type: Boolean,
        default: false,
      },
      /** Will use learner-focused labels if false -- the data flow is the same in any case **/
      adminUserLabels: {
        type: Boolean,
        default: true,
      },
      /**
       * The user given which will prefill the data for fullName and username
       */
      selectedUser: {
        type: Object,
        required: false,
        default: null,
      },
      // Pass in errors with .sync modifier
      errors: {
        type: Array,
        required: false,
        default: () => [],
      },
    },
    data() {
      let user;
      if (this.selectedUser) {
        user = this.selectedUser;
      } else {
        user = this.$store.state.onboardingData.user;
      }
      return {
        fullName: user.full_name,
        fullNameValid: false,
        username: user.username,
        usernameValid: false,
        password: '',
        passwordValid: false,
        formSubmitted: false,
        // Property to wrap props.errors and avoid warnings about mutating props
        caughtErrors: [],
      };
    },
    computed: {
      header() {
        return this.adminUserLabels
          ? this.$tr('adminAccountCreationHeader')
          : this.$tr('learnerAccountCreationHeader');
      },
      description() {
        return this.adminUserLabels
          ? this.getCommonSyncString('superAdminPermissionsDescription')
          : this.$tr('learnerAccountCreationDescription', { facility: this.selectedFacilityName });
      },
      selectedFacilityName() {
        return get(this, 'wizardService.state.context.selectedFacility.name', '');
      },
      formIsValid() {
        if (this.selectedUser) {
          return this.passwordValid;
        } else {
          return every([this.usernameValid, this.fullNameValid, this.passwordValid]);
        }
      },
      usernameNotUnique() {
        return this.caughtErrors.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS);
      },
    },
    watch: {
      password(newPass) {
        this.$emit('passwordChanged', newPass);
      },
      selectedUser(user) {
        // user will be null unless an existing user is selected
        if (user) {
          this.fullName = user.full_name;
          this.username = user.username;
        } else {
          // We should clear the form because this is where the user creates a new superuser
          this.fullName = '';
          this.username = '';
        }
        // Always clear the password field on change
        this.$nextTick(() => {
          this.syncOnboardingData();
          this.focusOnInvalidField();
        });
      },
      errors() {
        if (this.errors && this.errors.length) {
          this.focusOnInvalidField();
        }
        this.caughtErrors = this.errors;
      },
      caughtErrors() {
        this.$emit('update:errors', this.caughtErrors);
      },
    },
    mounted() {
      this.syncOnboardingData();
    },
    methods: {
      syncOnboardingData() {
        // Set vuex state w/ the form data
        const payload = {
          password: this.password,
          username: this.username,
          full_name: this.fullName,
        };
        this.$store.commit('SET_USER_CREDENTIALS', payload);
      },
      handleContinue() {
        // Here we will do some final handoff from Vuex to the XState machine
        // We syncOnboardingData (to Vuex)
        // Then we will send the data set in Vuex there into the wizard machine's superuser context
        // value.
        // This will ensure that users' selections persist across page reloads as well.
        this.syncOnboardingData();
        if (!this.formIsValid) {
          this.focusOnInvalidField();
          return;
        } else {
          const payload = {
            password: this.password,
            username: this.username,
            full_name: this.fullName,
          };
          this.$emit('submit', payload);

          if (!this.doNotContinue) {
            this.wizardService.send({
              type: 'CONTINUE',
              value: this.$store.state.onboardingData.user,
            });
          } else {
            // still set the onboarding data for the superuser
            this.wizardService.send({
              type: 'SET_SUPERUSER',
              value: this.$store.state.onboardingData.user,
            });
          }
        }
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
      handleSignIn() {
        this.$emit('signInInstead');
      },
    },
    $trs: {
      adminAccountCreationHeader: {
        message: 'Create super admin',
        context:
          "The title of the 'Create a super admin account' section. A super admin can manage all the content and all other Kolibri users on the device.",
      },
      learnerAccountCreationHeader: {
        message: 'Create your account',
        context: "The title of the 'Create your account' section.",
      },
      learnerAccountCreationDescription: {
        message: "New account for '{facility}' learning facility",
        context:
          'The learner is creating their account for an existing facility and is told what that is',
      },
      signInInstead: {
        message: 'Sign in instead?',
        context: 'Text prompting user to sign in with existing username.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .reminder {
    display: table;
    max-width: 480px;
    padding-top: 1em;

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

  .link {
    padding-bottom: 15px;
  }

</style>
