<template>

  <OnboardingForm
    :header="$attrs.header || $tr('adminAccountCreationHeader')"
    :description="$attrs.description || $tr('adminAccountCreationDescription')"
    :submitText="submitText"
    @submit="handleSubmit"
  >
    <slot name="aboveform"></slot>

    <!-- HACK in Import mode, this slot will be replaced by Password-only form -->
    <slot name="form">
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
        :isUniqueValidator="uniqueUsernameValidator"
      />

      <PasswordTextbox
        ref="passwordTextbox"
        :value.sync="password"
        :isValid.sync="passwordValid"
        :shouldValidate="formSubmitted"
        autocomplete="new-password"
      />

      <!-- NOTE: Demographic info forms were removed in PR #6053 -->

      <PrivacyLinkAndModal v-if="!hidePrivacyLink" />

      <div slot="footer" class="reminder">
        <div class="icon">
          <mat-svg category="alert" name="warning" />
        </div>
        <p class="text">
          {{ $tr('rememberThisAccountInformation') }}
        </p>
      </div>
    </slot>
  </OnboardingForm>

</template>


<script>

  import every from 'lodash/every';
  import FullNameTextbox from 'kolibri.coreVue.components.FullNameTextbox';
  import UsernameTextbox from 'kolibri.coreVue.components.UsernameTextbox';
  import PasswordTextbox from 'kolibri.coreVue.components.PasswordTextbox';
  import PrivacyLinkAndModal from 'kolibri.coreVue.components.PrivacyLinkAndModal';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'SuperuserCredentialsForm',
    components: {
      OnboardingForm,
      FullNameTextbox,
      UsernameTextbox,
      PasswordTextbox,
      PrivacyLinkAndModal,
    },
    mixins: [commonCoreStrings],
    props: {
      isFinalStep: {
        type: Boolean,
        default: false,
      },
      uniqueUsernameValidator: {
        type: Function,
        required: false,
      },
      hidePrivacyLink: {
        type: Boolean,
        default: false,
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
        formSubmitted: false,
      };
    },
    computed: {
      formIsValid() {
        return every([this.usernameValid, this.fullNameValid, this.passwordValid]);
      },
      submitText() {
        return this.isFinalStep
          ? this.coreString('finishAction')
          : this.coreString('continueAction');
      },
    },
    methods: {
      handleSubmit() {
        if (!this.$refs.fullNameTextbox) {
          return this.$emit('click_next');
        }
        this.formSubmitted = true;
        // Have to wait a tick to let inputs react to this.formSubmitted
        this.$nextTick().then(() => {
          if (this.formIsValid) {
            this.$store.commit('SET_SUPERUSER_CREDENTIALS', {
              full_name: this.fullName,
              username: this.username,
              password: this.password,
            });
            this.$emit('click_next', {
              full_name: this.fullName,
              username: this.username,
              password: this.password,
            });
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
        'This account allows you to manage the facility, resources, and user accounts on this device',
      rememberThisAccountInformation:
        'Important: please remember this account information. Write it down if needed',
    },
  };

</script>


<style lang="scss" scoped>

  .reminder {
    display: table;
    max-width: 480px;

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
