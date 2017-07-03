<template>

  <core-base v-if="navBarNeeded" :topLevelPageName="topLevelPageName" :appBarTitle="appBarTitle">
    <component :is="currentPage"/>
  </core-base>
  <component v-else :is="currentPage"/>

</template>


<script>

  import store from '../state/store';
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
        return null;
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
    store,
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>
