<template>

  <div>
    <CoreBase
      :showDemoBanner="demoBannerRoute"
      :immersivePage="false"
      :immersivePagePrimary="false"
      :fullScreen="true"
    >
      <router-view />
    </CoreBase>
  </div>

</template>


<script>

  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { createTranslator } from 'kolibri.utils.i18n';
  import { ComponentMap } from '../constants';

  const tempTranslator = createTranslator('UserIndex', {
    signUpStep1Title: {
      message: 'Step 1 of 2',
      context: 'Indicates at which stage of the sign up process the user is at.',
    },
    signUpStep2Title: {
      message: 'Step 2 of 2',
      context: 'Indicates at which stage of the sign up process the user is at.',
    },
  });

  export default {
    name: 'UserAuthIndex',
    components: { CoreBase },
    mixins: [commonCoreStrings],
    computed: {
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
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        // remove 'disable' after switching back to `this.$tr`
        if (route.name === ComponentMap.SIGN_UP) {
          if (route.query.step) {
            return tempTranslator.$tr('signUpStep1Title');
          }
          return tempTranslator.$tr('signUpStep2Title');
        }
        /* eslint-enable kolibri/vue-no-undefined-string-uses */

        return this.coreString('signInLabel');
      },
    },
    $trs: {
      // TODO: move strings from tempTranslator back to this.$tr
    },
  };

</script>


<style lang="scss" scoped></style>
