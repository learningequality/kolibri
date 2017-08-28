<template>

  <div id="signup-page">

    <ui-toolbar type="colored" textColor="white">
      <template slot="icon">
        <ui-icon class="app-bar-icon"><logo/></ui-icon>
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
        {{errorMessage}}
      </ui-alert>

      <h1 class="signup-title">{{ $tr('createAccount') }}</h1>

      <k-textbox
        id="name"
        type="text"
        autocomplete="name"
        :label="$tr('name')"
        :maxlength="120"
        :autofocus="true"
        :invalid="nameIsInvalid"
        :invalidText="nameIsInvalidText"
        @blur="validateName = true"
        v-model="name"
      />

      <k-textbox
        id="username"
        type="text"
        autocomplete="username"
        :label="$tr('username')"
        :maxlength="30"
        :invalid="usernameIsInvalid"
        :invalidText="usernameIsInvalidText"
        @blur="validateUsername = true"
        @input="resetSignUpState"
        v-model="username"
      />

      <k-textbox
        id="password"
        type="password"
        autocomplete="new-password"
        :label="$tr('password')"
        :invalid="passwordIsInvalid"
        :invalidText="passwordIsInvalidText"
        @blur="validatePassword = true"
        v-model="password"
      />

      <k-textbox
        id="confirmed-password"
        type="password"
        autocomplete="new-password"
        :label="$tr('reEnterPassword')"
        :invalid="confirmedPasswordIsInvalid"
        :invalidText="confirmedPasswordIsInvalidText"
        @blur="validateConfirmedPassword = true"
        v-model="confirmedPassword"
      />

      <ui-select
        :name="$tr('selectFacility')"
        :placeholder="$tr('selectFacility')"
        :label="$tr('facility')"
        :value="selectedFacility"
        :options="facilityList"
        :invalid="facilityIsInvalid"
        :error="facilityIsInvalidText"
        @blur="validateFacility = true"
        @input="updateSelection"
      />

      <k-button :disabled="validateForm && (!formIsValid || busy)" :primary="true" :text="$tr('finish')" type="submit" />

    </form>

  </div>

</template>


<script>

  import { signUp, resetSignUpState } from '../../state/actions';
  import { PageNames } from '../../constants';
  import kButton from 'kolibri.coreVue.components.kButton';
  import uiAlert from 'keen-ui/src/UiAlert';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import uiToolbar from 'keen-ui/src/UiToolbar';
  import logo from 'kolibri.coreVue.components.logo';
  import uiIcon from 'keen-ui/src/UiIcon';
  import uiSelect from 'keen-ui/src/UiSelect';
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
      selectFacility: 'Select a facility',
      required: 'This field is required',
    },
    components: {
      kButton,
      uiAlert,
      kTextbox,
      uiToolbar,
      logo,
      uiIcon,
      uiSelect,
    },
    data: () => ({
      name: '',
      username: '',
      password: '',
      confirmedPassword: '',
      selection: {},
      validateName: false,
      validateUsername: false,
      validatePassword: false,
      validateConfirmedPassword: false,
      validateFacility: false,
      validateForm: false,
    }),
    computed: {
      signInPage() {
        return { name: PageNames.SIGN_IN };
      },
      facilityList() {
        return this.facilities.map(facility => ({
          label: facility.name,
          id: facility.id,
        }));
      },
      selectedFacility() {
        if (this.facilityList.length === 1) {
          return this.facilityList[0];
        }
        return this.selection;
      },
      nameIsInvalidText() {
        if (this.validateName || this.validateForm) {
          if (this.name === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return !!this.nameIsInvalidText;
      },
      usernameIsAlphaNumUnderscore() {
        if (this.username === '') {
          return true;
        }
        return /^\w+$/g.test(this.username);
      },
      usernameDoesNotExistYet() {
        if (this.errorCode === 400) {
          return false;
        }
        return true;
      },
      usernameIsInvalidText() {
        if (this.validateUsername || this.validateForm) {
          if (this.username === '') {
            return this.$tr('required');
          }
          if (!this.usernameIsAlphaNumUnderscore) {
            return this.$tr('usernameAlphaNumError');
          }
          if (!this.usernameDoesNotExistYet) {
            return this.$tr('usernameAlreadyExists');
          }
        }
        return '';
      },
      usernameIsInvalid() {
        return !!this.usernameIsInvalidText;
      },
      passwordIsInvalidText() {
        if (this.validatePassword || this.validateForm) {
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
        if (this.validateConfirmedPassword || this.validateForm) {
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
        return !this.selectedFacility.id;
      },
      facilityIsInvalidText() {
        if (this.validateFacility || this.validateForm) {
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
    methods: {
      signUp() {
        this.validateForm = true;
        const canSubmit = this.formIsValid && !this.busy;
        if (canSubmit) {
          this.signUpAction({
            facility: this.selectedFacility.id,
            full_name: this.name,
            username: this.username,
            password: this.password,
          });
        }
      },
      updateSelection(selection) {
        this.selection = selection;
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

</style>
