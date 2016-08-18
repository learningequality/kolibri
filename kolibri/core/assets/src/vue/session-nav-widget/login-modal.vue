<template>

  <div>
    <modal>
      <div class="title" :aria-label="$tr('title')" slot="header">
        <div class="login-brand-box">
          <img src="./icons/kolibri-logo.svg" :alt="kolibriLogo">
          <p id="login-brand">{{ $tr('kolibri') }}</p>
        </div>
      </div>
      <div slot="body">
        <div v-if="wrongCreds">
          <h1>{{ $tr('logInError') }}</h1>
          <span aria-live="polite">{{ $tr('validationError') }}<br>{{ $tr('tryAgain') }}</span>
        </div>
        <input type="text" class="login-form login-username" v-model="username_entered" :placeholder="userName" v-on:keydown.enter="userLogin" :aria-label="userName" v-el:usernamefield autofocus>
        <input type="password" class="login-form login-password" v-model="password_entered" :placeholder="password" v-on:keydown.enter="userLogin" :aria-label="password">
        <button class="login-button" @click="userLogin">{{ $tr('logIn') }}</button>
      </div>
      <div slot="footer"></div>
      <div slot="openbtn" @click="clearForm">
        <svg id="person" role="presentation" height="40" width="40" viewbox="0 0 24 24" src="./icons/person.svg"></svg>
        <div class="label">{{ $tr('logIn') }}</div>
      </div>
    </modal>
  </div>

</template>


<script>

  const actions = require('core-actions');

  module.exports = {
    $trNameSpace: 'sessionWidget',
    $trs: {
      title: 'Log in to Kolibri',
      logIn: 'Log In',
      kolibri: 'Kolibri',
      kolibriLogo: 'Kolibri logo',
      logInError: 'Log-in Error',
      validationError: 'Incorrect username or password.',
      tryAgain: 'Please try again!',
      userName: 'Username',
      password: 'Password',
    },
    computed: {
      kolibriLogo() {
        return this.$tr('kolibriLogo');
      },
      userName() {
        return this.$tr('userName');
      },
      password() {
        return this.$tr('password');
      },
    },
    components: {
      modal: require('../modal/index.vue'),
    },
    data: () => ({
      username_entered: '',
      password_entered: '',
    }),
    methods: {
      userLogin() {
        const payload = {
          username: this.username_entered,
          password: this.password_entered,
        };
        this.login(this.Kolibri, payload);
        /* This is to offset race condition issues */
        window.setTimeout(this.retry, 100);
      },
      clearForm() {
        this.$els.usernamefield.focus();
        this.username_entered = '';
        this.password_entered = '';
      },
      /* Puts focus on username field if wrong credentials are given */
      retry() {
        if (this.wrongCreds) {
          this.clearForm();
        }
      },
      /* If admin logs in, sends them to the manage tab */
    },
    vuex: {
      getters: {
        kind: state => state.core.session.kind,
        wrongCreds: state => state.core.session.error === '401',
        modalstate: state => state.core.login_modal_state,
      },
      actions: {
        login: actions.kolibriLogin,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'
  @require '~nav-bar-item.styl'

  h1
    font-size: 1.1em

  #person
    fill: $core-action-normal
    transition: all 0.2s ease
    &:hover
      fill: $core-action-dark

  #test
    background: #000000

  .login-button
    width: 300px
    display: block
    margin: 20px auto
    padding: 8px
    background: $core-action-normal
    color: white
    font-size: 16px
    transition: 0.15s
    &:hover
      background: $core-action-dark
      padding: 8px

  .login-brand-box
    text-align: center
    margin: 15px 5px auto
    img, p
      display: inline-block
    img
      max-width: 100px
      height: auto
      position: relative
      top: 20px
      right: 10px

  #login-brand
    font-size: 50px
    letter-spacing: 0.1em
    font-weight: 100
    color: $core-action-normal
    margin-bottom: 15px

  .login-form
    width: 300px
    margin: 0 auto
    display: block
    padding: 5px 30px
    letter-spacing: 0.08em
    border: none
    border-bottom: 1px solid $core-text-default
    height: 30px
    &:focus
      outline: none
      border-bottom: 3px solid $core-action-normal

  .login-username
    margin: 30px auto
    background: url('./icons/user.svg') no-repeat 8px 6px
    transition: all 0.15s
    &:focus
      background: url('./icons/user-active.svg') no-repeat 8px 6px

  .login-password
    background: url('./icons/password.svg') no-repeat 7px 3px
    transition: all 0.15s
    &:focus
      background: url('./icons/password-active.svg') no-repeat 7px 3px

</style>
