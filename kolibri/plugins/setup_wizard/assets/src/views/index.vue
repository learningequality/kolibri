<template>

  <div class="setup">
    <div class="wrapper" role="main">
      <img class="logo" src="./icons/logo-min.png" alt="Kolibri logo">


      <form @submit.prevent="submitSetupForm" class="container">
        <h1>{{ $tr('formHeader') }}</h1>


        <fieldset :disabled="submitted" class="setup-owner">

          <legend class="title">
            {{ $tr('deviceOwnerSectionHeader') }}
          </legend>
          <p class="description">{{ $tr('deviceOwnerDescription') }}</p>

          <k-textbox
            :label="$tr('usernameInputLabel')"
            :maxlength="30"
            :autofocus="true"
            :invalid="usernameIsInvalid"
            :invalidText="usernameIsInvalidText"
            @blur="usernameBlurred = true"
            v-model="username"
          />

          <k-textbox
            type="password"
            :label="$tr('passwordInputLabel')"
            :invalid="passwordIsInvalid"
            :invalidText="passwordIsInvalidText"
            @blur="passwordBlurred = true"
            v-model="password"
          />

          <k-textbox
            type="password"
            :label="$tr('reEnterPasswordInputLabel')"
            :invalid="confirmedPasswordIsInvalid"
            :invalidText="confirmedPasswordIsInvalidText"
            @blur="confirmedPasswordBlurred = true"
            v-model="confirmedPassword"
          />

        </fieldset>
        <fieldset :disabled="submitted" class="setup-facility">

          <legend class="title">
            {{ $tr('facilitySectionHeader') }}
          </legend>
          <p class="description">{{ $tr('facilityDescription') }}</p>

          <k-textbox
            :label="$tr('facilityInputLabel')"
            :maxlength="100"
            :invalid="facilityIsInvalid"
            :invalidText="facilityIsInvalidText"
            @blur="facilityBlurred = true"
            v-model="facility"
          />
        </fieldset>


        <div class="setup-submission">
          <ui-alert
            class="setup-submission-alert"
            type="info"
            :dismissible="false"
            :remove-icon="true"
            v-if="submitted">
            {{ $tr('setupProgressFeedback') }}
          </ui-alert>

          <k-button :disabled="!formIsValid || submitted" :primary="true" :text="$tr('formSubmissionButton')" type="submit"/>
        </div>
      </form>

    </div>
  </div>

</template>


<script>

  import { provisionDevice } from '../state/actions';
  import store from '../state/store';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'keen-ui/src/UiAlert';
  import { facilityPresetChoices } from '../state/constants';
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
      setupProgressFeedback: 'Setting up your device...',
    },
    components: {
      kTextbox,
      kButton,
      uiAlert,
    },
    data() {
      return {
        username: '',
        password: '',
        confirmedPassword: '',
        facility: '',
        preset: facilityPresetChoices[0],
        usernameBlurred: false,
        passwordBlurred: false,
        confirmedPasswordBlurred: false,
        facilityBlurred: false,
        formSubmitted: false,
      };
    },
    computed: {
      usernameValidityCheck() {
        return /^\w+$/g.test(this.username);
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('usernameFieldEmptyErrorMessage');
          }
          if (!this.usernameValidityCheck) {
            return this.$tr('usernameCharacterErrorMessage');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return !!this.usernameIsInvalidText;
      },
      passwordIsInvalidText() {
        if (this.passwordBlurred || this.formSubmitted) {
          if (this.password === '') {
            return this.$tr('passwordFieldEmptyErrorMessage');
          }
        }
        return '';
      },
      passwordIsInvalid() {
        return !!this.passwordIsInvalidText;
      },
      confirmedPasswordIsInvalidText() {
        if (this.confirmedPasswordBlurred || this.formSubmitted) {
          if (this.confirmedPassword === '') {
            return this.$tr('passwordFieldEmptyErrorMessage');
          }
          if (this.confirmedPassword !== this.password) {
            return this.$tr('passwordsMismatchErrorMessage');
          }
        }
        return '';
      },
      confirmedPasswordIsInvalid() {
        return !!this.confirmedPasswordIsInvalidText;
      },
      facilityIsInvalidText() {
        if (this.facilityBlurred || this.formSubmitted) {
          if (this.facility === '') {
            return this.$tr('facilityFieldEmptyErrorMessage');
          }
        }
        return '';
      },
      facilityIsInvalid() {
        return !!this.facilityIsInvalidText;
      },
      formIsValid() {
        return (
          !this.usernameIsInvalid &&
          !this.passwordIsInvalid &&
          !this.confirmedPasswordIsInvalid &&
          !this.facilityIsInvalid
        );
      },
    },
    methods: {
      submitSetupForm() {
        this.formSubmitted = true;

        if (this.formIsValid) {
          const superuser = {
            password: this.password,
            username: this.username,
          };
          const facility = { name: this.facility };
          // TODO (rtibbles - paging DXCanas): Actually set these!
          const languageCode = 'en';
          const preset = 'nonformal';
          this.provisionDevice(superuser, facility, preset, languageCode);
        }
      },
    },
    vuex: {
      actions: {
        provisionDevice,
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
