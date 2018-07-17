<template>

  <core-base
    :appBarTitle="currentPageAppBarTitle"
    :immersivePage="currentPageIsImmersive"
    :immersivePagePrimary="true"
    :immersivePageRoute="exitWizardLink"
  >
    <transition name="delay-entry">
      <welcome-modal
        v-if="welcomeModalVisible"
        @closeModal="hideWelcomeModal"
      />
    </transition>

    <div>
      <top-navigation v-if="canManageContent && !currentPageIsImmersive" />
      <component :is="currentPage" />
    </div>
  </core-base>

</template>


<script>

  import { mapState, mapGetters, mapActions } from 'vuex';
  import { TopLevelPageNames } from 'kolibri.coreVue.vuex.constants';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { ContentWizardPages, PageNames } from '../constants';
  import topNavigation from './DeviceTopNav';
  import manageContentPage from './manage-content-page';
  import managePermissionsPage from './ManagePermissionsPage';
  import userPermissionsPage from './UserPermissionsPage';
  import deviceInfoPage from './DeviceInfoPage';
  import welcomeModal from './WelcomeModal';
  import availableChannelsPage from './AvailableChannelsPage';
  import selectContentPage from './select-content-page';

  const pageNameComponentMap = {
    [PageNames.MANAGE_CONTENT_PAGE]: manageContentPage,
    [PageNames.MANAGE_PERMISSIONS_PAGE]: managePermissionsPage,
    [PageNames.USER_PERMISSIONS_PAGE]: userPermissionsPage,
    [PageNames.DEVICE_INFO_PAGE]: deviceInfoPage,
    [ContentWizardPages.AVAILABLE_CHANNELS]: availableChannelsPage,
    [ContentWizardPages.SELECT_CONTENT]: selectContentPage,
  };

  export default {
    name: 'DeviceManagementRoot',
    components: {
      CoreBase,
      welcomeModal,
      topNavigation,
    },
    computed: {
      ...mapGetters(['canManageContent']),
      ...mapState(['pageName', 'welcomeModalVisible']),
      ...mapState({
        toolbarTitle: ({ pageState }) => pageState.toolbarTitle,
        inContentManagementPage: ({ pageName }) => {
          return [
            ContentWizardPages.AVAILABLE_CHANNELS,
            ContentWizardPages.SELECT_CONTENT,
            PageNames.MANAGE_CONTENT_PAGE,
          ].includes(pageName);
        },
      }),
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
      hideWelcomeModal() {
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
      ...mapActions(['refreshTaskList']),
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
