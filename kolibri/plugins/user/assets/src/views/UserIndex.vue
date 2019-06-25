<template>

  <CoreBase
    :immersivePage="pageName === PageNames.SIGN_UP"
    immersivePagePrimary
    :immersivePageRoute="{ name: PageNames.SIGN_IN }"
    :appBarTitle="appBarTitle"
    :fullScreen="pageName === PageNames.SIGN_IN"
  >
    <component :is="currentPage" />
  </CoreBase>

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
        } else if (this.pageName === PageNames.SIGN_UP) {
          return this.$tr('createAccount');
        }
        return this.$tr('userSignInTitle');
      },
      currentPage() {
        return pageNameComponentMap[this.pageName] || null;
      },
      PageNames() {
        return PageNames;
      },
    },
    $trs: {
      userProfileTitle: 'Profile',
      userSignInTitle: 'Sign in',
      createAccount: 'Create an account',
    },
  };

</script>


<style lang="scss" scoped></style>
