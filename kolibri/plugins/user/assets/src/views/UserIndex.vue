<template>

  <router-view />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ComponentMap } from '../constants';

  export default {
    name: 'UserIndex',
    mixins: [commonCoreStrings],
    computed: {
      redirect: {
        get() {
          return this.$store.state.signIn.redirect;
        },
        set(redirect) {
          this.$store.commit('SET_REDIRECT', redirect);
        },
      },
    },
    watch: {
      // TODO 0.15.x: Redefine the strings in this file wherever they're used
      // This is structured this way because UserIndex used to dynamically
      // fill CoreBase props based on which page we were viewing - including
      // the appBarTitle - we just can't move the strings since we've frozen
      // For now, watch the route - whenever it changes, set the appBarTitle in vuex
      // so other components have access to it and it changes as we navigate
      $route(newVal) {
        this.$store.commit('SET_APPBAR_TITLE', this.appBarTitle(newVal));
      },
    },
    created() {
      // Check for redirect param and store it in vuex
      // otherwise it'll be lost when the route changes.
      if (this.$route.query.redirect) {
        this.redirect = this.$route.query.redirect;
      }
    },
    methods: {
      appBarTitle(route) {
        if (route.name === ComponentMap.PROFILE || route.name == ComponentMap.PROFILE_EDIT) {
          return this.$tr('userProfileTitle');
        }

        if (route.name === ComponentMap.SIGN_UP) {
          if (route.query.step) {
            return this.$tr('signUpStep1Title');
          }
          return this.$tr('signUpStep2Title');
        }

        return this.coreString('signInLabel');
      },
    },
    $trs: {
      userProfileTitle: 'Profile',
      signUpStep1Title: 'Step 1 of 2',
      signUpStep2Title: 'Step 2 of 2',
    },
  };

</script>


<style lang="scss" scoped></style>
