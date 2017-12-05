<template>

  <div id="signup-page">

    <ui-toolbar type="colored" textColor="white">
      <template slot="icon">
        <ui-icon class="app-bar-icon"><logo /></ui-icon>
      </template>
      <template slot="brand">
        {{ $tr('kolibri') }}
      </template>
      <div slot="actions">
        <router-link id="signin" :to="signInPage">
          <span>{{ $tr('logIn') }}</span>
        </router-link>
      </div>
    </ui-toolbar>

    <form class="signup-form" ref="form" @submit.prevent="signUp">
      <ui-alert type="error" @dismiss="resetSignUpState" v-if="unknownError">
        {{ errorMessage }}
      </ui-alert>

      <h1 class="signup-title">{{ $tr('createAccount') }}</h1>

      <k-textbox
        ref="name"
        id="name"
        type="text"
        autocomplete="name"
        :label="$tr('name')"
        :maxlength="120"
        :autofocus="true"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        @blur="nameBlurred = true"
        v-model="name"
      />

      <k-textbox
        ref="username"
        id="username"
        type="text"
        autocomplete="username"
        :label="$tr('username')"
        :maxlength="30"
        :invalid="usernameIsInvalid"
        :invalidText="usernameIsInvalidText"
        @blur="usernameBlurred = true"
        @input="resetSignUpState"
        v-model="username"
      />

      <k-textbox
        ref="password"
        id="password"
        type="password"
        autocomplete="new-password"
        :label="$tr('password')"
        :invalid="passwordIsInvalid"
        :invalidText="passwordIsInvalidText"
        @blur="passwordBlurred = true"
        v-model="password"
      />

      <k-textbox
        ref="confirmedPassword"
        id="confirmed-password"
        type="password"
        autocomplete="new-password"
        :label="$tr('reEnterPassword')"
        :invalid="confirmedPasswordIsInvalid"
        :invalidText="confirmedPasswordIsInvalidText"
        @blur="confirmedPasswordBlurred = true"
        v-model="confirmedPassword"
      />

      <k-select
        :label="$tr('facility')"
        v-model="selectedFacility"
        :options="facilityList"
        :invalid="facilityIsInvalid"
        :invalidText="facilityIsInvalidText"
        @blur="facilityBlurred = true"
      />

      <k-button :disabled="busy" :primary="true" :text="$tr('finish')" type="submit" />

    </form>

    <div class="footer">
      <language-switcher-footer />
    </div>
  </div>

</template>


