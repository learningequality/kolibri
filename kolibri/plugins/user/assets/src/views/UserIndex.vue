<template>

  <CoreBase
    :immersivePage="pageName === PageNames.SIGN_UP"
    immersivePagePrimary
    :immersivePageRoute="{ name: PageNames.SIGN_IN }"
    :appBarTitle="appBarTitle"
    :fullScreen="pageName === PageNames.SIGN_IN"
  >
    <component :is="currentPage" :style="{ marginTop: bannerClosed ? '0px' : '270px' }" />
    <div v-if="!bannerClosed" class="mask"></div>
  </CoreBase>

</template>


<script>

  import { mapState } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { PageNames } from '../constants';
  import SignInPage from './SignInPage';
  import SignUpPage from './SignUpPage';
  import ProfilePage from './ProfilePage';

  const translator = crossComponentTranslator(SignUpPage);

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
    data() {
      return {
        bannerClosed: false,
      };
    },
    mounted() {
      kolibriGlobal.on('demoBannerChanged', data => {
        console.log(data);
        this.bannerClosed = data.bannerClosed;
      });
    },
    computed: {
      ...mapState(['pageName']),
      appBarTitle() {
        if (this.pageName === PageNames.PROFILE) {
          return this.$tr('userProfileTitle');
        } else if (this.pageName === PageNames.SIGN_UP) {
          return translator.$tr('createAccount');
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
    },
  };

</script>


<style lang="scss" scoped>

  .fh {
    transition: margin-top 0.1s linear;
  }
  .mask {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 100;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.4);
  }

</style>
