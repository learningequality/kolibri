<template>

  <div class="setup">
    <div class="wrapper" role="main">
      <img class="logo" src="./icons/logo-min.png" alt="Kolibri logo">


      <form @submit.prevent="submitSetupForm" novalidate class="container">
        <h1>{{ $tr('formHeader') }}</h1>


        <fieldset :disabled="submitted" class="setup-owner">

          <legend class="title">
            {{ $tr('deviceOwnerSectionHeader') }}
          </legend>
          <p class="description">{{ $tr('deviceOwnerDescription') }}</p>

          <core-textbox
            @focus="firstUsernameFieldVisit || visitUsername()"
            @blur="validateUsername()"
            :invalid="!!usernameError"
            :error="usernameError"
            :required="true"
            :label="$tr('usernameInputLabel')"
            :maxlength="30"
            :enforceMaxlength="true"
            v-model="username"
          />

          <core-textbox
            @focus="firstPasswordFieldsVisit || visitPassword()"
            :invalid="!!passwordError"
            :error="passwordError"
            :required="true"
            :label="$tr('passwordInputLabel')"
            type="password"
            v-model="password"
          />

          <core-textbox
            @blur="validatePassword()"
            :invalid="!!passwordError"
            :required="true"
            :label="$tr('reEnterPasswordInputLabel')"
            type="password"
            v-model="passwordConfirm"
          />

        </fieldset>
        <fieldset :disabled="submitted" class="setup-facility">

          <legend class="title">
            {{ $tr('facilitySectionHeader') }}
          </legend>
          <p class="description">{{ $tr('facilityDescription') }}</p>

          <core-textbox
            @focus="firstFacilityFieldVisit || visitFacility()"
            @blur="validateFacility"
            :invalid="!!facilityError"
            :error="facilityError"
            :required="true"
            :label="$tr('facilityInputLabel')"
            :maxlength="100"
            :enforceMaxlength="true"
            v-model="facility"
          />
        </fieldset>


        <div class="setup-submission">
          <ui-alert
            class="setup-submission-alert"
            type="error"
            @dismiss="clearGlobalError()"
            v-if="globalError">
            {{ globalError }}
          </ui-alert>

          <ui-alert
            class="setup-submission-alert"
            type="info"
            :dismissible="false"
            :remove-icon="true"
            v-if="submitted">
            {{ $tr('setupProgressFeedback') }}
          </ui-alert>

          <k-button :disabled="submitted" :primary="true" :text="$tr('formSubmissionButton')" type="submit"/>
        </div>
      </form>

    </div>
  </div>

</template>