<script>

  import { signUp, resetSignUpState } from '../../state/actions';
  import { PageNames } from '../../constants';
  import { validateUsername } from 'kolibri.utils.validators';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'kolibri.coreVue.components.uiAlert';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import uiToolbar from 'keen-ui/src/UiToolbar';
  import logo from 'kolibri.coreVue.components.logo';
  import uiIcon from 'keen-ui/src/UiIcon';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import languageSwitcherFooter from '../language-switcher-footer';

  export default {
    name: 'signUpPage',
    $trs: {
      createAccount: 'Create an account',
      name: 'Full name',
      username: 'Username',
      password: 'Password',
      reEnterPassword: 'Re-enter password',
      passwordMatchError: 'Passwords do not match',
      genericError: 'Something went wrong during sign up!',
      usernameAlphaNumError: 'Username can only contain letters, numbers, and underscores',
      usernameAlreadyExistsError: 'An account with that username already exists',
      logIn: 'Sign in',
      kolibri: 'Kolibri',
      finish: 'Finish',
      facility: 'Facility',
      required: 'This field is required',
    },
    components: {
      kButton,
      uiAlert,
      kTextbox,
      uiToolbar,
      logo,
      uiIcon,
      kSelect,
      languageSwitcherFooter,
    },
    data: () => ({
      name: '',
      username: '',
      password: '',
      confirmedPassword: '',
      selectedFacility: {},
      nameBlurred: false,
      usernameBlurred: false,
      passwordBlurred: false,
      confirmedPasswordBlurred: false,
      facilityBlurred: false,
      formSubmitted: false,
    }),
    computed: {
      signInPage() {
        return { name: PageNames.SIGN_IN };
      },
      facilityList() {
        return this.facilities.map(facility => ({
          label: facility.name,
          value: facility.id,
        }));
      },
      nameIsInvalidText() {
        if (this.nameBlurred || this.formSubmitted) {
          if (this.name === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return !!this.nameIsInvalidText;
      },
      usernameDoesNotExistYet() {
        if (this.errorCode === 400) {
          return false;
        }
        return true;
      },
      usernameIsInvalidText() {
        if (this.usernameBlurred || this.formSubmitted) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!validateUsername(this.username)) {
            return this.$tr('usernameAlphaNumError');
          }
          if (!this.usernameDoesNotExistYet) {
            return this.$tr('usernameAlreadyExistsError');
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
            return this.$tr('required');
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
            return this.$tr('required');
          }
          if (this.confirmedPassword !== this.password) {
            return this.$tr('passwordMatchError');
          }
        }
        return '';
      },
      confirmedPasswordIsInvalid() {
        return !!this.confirmedPasswordIsInvalidText;
      },
      noFacilitySelected() {
        return !this.selectedFacility.value;
      },
      facilityIsInvalidText() {
        if (this.facilityBlurred || this.formSubmitted) {
          if (this.noFacilitySelected) {
            return this.$tr('required');
          }
        }
        return '';
      },
      facilityIsInvalid() {
        return !!this.facilityIsInvalidText;
      },
      formIsValid() {
        return (
          !this.nameIsInvalid &&
          !this.usernameIsInvalid &&
          !this.passwordIsInvalid &&
          !this.confirmedPasswordIsInvalid &&
          !this.facilityIsInvalid
        );
      },
      unknownError() {
        if (this.errorCode) {
          return this.errorCode !== 400;
        }
        return false;
      },
      errorMessage() {
        return this.backendErrorMessage || this.$tr('genericError');
      },
    },
    beforeMount() {
      if (this.facilityList.length === 1) {
        this.selectedFacility = this.facilityList[0];
      }
    },
    methods: {
      signUp() {
        this.formSubmitted = true;
        const canSubmit = this.formIsValid && !this.busy;
        if (canSubmit) {
          this.signUpAction({
            facility: this.selectedFacility.value,
            full_name: this.name,
            username: this.username,
            password: this.password,
          });
        } else {
          this.focusOnInvalidField();
        }
      },
      focusOnInvalidField() {
        if (this.nameIsInvalid) {
          this.$refs.name.focus();
        } else if (this.usernameIsInvalid) {
          this.$refs.username.focus();
        } else if (this.passwordIsInvalid) {
          this.$refs.password.focus();
        } else if (this.confirmedPasswordIsInvalid) {
          this.$refs.confirmedPassword.focus();
        }
      },
    },
    vuex: {
      getters: {
        session: state => state.core.session,
        errorCode: state => state.pageState.errorCode,
        busy: state => state.pageState.busy,
        backendErrorMessage: state => state.pageState.errorMessage,
        facilities: state => state.core.facilities,
      },
      actions: {
        signUpAction: signUp,
        resetSignUpState: resetSignUpState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'
  $iphone-5-width = 320px
  $vertical-page-margin = 100px
  $logo-size = (1.64 * 1.125)rem
  $logo-margin = (0.38 * $logo-size)rem

  // component, highest level
  #signup-page
    width: 100%
    height: 100%
    overflow-y: auto

  // Action Bar
  #logo
    // 1.63 * font height
    height: $logo-size
    display: inline-block
    margin-left: $logo-margin

  #signin
    margin-right: 1em
    color: white
    text-decoration: none

  // Form
  .signup-title
    text-align: center

  .signup-form
    margin-top: $vertical-page-margin
    margin-left: auto
    margin-right: auto
    width: ($iphone-5-width - 20)px

  .terms
    background-color: $core-bg-light
    color: $core-text-annotation
    height: 6em
    overflow-y: scroll
    padding: 0.5em
    margin-bottom: 1em
    p
      margin-top: 0

  .app-bar-icon
    font-size: 2.5em
    margin-left: 0.25em

  .footer
    margin: 36px
    margin-top: 96px

</style>
