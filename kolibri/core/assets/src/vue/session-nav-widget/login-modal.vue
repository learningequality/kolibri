<template>

  <div>
    <modal>
      <div id="backdrop"></div>
      <div class="title" slot="header">
        <div class="login-brand-box">
          <img src="./icons/kolibri-logo.svg">
          <p id="login-brand">Kolibri</p>
        </div>
      </div>
      <div slot="body">
        <input type="text" class="login-form login-username" v-model="username_entered" placeholder="Username" v-on:keyup.enter="userLogin" autofocus>
        <input type="password" class="login-form login-password" v-model="password_entered" placeholder="Password" v-on:keyup.enter="userLogin">
        <button class="login-button" @click="userLogin">Login</button>  
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

  const actions = require('../../actions');

  module.exports = {
    components: {
      modal: require('../modal/index.vue'),
    },
    data() {
      return {
        username_entered: '',
        password_entered: '',
      };
    },
    methods: {
      userLogin() {
        const store = {
          username: this.username_entered,
          password: this.password_entered,
        };
        this.login(store);
      },
    },
    vuex: {
      getters: {
        loginIcon: state => state.core.loginModalOpen,
        userKind: state => state.core.session.kind,
      },
      actions: {
        login: actions.logIn,
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