<script>

  import { createDeviceOwnerAndFacility } from '../state/actions';
  import store from '../state/store';
  import coreTextbox from 'kolibri.coreVue.components.textbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'keen-ui/src/UiAlert';
  export default {
    name: 'setupWizard',
    $trs: {
      formHeader: 'Create device owner and facility',
      deviceOwnerSectionHeader: 'Device Owner',
      facilitySectionHeader: 'Facility',
      usernameInputLabel: 'Username',
      passwordInputLabel: 'Password',
      reEnterPasswordInputLabel: 'Re-enter password',
      facilityInputLabel: 'Facility name',
      deviceOwnerDescription:
        'To use Kolibri, you first need to create a Device Owner. This account will be used to configure high-level settings for this installation, and create other administrator accounts',
      facilityDescription:
        'You also need to create a Facility. This represents your school, training center, or other installation location',
      formSubmissionButton: 'Create and get started',
      usernameFieldEmptyErrorMessage: 'Username cannot be empty',
      usernameCharacterErrorMessage: 'Username can only contain letters, numbers, and underscores',
      passwordFieldEmptyErrorMessage: 'Password cannot be empty',
      passwordsMismatchErrorMessage: 'Passwords do not match',
      facilityFieldEmptyErrorMessage: 'Facility cannot be empty',
      cannotSubmitPageError: 'Please resolve all of the errors shown',
      genericPageError: 'Something went wrong',
      setupProgressFeedback: 'Setting up your device...',
    },
    name: 'setupWizard',
    data() {
      return {
        username: '',
        usernameError: null,
        password: '',
        passwordConfirm: '',
        passwordError: null,
        facility: '',
        facilityError: null,
        globalError: null,
      };
    },
    components: {
      coreTextbox,
      kButton,
      uiAlert,
    },
    computed: {
      firstUsernameFieldVisit() {
        return this.usernameError === null;
      },
      usernameFieldPopulated() {
        return !!this.username;
      },
      usernameValidityCheck() {
        return /^\w+$/g.test(this.username);
      },
      firstPasswordFieldsVisit() {
        return this.passwordError === null;
      },
      passwordFieldsMatch() {
        return this.password === this.passwordConfirm;
      },
      passwordFieldsPopulated() {
        return !!(this.password && this.passwordConfirm);
      },
      facilityFieldPopulated() {
        return !!this.facility;
      },
      firstFacilityFieldVisit() {
        return this.facilityError === null;
      },
      allFieldsPopulated() {
        return (
          this.passwordFieldsPopulated && this.usernameFieldPopulated && this.facilityFieldPopulated
        );
      },
      canSubmit() {
        return (
          !this.submitted &&
          this.passwordFieldsMatch &&
          this.usernameValidityCheck &&
          this.allFieldsPopulated
        );
      },
    },
    methods: {
      submitSetupForm() {
        this.globalError = '';

        if (this.canSubmit) {
          const deviceOwnerPayload = {
            password: this.password,
            username: this.username,
          };
          const facilityPayload = { name: this.facility };
          this.createDeviceOwnerAndFacility(deviceOwnerPayload, facilityPayload);
        } else {
          if (this.firstUsernameFieldVisit) {
            this.visitUsername();
            this.validateUsername();
          }

          if (this.firstPasswordFieldsVisit) {
            this.visitPassword();
            this.validatePassword();
          }

          if (this.firstFacilityFieldVisit) {
            this.visitFacility();
            this.validateFacility();
          }

          this.globalError = this.$tr('cannotSubmitPageError');
        }
      },
      clearGlobalError() {
        this.globalError = '';
      },
      visitUsername() {
        this.usernameError = '';
      },
      visitPassword() {
        this.passwordError = '';
      },
      visitFacility() {
        this.facilityError = '';
      },
      validateUsername() {
        if (!this.usernameFieldPopulated) {
          this.usernameError = this.$tr('usernameFieldEmptyErrorMessage');
        } else if (!this.usernameValidityCheck) {
          this.usernameError = this.$tr('usernameCharacterErrorMessage');
        }
      },
      validatePassword() {
        if (!this.passwordFieldsMatch) {
          this.passwordError = this.$tr('passwordsMismatchErrorMessage');
        } else if (!this.passwordFieldsPopulated) {
          this.passwordError = this.$tr('passwordFieldEmptyErrorMessage');
        }
      },
      validateFacility() {
        if (!this.facilityFieldPopulated) {
          this.facilityError = this.$tr('facilityFieldEmptyErrorMessage');
        }
      },
    },
    vuex: {
      actions: {
        createDeviceOwnerAndFacility,
      },
      getters: {
        submitted: state => state.pageState.submitted,
      },
    },
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .setup
    position: absolute
    overflow-y: scroll
    width: 100%
    height: 100%

    &-owner, &-facility
      // fighting pureCSS
      border: none
      margin: 0
      padding: 0

    &-submission
      margin-top: 16px
      text-align: center

  .wrapper
    position: absolute
    max-height: 100%
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
  .container
    background: #fff
    width: 100%
    max-width: 430px
    min-width: 320px
    border-radius: $radius
    margin: 0 auto
    padding: 20px 30px
  h1
    font-size: 18px
  .title
    font-size: 14px
    font-weight: bold
  .description
    font-size: 12px
    color: $core-text-annotation
  .logo
    height: 40%
    width: 40%
    max-height: 160px
    min-height: 100px
    max-width: 160px
    min-width: 100px
    display: block
    margin-left: auto
    margin-right: auto

</style>
