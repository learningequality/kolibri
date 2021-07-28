<template>

  <div>
    <CoreBase
      v-if="coreBaseRoute"
      :showDemoBanner="demoBannerRoute"
      :immersivePage="false"
      :immersivePagePrimary="false"
      :fullScreen="coreBaseRoute"
    >
      <router-view />
    </CoreBase>
    <router-view v-else />
  </div>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ComponentMap } from '../constants';

  export default {
    name: 'UserIndex',
    components: { CoreBase },
    mixins: [commonCoreStrings],
    computed: {
      coreBaseRoute() {
        return [
          ComponentMap.SIGN_IN,
          ComponentMap.FACILITY_SELECT,
          ComponentMap.AUTH_SELECT,
          ComponentMap.SIGN_UP,
          ComponentMap.NEW_PASSWORD,
        ].includes(this.$route.name);
      },
      demoBannerRoute() {
        return [
          ComponentMap.SIGN_IN,
          ComponentMap.FACILITY_SELECT,
          ComponentMap.AUTH_SELECT,
          ComponentMap.NEW_PASSWORD,
        ].includes(this.$route.name);
      },
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
      userProfileTitle: {
        message: 'Profile',
        context:
          'The user profile contains detailed information about the user such as their name or user type.\n\nThis text is visible upon selecting the username in the top right part of the screen once signed in.',
      },
      signUpStep1Title: {
        message: 'Step 1 of 2',
        context: 'Indicates at which stage of the sign up process the user is at.',
      },
      signUpStep2Title: {
        message: 'Step 2 of 2',
        context: 'Indicates at which stage of the sign up process the user is at.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
