<template>

  <div class="login">
    <div id="login-container">
      <logo class="logo"/>
      <h1 class="login-text title">{{ $tr('kolibri') }}</h1>
      <form id="login-form" ref="form" @submit.prevent="signIn">
        <core-textbox
          :label="$tr('username')"
          id="username"
          type="tel"
          :placeholder="$tr('enterUsername')"
          :aria-label="$tr('username')"
          v-model="username"
          autocomplete="tel"
          required
          autofocus/>
        <core-textbox
          :label="$tr('password')"
          id="password"
          type="password"
          :placeholder="$tr('enterPassword')"
          :aria-label="$tr('password')"
          v-model="password"
          autocomplete="current-password"
          required/>
        <icon-button id="login-btn" :text="$tr('signIn')" :primary="true" type="submit"/>

        <p v-if="loginError" class="sign-in-error">{{ $tr('signInError') }}</p>
      </form>
      <span id="password-reset">{{ $tr('resetPassword') }}</span>
      <div id="divid-line"></div>

      <p class="login-text no-account">{{ $tr('noAccount') }}</p>
      <div id="btn-group">
        <router-link class="group-btn" :to="signUp">
          <icon-button id="signup-button" :text="$tr('createAccount')" :primary="true"/>
        </router-link>
        <a class="group-btn" href="/learn">
          <icon-button id="guest-access-button" :text="$tr('accessAsGuest')" :primary="false"/>
        </a>
      </div>
    </div>
  </div>

</template>


<script>

  const actions = require('kolibri.coreVue.vuex.actions');
  const PageNames = require('../../state/constants').PageNames;

  module.exports = {
    $trNameSpace: 'signInPage',
    $trs: {
      kolibri: 'Kolibri',
      signIn: 'Log in',
      username: 'Username',
      enterUsername: 'Enter username',
      password: 'Password',
      enterPassword: 'Enter password',
      noAccount: `Don't have an account?`,
      createAccount: 'Create account',
      accessAsGuest: 'Access as guest',
      signInError: 'Incorrect username or password',
      resetPassword: 'Reset your password',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
      'logo': require('kolibri.coreVue.components.logo'),
    },
    data: () => ({
      username: '',
      password: '',
    }),
    computed: {
      signUp() {
        return { name: PageNames.SIGN_UP };
      },
    },
    methods: {
      signIn() {
        this.kolibriLogin({
          username: this.username,
          password: this.password,
        });
      },
    },
    vuex: {
      getters: {
        loginError: state => state.core.loginError === 401,
      },
      actions: {
        kolibriLogin: actions.kolibriLogin,
      },
    },
  };

</script>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  $login-text = #D8D8D8

  #login-container
    .ui-
      &textbox__
        &label-text
          color: $login-text
        &input
          border-bottom-color: $login-text
          color: $login-text
          &:autofill
            background-color: transparent
      &button
        background-color: $login-red

        &#guest-access-button
          border: 2px solid $core-action-normal
          background-color: transparent
          color: $login-text

</style>


<style lang="stylus" scoped>

  $login-overlay = #201A21
  $login-text = #D8D8D8

  .login
    overflow-x: hidden
    overflow-y: auto
    height: 100%
    background: $core-bg-canvas
    background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(./background.png) no-repeat center center fixed
    background-color: $login-overlay
    // Fallback for older browers.
    background-size: cover

  #login-container
    display: block
    margin: auto

  .logo
    position: relative
    display: block
    margin: auto
    margin-top: 34px
    min-width: 60px
    max-width: 120px
    width: 30%
    height: auto

  .login-text
    color: $login-text

  .title
    text-align: center
    letter-spacing: 0.1em
    font-weight: 100
    font-size: 1.3em

  #login-form
    margin: auto
    margin-top: 30px
    max-width: 300px
    width: 70%

  #password
    margin-top: 30px

  #login-btn
    display: block
    margin: auto
    margin-top: 38px
    width: 100%

  #btn-group
    display: table
    margin: auto
    margin-top: 28px
    margin-bottom: 20px
    text-align: center

  .group-btn
    display: inline-block
    padding: 5px
    text-decoration: none

  #password-reset
    display: block
    margin: auto
    margin-top: 26px
    color: $login-text
    text-align: center
    text-decoration: underline
    font-size: 0.8em

  #divid-line
    margin: auto
    margin-top: 16px
    width: 412px
    height: 1px
    background-color: $core-text-annotation
    background-color: $login-text

  .no-account
    text-align: center

  .sign-in-error
    color: red

</style>
