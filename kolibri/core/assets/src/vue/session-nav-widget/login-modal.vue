<template>

  <div>
    <modal>
      <div id="backdrop"></div>
      <div class="title" slot="header">
        <div class="login-brand-box">
          <img src="./icons/kolibri-logo.svg" alt="Kolibri logo">
          <p id="login-brand">Kolibri</p>
        </div>
      </div>
      <div slot="body">
        <input type="text" class="login-form login-username" v-model="username_entered" placeholder="Username" v-on:keyup.enter="userLogin" aria-label="Username" v-el:usernamefield autofocus>
        <input type="password" class="login-form login-password" v-model="password_entered" placeholder="Password" v-on:keyup.enter="userLogin" aria-label="Password">
        <button class="login-button" @click="userLogin">Login</button>
        <div v-if="wrongCreds">Incorrect username or password.<br>Please try again!</div>
      </div>
      <div slot="footer"></div>
      <div slot="openbtn">
        <svg id="person" role="presentation" height="40" width="40" viewbox="0 0 24 24" src="./icons/person.svg"></svg>
        <div class="label">Log In</div>
      </div>
    </modal>
  </div>

</template>


<script>

  const actions = require('../../core-actions');
  const UserKinds = require('../../constants').UserKinds;

  module.exports = {
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
        this.username_entered = '';
        this.password_entered = '';
        /* This is to offset race condition issues */
        window.setTimeout(this.refocus, 100);
        window.setTimeout(this.redirectAdmin, 500);
      },
      /* Puts focus on username field if wrong credentials are given */
      refocus() {
        if (this.wrongCreds) {
          this.$els.usernamefield.focus();
        }
      },
      /* If admin logs in, sends them to the manage tab */
      redirectAdmin() {
        if (this.kind === UserKinds.SUPERUSER || this.kind === UserKinds.ADMIN) {
          const origin = window.location.origin;
          const manage = '/management';
          window.location.href = origin + manage;
        }
      },
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

  #person
    fill: $core-action-normal
    transition: all 0.2s ease
    &:hover
      fill: $core-action-dark

  #backdrop
    background: green
    width: 100%
    height: 200px

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
    margin: 15px auto
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
    margin-bottom: 30px
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
