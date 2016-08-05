<template>

  <core-base>
    <button id="user-dropdown" v-show="login" @click="showUserDropdown">{{ user_initial }}</button>
    <div id="dropdown" v-show="showDropdown" transition="slide">
      <user-dropdown></user-dropdown>
    </div>
    <login-modal v-show="loggedOut"></login-modal>
    <user-roster></user-roster>
  </core-base>

</template>


<script>

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'user-roster': require('./user-roster.vue'),
      'login-modal': require('./login-modal.vue'),
      'user-dropdown': require('./user-dropdown.vue'),
    },
    data: () => ({
      showDropdown: false,
      user_initial: '',
    }),
    computed: {
      user_initial() {
        return this.name[0].toUpperCase();
      },
      login() {
        return this.loggedIn;
      },
      loggedOut() {
        return !this.login;
      },
    },
    methods: {
      showUserDropdown() {
        if (this.showDropdown) {
          this.showDropdown = false;
        } else {
          this.showDropdown = true;
        }
      },

    },
    vuex: {
      getters: {
        name: state => state.name,
        loggedIn: state => state.loggedIn,
      },
      actions: require('../actions.js'),
    },
  };

</script>


<style lang="stylus" scoped>

  #user-dropdown
    display: block
  
  #dropdown
    position: relative

  .slide-transition
    transition: all 0.25s ease
    left: 0
  
  .slide-enter, .slide-leave
    left: -300px

</style>
