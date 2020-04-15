<template>

  <CoreBase
    v-bind="immersiveProperties"
    :appBarTitle="appBarTitle"
    :fullScreen="isFullscreenPage"
  >
    <component :is="currentPage" />
  </CoreBase>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import AuthSelect from './AuthSelect';
  import FacilitySelect from './FacilitySelect';
  import SignInPage from './SignInPage';
  import SignUpPage from './SignUpPage';
  import ProfilePage from './ProfilePage';
  import ProfileEditPage from './ProfileEditPage';

  const pageNameComponentMap = {
    [PageNames.SIGN_IN]: SignInPage,
    [PageNames.SIGN_UP]: SignUpPage,
    [PageNames.PROFILE]: ProfilePage,
    [PageNames.PROFILE_EDIT]: ProfileEditPage,
    [PageNames.AUTH_SELECT]: AuthSelect,
    [PageNames.FACILITY_SELECT]: FacilitySelect,
  };

  export default {
    name: 'UserIndex',
    components: {
      CoreBase,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapState(['pageName']),
      ...mapGetters(['facilities', 'selectedFacility']),
      immersiveProperties() {
        if (this.pageName === PageNames.SIGN_UP) {
          if (!this.$route.query.step) {
            const backRoute =
              this.facilities.length > 1 && !this.selectedFacility
                ? this.$router.getRoute(PageNames.AUTH_SELECT)
                : this.$router.getRoute(PageNames.SIGN_IN);

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
            immersivePageIcon: 'arrow_back',
          };
        }
        if (this.pageName === PageNames.PROFILE_EDIT) {
          return {
            immersivePage: true,
            immersivePageRoute: this.$router.getRoute(PageNames.PROFILE),
            immersivePagePrimary: true,
            immersivePageIcon: 'arrow_back',
          };
        }
        return {
          immersivePage: false,
        };
      },
      appBarTitle() {
        if (this.pageName === PageNames.PROFILE || this.pageName == PageNames.PROFILE_EDIT) {
          return this.$tr('userProfileTitle');
        }

        if (this.pageName === PageNames.SIGN_UP) {
          if (!this.$route.query.step) {
            return this.$tr('signUpStep1Title');
          }
          return this.$tr('signUpStep2Title');
        }

        return this.coreString('signInLabel');
      },
      currentPage() {
        return pageNameComponentMap[this.pageName] || null;
      },
      isFullscreenPage() {
        return [PageNames.SIGN_IN, PageNames.AUTH_SELECT, PageNames.FACILITY_SELECT].includes(
          this.pageName
        );
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
