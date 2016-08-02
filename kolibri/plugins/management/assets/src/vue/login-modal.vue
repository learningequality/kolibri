<template>

  <div class="login-modal">
    <modal btntext="Login">
      <div class="title" slot="header">
        <div class="login-brand-box">
          <img src="./kolibri-logo.svg">
          <p id="login-brand">Kolibri</p>
        </div>
      </div>
      <div slot="body">
        <input type="text" class="login-form login-username" v-model="username" placeholder="Username">
        <input type="password" class="login-form login-password" v-model="password" placeholder="Password">
        <button class="login-button" @click="userLogin">Login</button>  
      </div>
      <div slot="footer"></div>
    </modal>
  </div>

</template>


<script>

  const actions = require('../actions');

  module.exports = {
    components: {
      modal: require('./modal.vue'),
    },
    data() {
      return {
        username: '',
        password: '',
      };
    },
    methods: {
      userLogin() {
        console.log('userlogin called');
        const payload = {
          password: this.password,
          username: this.username,
          facility: this.facility,
        };
        this.login(payload);
        console.log('login called');
      },
    },
    vuex: {
      getters: {
        facility: state => state.facility,
      },
      actions: {
        login: actions.login,
      },
    },
	};

</script>


<style lang="stylus" scoped>

  @require '~core-theme.styl'

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
      transition: 0.15s
    
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
    max-height: 29px
    &:focus
      outline: none
      border-bottom: 3px solid $core-action-normal
    
  .login-username
    margin-bottom: 30px
    background: url('./user.svg') no-repeat 10px 10px
    transition: 0.15s
    &:focus
      background: url('./user-active.svg') no-repeat 10px 10px
      transition: 0.15s
      
  .login-password
    background: url('./password.svg') no-repeat 10px 6px
    transition: 0.15s
    &:focus
      background: url('./password-active.svg') no-repeat 10px 6px
      transition: 0.15s

</style>