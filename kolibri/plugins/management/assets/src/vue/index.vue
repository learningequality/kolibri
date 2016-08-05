<template>

  <core-base>
    <main-nav slot="nav"></main-nav>
    <div slot="above">
      <button id="user-dropdown" v-show="login" @click="showUserDropdown">{{ user_initial }}</button>
      <div id="dropdown" v-show="showDropdown" transition="slide">
        <user-dropdown></user-dropdown>
      </div>
      <top-nav></top-nav>
      <login-modal></login-modal>
    </div>
    <component slot="content" :is="currentPage"></component>
  </core-base>

</template>


<script>

  const store = require('../state/store');
  const PageNames = require('../state/constants').PageNames;

  module.exports = {
    components: {
      'core-base': require('core-base'),
      'top-nav': require('./top-nav'),
      'main-nav': require('./main-nav'),
      'user-page': require('./user-page'),
      'data-page': require('./data-page'),
      'content-page': require('./content-page'),
      'login-modal': require('./login-modal.vue'),
      'scratchpad-page': require('./scratchpad-page'),
    },
    // data: () => ({
    //   showDropdown: false,
    //   user_initial: '',
    // }),
    // computed: {
    //   user_initial() {
    //     return this.name[0].toUpperCase();
    //   },
    //   login() {
    //     return this.loggedIn;
    //   },
    //   loggedOut() {
    //     return !this.login;
    //   },
    // },
    // methods: {
    //   showUserDropdown() {
    //     if (this.showDropdown) {
    //       this.showDropdown = false;
    //     } else {
    //       this.showDropdown = true;
    //     }
    computed: {
      currentPage() {
        if (this.pageName === PageNames.USER_MGMT_PAGE) {
          return 'user-page';
        }
        if (this.pageName === PageNames.DATA_EXPORT_PAGE) {
          return 'data-page';
        }
        if (this.pageName === PageNames.CONTENT_MGMT_PAGE) {
          return 'content-page';
        }
        if (this.pageName === PageNames.SCRATCHPAD) {
          return 'scratchpad-page';
        }
        return null;
      },

    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
      },
    },
    store, // make this and all child components aware of the store
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
