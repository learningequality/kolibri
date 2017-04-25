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
        <router-link id="login" :to="signInPage">
          <span>{{ $tr('logIn') }}</span>
        </router-link>
      </div>
    </ui-toolbar>

    <form class="signup-form" ref="form" @submit.prevent="signUp">
      <ui-alert type="error" @dismiss="resetSignUpState" v-if="errorCode">
        {{errorMessage}}
      </ui-alert>

      <h1 class="signup-title">{{ $tr('createAccount') }}</h1>

      <core-textbox
        :placeholder="$tr('enterName')"
        :label="$tr('name')"
        :aria-label="$tr('name')"
        v-model="name"
        autocomplete="name"
        autofocus
        required
        id="name"
        type="text" />

      <core-textbox
        :placeholder="$tr('enterUsername')"
        :label="$tr('username')"
        :aria-label="$tr('username')"
        :invalid="usernameError"
        v-model="username"
        autocomplete="username"
        required
        id="username"
        type="text" />

      <core-textbox
        id="password"
        type="password"
        :placeholder="$tr('enterPassword')"
        :aria-label="$tr('password')"
        :label="$tr('password')"
        v-model="password"
        autocomplete="new-password"
        required />

      <core-textbox
        id="confirmed-password"
        type="password"
        :placeholder="$tr('confirmPassword')"
        :aria-label="$tr('confirmPassword')"
        :label="$tr('confirmPassword')"
        :invalid="!passwordsMatch"
        :error="passwordError "
        v-model="confirmed_password"
        autocomplete="new-password"
        required />

      <icon-button :disabled="canSubmit" id="submit" :primary="true" :text="$tr('finish')" type="submit" />

    </form>

  </div>

</template>


<script>

  const actions = require('../../state/actions');
  const PageNames = require('../../constants').PageNames;

  module.exports = {
    name: 'Sign-Up-Page',
    $trNameSpace: 'signUpPage',
    $trs: {
      createAccount: 'Create an account',
      name: 'Full name',
      enterName: 'Enter full name',
      username: 'Username',
      enterUsername: 'Enter username',
      password: 'Password',
      enterPassword: 'Enter password',
      confirmPassword: 'Confirm password',
      passwordMatchError: 'Passwords do not match',
      genericError: 'Something went wrong during sign up!',
      logIn: 'Log in',
      kolibri: 'Kolibri',
      finish: 'Finish',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'ui-alert': require('keen-ui/src/UiAlert'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
      'ui-toolbar': require('keen-ui/src/UiToolbar'),
      'ui-checkbox': require('keen-ui/src/UiCheckbox'),
      'logo': require('kolibri.coreVue.components.logo'),
      'ui-icon': require('keen-ui/src/UiIcon'),
    },
    data: () => ({
      name: '',
      username: '',
      password: '',
      confirmed_password: '',
      termsAgreement: false,
    }),
    computed: {
      signInPage() {
        return { name: PageNames.SIGN_IN };
      },
      passwordsMatch() {
        // make sure both fields are populated
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
      usernameError() {
        return this.errorCode === 400;
      },
      allFieldsPopulated() {
        return !(this.name && this.username && this.password && this.confirmed_password);
      },
      canSubmit() {
        return !this.termsAgreement || this.allFieldsPopulated || !this.passwordsMatch || this.busy;
      },
      errorMessage() {
        return this.backendErrorMessage || this.$tr('genericError');
      },
    },
    methods: {
      signUp() {
        this.signUpAction({
          full_name: this.name,
          username: this.username,
          password: this.password,
        });
      },
    },
    vuex: {
      getters: {
        session: state => state.core.session,
        errorCode: state => state.pageState.errorCode,
        busy: state => state.pageState.busy,
        backendErrorMessage: state => state.pageState.errorMessage,
      },
      actions: {
        signUpAction: actions.signUp,
        resetSignUpState: actions.resetSignUpState,
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

  #login
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
