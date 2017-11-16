<template>

  <div>
    <!-- v-if applied to component and not core-base because it sets doc title -->
    <core-base
      :navBarNeeded="navBarNeeded"
      :topLevelPageName="topLevelPageName"
      :appBarTitle="appBarTitle"
    >
      <component :is="currentPage" v-if="navBarNeeded" />
    </core-base>
    <div v-if="!navBarNeeded" class="full-page">
      <component :is="currentPage" />
    </div>
  </div>

</template>


<script>

  import { PageNames } from '../constants';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import signInPage from './sign-in-page';
  import signUpPage from './sign-up-page';
  import profilePage from './profile-page';

  export default {
    $trs: { userProfileTitle: 'Profile' },
    name: 'userPlugin',
    components: {
      coreBase,
      signInPage,
      signUpPage,
      profilePage,
    },
    computed: {
      appBarTitle() {
        if (this.pageName === PageNames.PROFILE) {
          return this.$tr('userProfileTitle');
        }
        return '';
      },
      topLevelPageName: () => TopLevelPageNames.USER,
      currentPage() {
        if (this.pageName === PageNames.SIGN_IN) {
          return 'sign-in-page';
        }
        if (this.pageName === PageNames.SIGN_UP) {
          return 'sign-up-page';
        }
        if (this.pageName === PageNames.PROFILE) {
          return 'profile-page';
        }
        return null;
      },
      navBarNeeded() {
        if (this.pageName === PageNames.SIGN_IN) {
          return false;
        }
        if (this.pageName === PageNames.SIGN_UP) {
          return false;
        }
        return true;
      },
    },
    vuex: { getters: { pageName: state => state.pageName } },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .full-page
    position: absolute
    top: 0
    height: 100%
    width: 100%

</style>
