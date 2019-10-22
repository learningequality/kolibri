<template>

  <CoreBase
    :appBarTitle="currentPageAppBarTitle"
    :immersivePage="currentPageIsImmersive"
    :immersivePagePrimary="immersivePagePrimary"
    :immersivePageRoute="immersivePageRoute"
    :immersivePageIcon="immersivePageIcon"
    :toolbarTitle="currentPageAppBarTitle"
    :showSubNav="canManageContent && !currentPageIsImmersive"
  >
    <DeviceTopNav slot="sub-nav" />

    <transition name="delay-entry">
      <WelcomeModal
        v-if="welcomeModalVisible"
        @submit="hideWelcomeModal"
      />
    </transition>

    <KPageContainer>
      <router-view />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { ContentWizardPages, PageNames } from '../constants';
  import DeviceTopNav from './DeviceTopNav';
  import WelcomeModal from './WelcomeModal';

  export default {
    name: 'DeviceIndex',
    components: {
      CoreBase,
      WelcomeModal,
      DeviceTopNav,
    },
    computed: {
      ...mapGetters(['canManageContent']),
      ...mapState(['pageName', 'welcomeModalVisible']),
      ...mapState('coreBase', ['appBarTitle']),
      ...mapGetters('coreBase', [
        'currentPageIsImmersive',
        'immersivePageIcon',
        'immersivePageRoute',
        'inContentManagementPage',
      ]),
      currentPageAppBarTitle() {
        if (this.pageName === PageNames.USER_PERMISSIONS_PAGE) {
          return this.$tr('permissionsLabel');
        } else {
          return this.appBarTitle || this.$tr('deviceManagementTitle');
        }
      },
      immersivePagePrimary() {
        // When the icon is an arrow, it should true for Primary with one
        // exception: The SELECT_CONTENT page.
        return (
          this.immersivePageIcon === 'arrow_back' &&
          this.pageName !== ContentWizardPages.SELECT_CONTENT
        );
      },
    },
    watch: {
      inContentManagementPage(val) {
        return val ? this.startTaskPolling() : this.stopTaskPolling();
      },
      currentPageIsImmersive(val) {
        // If going to a non-immersive page, reset the state to show normal Toolbar
        if (!val) {
          this.$store.commit('coreBase/SET_APP_BAR_TITLE', '');
        }
      },
    },
    mounted() {
      this.inContentManagementPage && this.startTaskPolling();
    },
    destroyed() {
      this.stopTaskPolling();
    },
    methods: {
      ...mapActions('manageContent', ['refreshTaskList']),
      hideWelcomeModal() {
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
      startTaskPolling() {
        if (!this.intervalId && this.canManageContent) {
          this.intervalId = setInterval(this.refreshTaskList, 1000);
        }
      },
      stopTaskPolling() {
        if (this.intervalId) {
          this.intervalId = clearInterval(this.intervalId);
        }
      },
    },
    $trs: {
      deviceManagementTitle: 'Device',
      permissionsLabel: 'Permissions',
    },
  };

</script>


<style lang="scss" scoped>

  .delay-entry-enter {
    opacity: 0;
  }

  .delay-entry-enter-active {
    transition: opacity 0.75s;
  }

</style>
