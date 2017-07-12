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

      <core-textbox
        :label="$tr('name')"
        :aria-label="$tr('name')"
        :maxlength="120"
        v-model="name"
        autocomplete="name"
        :autofocus="true"
        required
        id="name"
        type="text" />

      <core-textbox
        :label="$tr('username')"
        :aria-label="$tr('username')"
        :maxlength="30"
        :invalid="!usernameIsValid"
        :error="usernameIsInvalidError"
        @input="resetSignUpState"
        v-model="username"
        autocomplete="username"
        required
        id="username"
        type="text" />

      <core-textbox
        id="password"
        type="password"
        :aria-label="$tr('password')"
        :label="$tr('password')"
        v-model="password"
        autocomplete="new-password"
        required />

      <core-textbox
        id="confirmed-password"
        type="password"
        :aria-label="$tr('reEnterPassword')"
        :label="$tr('reEnterPassword')"
        :invalid="!passwordsMatch"
        :error="passwordError "
        v-model="confirmed_password"
        autocomplete="new-password"
        required />

      <ui-select
        :name="$tr('selectFacility')"
        :placeholder="$tr('selectFacility')"
        :label="$tr('facility')"
        :options="facilityOptions"
        :invalid="selectFacilityInvalid"
        :error="$tr('selectFacility')"
        :value="selectedFacility"
        @input="updateSelection"
      />

      <icon-button :disabled="busy" id="submit" :primary="true" :text="$tr('finish')" type="submit" />

    </form>

  </div>

</template>


<script>

  import { signUp, resetSignUpState } from '../../state/actions';
  import { PageNames } from '../../constants';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import uiAlert from 'keen-ui/src/UiAlert';
  import coreTextbox from 'kolibri.coreVue.components.textbox';
  import uiToolbar from 'keen-ui/src/UiToolbar';
  import uiCheckbox from 'keen-ui/src/UiCheckbox';
  import logo from 'kolibri.coreVue.components.logo';
  import uiIcon from 'keen-ui/src/UiIcon';
  import uiSelect from 'keen-ui/src/UiSelect';
  export default {
    name: 'Sign-Up-Page',
    $trNameSpace: 'signUpPage',
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
    },
    components: {
      iconButton,
      uiAlert,
      coreTextbox,
      uiToolbar,
      uiCheckbox,
      logo,
      uiIcon,
      uiSelect,
    },
    data: () => ({
      name: '',
      username: '',
      password: '',
      confirmed_password: '',
      checkSelect: false,
      selection: {},
    }),
    computed: {
      signInPage() {
        return { name: PageNames.SIGN_IN };
      },
      passwordsMatch() {
        if (this.password && this.confirmed_password) {
          return this.password === this.confirmed_password;
        }
        return true;
      },
      passwordError() {
        if (this.passwordsMatch) {
          return '';
        }
        return this.$tr('passwordMatchError');
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
      usernameIsValid() {
        return this.usernameIsAlphaNumUnderscore && this.usernameDoesNotExistYet;
      },
      usernameIsInvalidError() {
        if (!this.usernameIsAlphaNumUnderscore) {
          return this.$tr('usernameAlphaNumError');
        } else if (!this.usernameDoesNotExistYet) {
          return this.$tr('usernameAlreadyExistsError');
        }
      },
      allFieldsPopulated() {
        return (
          this.name &&
          this.username &&
          this.password &&
          this.confirmed_password &&
          !this.noFacilitySelected
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
      facilityOptions() {
        return this.facilities.map(facility => ({
          label: facility.name,
          id: facility.id,
        }));
      },
      noFacilitySelected() {
        return !this.selectedFacility.id;
      },
      selectFacilityInvalid() {
        if (!this.checkSelect) {
          return false;
        }
        return this.noFacilitySelected;
      },
      selectedFacility() {
        if (this.facilityOptions.length === 1) {
          return this.facilityOptions[0];
        }
        return this.selection;
      },
    },
    methods: {
      signUp() {
        this.checkSelect = true;
        const canSubmit = this.allFieldsPopulated && this.passwordsMatch && !this.busy;
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

  #submit
    width: 90%
    display: block
    margin-left: auto
    margin-right: auto

    margin-top: $vertical-page-margin
    margin-bottom: $vertical-page-margin

  .app-bar-icon
    font-size: 2.5em
    margin-left: 0.25em

</style>
