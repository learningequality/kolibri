<template>

  <div>
    <!-- v-if applied to component and not core-base because it sets doc title -->
    <CoreBase
      :navBarNeeded="navBarNeeded"
      :appBarTitle="appBarTitle"
    >
      <component :is="currentPage" v-if="navBarNeeded" />
    </CoreBase>
    <div v-if="!navBarNeeded" class="full-page">
      <component :is="currentPage" />
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { PageNames } from '../constants';
  import SignInPage from './SignInPage';
  import SignUpPage from './SignUpPage';
  import ProfilePage from './ProfilePage';

  const pageNameComponentMap = {
    [PageNames.SIGN_IN]: SignInPage,
    [PageNames.SIGN_UP]: SignUpPage,
    [PageNames.PROFILE]: ProfilePage,
  };

  export default {
    name: 'UserIndex',
    components: {
      CoreBase,
    },
    computed: {
      ...mapState(['pageName']),
      appBarTitle() {
        if (this.pageName === PageNames.PROFILE) {
          return this.$tr('userProfileTitle');
        }
        return '';
      },
      currentPage() {
        return pageNameComponentMap[this.pageName] || null;
      },
      navBarNeeded() {
        return this.pageName !== PageNames.SIGN_IN && this.pageName !== PageNames.SIGN_UP;
      },
    },
    $trs: {
      userProfileTitle: 'Profile',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .full-page {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: $core-bg-canvas;
  }

</style>
