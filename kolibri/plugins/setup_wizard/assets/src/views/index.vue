<template>

  <div class="setup">
    <div class="wrapper" role="main">
      <img class="logo" src="./icons/logo-min.png" alt="Kolibri logo">


      <form @submit.prevent="submitSetupForm" class="container">
        <h1>{{ $tr('formHeader') }}</h1>

        <ui-alert @dismiss="clearGlobalError()" type="error" v-if="globalError">
          {{ globalError }}
        </ui-alert>

        <section class="setup-owner">

          <header>
            <h2 class="title">{{ $tr('deviceOwnerSectionHeader') }}</h2>
            <p class="description">{{ $tr('deviceOwnerDescription') }}</p>
          </header>


          <core-textbox
          @focus="firstUsernameFieldVisit || visitUsername()"
          @blur="validateUsername()"
          :invalid="!!usernameError"
          :error="usernameError"
          v-model="username"
          :required="true"
          :label="$tr('usernameInputLabel')"/>

          <core-textbox
          @focus="firstPasswordFieldsVisit || visitPassword()"
          :invalid="!!passwordError"
          :error="passwordError"
          type="password"
          v-model="password"
          :required="true"
          :label="$tr('passwordInputLabel')"/>

          <core-textbox
          @blur="validatePassword()"
          :invalid="!!passwordError"
          type="password"
          v-model="passwordConfirm"
          :required="true"
          :label="$tr('confirmPasswordInputLabel')"/>

        </section>
        <section class="setup-facility">

          <header>
            <h2 class="title">{{ $tr('facilitySectionHeader') }}</h2>
            <p class="description">{{ $tr('facilityDescription') }}</p>
          </header>

          <core-textbox
          @focus="firstFacilityFieldVisit || visitFacility()"
          @blur="validateFacility"
          :invalid="!!facilityError"
          :error="facilityError"
          v-model="facility"
          :required="true"
          :label="$tr('facilityInputLabel')"/>
        </section>

        <section class="setup-submission">
          <icon-button :text="$tr('formSubmissionButton')" type="submit"/>
        </section>
      </form>

    </div>
  </div>

</template>


<script>

  const actions = require('../state/actions');
  const store = require('../state/store');

  module.exports = {
    $trNameSpace: 'setupWizard',
    $trs: {
      formHeader: 'Create device owner and facility',
      deviceOwnerSectionHeader: 'Device Owner',
      facilitySectionHeader: 'Facility',
      usernameInputLabel: 'Username',
      passwordInputLabel: 'Password',
      confirmPasswordInputLabel: 'Confirm password',
      facilityInputLabel: 'Facility name',
      deviceOwnerDescription: 'To use Kolibri, you first need to create a Device Owner. This account will be used to configure high-level settings for this installation, and create other administrator accounts',
      facilityDescription: 'You also need to create a Facility. This represents your school, training center, or other installation location',
      formSubmissionButton: 'Create and get started',
      usernameFieldEmptyErrorMessage: 'Username cannot be empty',
      usernameCharacterErrorMessage: 'Username cannot contain a "."',
      passwordFieldEmptyErrorMessage: 'Password cannot be empty',
      passwordsMismatchErrorMessage: 'Passwords do not match',
      facilityFieldEmptyErrorMessage: 'Facility cannot be empty',
      cannotSubmitPageError: 'Please resolve all of the errors shown',
      genericPageError: 'Something went wrong',
    },
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
      'core-textbox': require('kolibri.coreVue.components.textbox'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-alert': require('keen-ui/src/UiAlert'),
    },
    computed: {
      firstUsernameFieldVisit() {
        return this.usernameError === null;
      },
      usernameFieldPopulated() {
        return !!this.username;
      },
      usernameValidityCheck() {
        const containsDot = new RegExp(/^[^.]*$/);
        return containsDot.test(this.username);
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
        return this.passwordFieldsPopulated &&
          this.usernameFieldPopulated &&
          this.facilityFieldPopulated;
      },
      canSubmit() {
        return this.passwordFieldsMatch &&
          this.usernameValidityCheck &&
          this.allFieldsPopulated;
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
          const facilityPayload = {
            name: this.facility,
          };
          this.createDeviceOwnerAndFacility(deviceOwnerPayload, facilityPayload);
        } else {
          this.globalError = this.$tr('cannotSubmitPageError');
        }
        // TODO add errors from backend
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
        createDeviceOwnerAndFacility: actions.createDeviceOwnerAndFacility,
      },
    },
    store, // make this and all child components aware of the store
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .setup
    position: absolute
    overflow-y: scroll
    width: 100%
    height: 100%

    &-submission
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
  h2.title
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
