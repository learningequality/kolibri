<template>

  <CoreBase
    :appBarTitle="currentPageAppBarTitle"
    :immersivePage="currentPageIsImmersive"
    :immersivePagePrimary="true"
    :immersivePageRoute="exitWizardLink"
    :toolbarTitle="toolbarTitle"
    :showSubNav="canManageContent && !currentPageIsImmersive"
  >
    <DeviceTopNav slot="sub-nav" />

    <transition name="delay-entry">
      <WelcomeModal
        v-if="welcomeModalVisible"
        @closeModal="hideWelcomeModal"
      />
    </transition>

    <div>
      <component :is="currentPage" />
    </div>
  </CoreBase>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { ContentWizardPages, PageNames } from '../constants';
  import DeviceTopNav from './DeviceTopNav';
  import ManageContentPage from './ManageContentPage';
  import ManagePermissionsPage from './ManagePermissionsPage';
  import UserPermissionsPage from './UserPermissionsPage';
  import DeviceInfoPage from './DeviceInfoPage';
  import WelcomeModal from './WelcomeModal';
  import AvailableChannelsPage from './AvailableChannelsPage';
  import SelectContentPage from './SelectContentPage';

  const pageNameComponentMap = {
    [PageNames.MANAGE_CONTENT_PAGE]: ManageContentPage,
    [PageNames.MANAGE_PERMISSIONS_PAGE]: ManagePermissionsPage,
    [PageNames.USER_PERMISSIONS_PAGE]: UserPermissionsPage,
    [PageNames.DEVICE_INFO_PAGE]: DeviceInfoPage,
    [ContentWizardPages.AVAILABLE_CHANNELS]: AvailableChannelsPage,
    [ContentWizardPages.SELECT_CONTENT]: SelectContentPage,
  };

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
      ...mapState('manageContent', ['toolbarTitle']),
      inContentManagementPage() {
        return [
          ContentWizardPages.AVAILABLE_CHANNELS,
          ContentWizardPages.SELECT_CONTENT,
          PageNames.MANAGE_CONTENT_PAGE,
        ].includes(this.pageName);
      },
      DEVICE: () => TopLevelPageNames.DEVICE,
      currentPage() {
        return pageNameComponentMap[this.pageName];
      },
      currentPageIsImmersive() {
        // TODO make user-permissions-page immersive too
        return (
          this.pageName === ContentWizardPages.AVAILABLE_CHANNELS ||
          this.pageName === ContentWizardPages.SELECT_CONTENT
        );
      },
      currentPageAppBarTitle() {
        return this.toolbarTitle || this.$tr('deviceManagementTitle');
      },
      exitWizardLink() {
        return {
          name: PageNames.MANAGE_CONTENT_PAGE,
        };
      },
    },
    watch: {
      inContentManagementPage(val) {
        return val ? this.startTaskPolling() : this.stopTaskPolling();
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
