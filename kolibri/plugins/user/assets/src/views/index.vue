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

  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import coreBase from 'kolibri.coreVue.components.coreBase';
  import { PageNames } from '../constants';
  import signInPage from './sign-in-page';
  import signUpPage from './sign-up-page';
  import profilePage from './profile-page';

  const pageNameComponentMap = {
    [PageNames.SIGN_IN]: signInPage,
    [PageNames.SIGN_UP]: signUpPage,
    [PageNames.PROFILE]: profilePage,
  };

  export default {
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
        return pageNameComponentMap[this.pageName] || null;
      },
      navBarNeeded() {
        return this.pageName !== PageNames.SIGN_IN && this.pageName !== PageNames.SIGN_UP;
      },
    },
    vuex: {
      getters: {
        pageName: state => state.pageName,
      },
    },
    $trs: {
      userProfileTitle: 'Profile',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .full-page
    position: absolute
    top: 0
    height: 100%
    width: 100%
    background-color: $core-bg-canvas

</style>
