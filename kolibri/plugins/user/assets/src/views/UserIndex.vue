<template>

  <router-view />

</template>


<script>

  import { mapGetters } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ComponentMap } from '../constants';

  export default {
    name: 'UserIndex',
    mixins: [commonCoreStrings],
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
    computed: {
      ...mapGetters(['facilities', 'selectedFacility']),
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
      // TODO: Migrate this logic into components
      immersiveProperties(route) {
        if (route.name === ComponentMap.SIGN_UP) {
          if (!route.query.step) {
            const backRoute =
              this.facilities.length > 1 && !this.selectedFacility
                ? this.$router.getRoute(ComponentMap.AUTH_SELECT)
                : this.$router.getRoute(ComponentMap.SIGN_IN);

            return {
              immersivePage: true,
              immersivePageRoute: backRoute,
              immersivePagePrimary: false,
              immersivePageIcon: 'close',
            };
          }
          return {
            immersivePage: true,
            immersivePageRoute: { query: {} },
            immersivePagePrimary: false,
            immersivePageIcon: 'back',
          };
        }
        if (route.name === ComponentMap.PROFILE_EDIT) {
          return {
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(ComponentMap.PROFILE),
            immersivePagePrimary: true,
            immersivePageIcon: 'back',
          };
        }
        return {
          immersivePage: false,
        };
      },
      isFullscreenPage() {
        return [
          ComponentMap.SIGN_IN,
          ComponentMap.AUTH_SELECT,
          ComponentMap.FACILITY_SELECT,
        ].includes(this.$route.name);
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
