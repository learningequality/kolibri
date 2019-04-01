<template>

  <CoreBase
    :appBarTitle="currentPageAppBarTitle"
    :immersivePage="currentPageIsImmersive"
    :immersivePagePrimary="true"
    :immersivePageRoute="immersivePageRoute"
    :immersivePageIcon="immersivePageIcon"
    :toolbarTitle="currentPageAppBarTitle"
    :showSubNav="canManageContent && !currentPageIsImmersive"
  >
    <DeviceTopNav slot="sub-nav" />

    <transition name="delay-entry">
      <WelcomeModal
        v-if="welcomeModalVisible"
        @closeModal="hideWelcomeModal"
      />
    </transition>

    <KPageContainer>
      <component :is="currentPage" />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import KPageContainer from 'kolibri.coreVue.components.KPageContainer';
  import { ContentWizardPages, PageNames } from '../constants';
  import DeviceTopNav from './DeviceTopNav';
  import ManageContentPage from './ManageContentPage';
  import ManagePermissionsPage from './ManagePermissionsPage';
  import UserPermissionsPage from './UserPermissionsPage';
  import DeviceInfoPage from './DeviceInfoPage';
  import WelcomeModal from './WelcomeModal';
  import AvailableChannelsPage from './AvailableChannelsPage';
  import SelectContentPage from './SelectContentPage';
  import DeviceSettingsPage from './DeviceSettingsPage';

  const pageNameComponentMap = {
    [PageNames.MANAGE_CONTENT_PAGE]: ManageContentPage,
    [PageNames.MANAGE_PERMISSIONS_PAGE]: ManagePermissionsPage,
    [PageNames.USER_PERMISSIONS_PAGE]: UserPermissionsPage,
    [PageNames.DEVICE_INFO_PAGE]: DeviceInfoPage,
    [ContentWizardPages.AVAILABLE_CHANNELS]: AvailableChannelsPage,
    [ContentWizardPages.SELECT_CONTENT]: SelectContentPage,
    [PageNames.DEVICE_SETTINGS_PAGE]: DeviceSettingsPage,
  };

  export default {
    name: 'DeviceIndex',
    components: {
      CoreBase,
      WelcomeModal,
      DeviceTopNav,
      KPageContainer,
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
      currentPage() {
        return pageNameComponentMap[this.pageName];
      },
      currentPageAppBarTitle() {
        return this.appBarTitle || this.$tr('deviceManagementTitle');
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
      availableChannelsTitle: 'Available Channels',
      deviceManagementTitle: 'Device',
      selectContentTitle: 'Select Content',
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
