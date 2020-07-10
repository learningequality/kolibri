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
      $route(newRoute) {},
    },
    computed: {
      ...mapGetters(['facilities', 'selectedFacility']),
    },
    methods: {
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
      appBarTitle() {
        if (
          this.$route.name === ComponentMap.PROFILE ||
          this.$route.name == ComponentMap.PROFILE_EDIT
        ) {
          return this.$tr('userProfileTitle');
        }

        if (this.$route.name === ComponentMap.SIGN_UP) {
          if (!this.$route.query.step) {
            return this.$tr('signUpStep1Title');
          }
          return this.$tr('signUpStep2Title');
        }

        return this.coreString('signInLabel');
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
