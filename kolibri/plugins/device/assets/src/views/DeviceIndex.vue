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

    <KPageContainer :style="containerStyles">
      <router-view />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import omit from 'lodash/omit';
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
      ...mapGetters(['canManageContent', 'isSuperuser']),
      ...mapState(['welcomeModalVisible']),
      ...mapState('coreBase', ['appBarTitle']),
      pageName() {
        return this.$route.name;
      },
      containerStyles() {
        // Need to override overflow rule for setting page
        if (this.$route.name === PageNames.DEVICE_SETTINGS_PAGE) {
          return {
            overflowX: 'inherit',
          };
        }
        return {};
      },
      currentPageAppBarTitle() {
        if (this.pageName === PageNames.USER_PERMISSIONS_PAGE) {
          return this.$tr('permissionsLabel');
        } else {
          return this.appBarTitle || this.$tr('deviceManagementTitle');
        }
      },
      inMultipleImportPage() {
        return this.pageName === 'AVAILABLE_CHANNELS' && this.$route.query.multiple;
      },
      immersivePageRoute() {
        if (this.$route.query.last) {
          return {
            name: this.$route.query.last,
            // TODO need to make query.last more sophisticated
            // to handle longer breadcrumb trails
            query: omit(this.$route.query, ['last']),
          };
        }
        if (this.pageName === PageNames.MANAGE_TASKS) {
          return this.$route.params.lastRoute || { name: PageNames.MANAGE_CONTENT_PAGE };
        }
        if (this.pageName === PageNames.MANAGE_CHANNEL) {
          return { name: PageNames.MANAGE_CONTENT_PAGE };
        }
        // In all Import/Export pages, go back to ManageContentPage
        if (this.inContentManagementPage) {
          // If a user is selecting content, they should return to the content
          // source that they're importing from using the query string.
          if (this.inMultipleImportPage) {
            return { query: omit(this.$route.query, ['multiple']) };
          }
          if (this.pageName === ContentWizardPages.SELECT_CONTENT) {
            return {
              name: ContentWizardPages.AVAILABLE_CHANNELS,
              query: this.$store.state.coreBase.query,
            };
          } else {
            return {
              name: PageNames.MANAGE_CONTENT_PAGE,
            };
          }
        } else if (this.pageName === PageNames.USER_PERMISSIONS_PAGE) {
          // If Admin, goes back to ManagePermissionsPage
          if (this.isSuperuser) {
            return { name: PageNames.MANAGE_PERMISSIONS_PAGE };
          } else {
            // If Non-Admin, go to ManageContentPAge
            return { name: PageNames.MANAGE_CONTENT_PAGE };
          }
        } else {
          return {};
        }
      },
      immersivePagePrimary() {
        if (this.pageName === PageNames.MANAGE_TASKS) {
          return false;
        }
        return this.inContentManagementPage;
      },
      immersivePageIcon() {
        if (
          this.pageName === PageNames.USER_PERMISSIONS_PAGE ||
          this.pageName === ContentWizardPages.SELECT_CONTENT ||
          this.inMultipleImportPage ||
          this.pageName === PageNames.NEW_CHANNEL_VERSION_PAGE
        ) {
          return 'arrow_back';
        }
        return 'close';
      },
      currentPageIsImmersive() {
        if (
          this.pageName == PageNames.MANAGE_CONTENT_PAGE ||
          this.pageName === PageNames.MANAGE_TASKS
        ) {
          return false;
        }
        return (
          this.inContentManagementPage || [PageNames.USER_PERMISSIONS_PAGE].includes(this.pageName)
        );
      },
      inContentManagementPage() {
        return this.$route.path.includes('/content');
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
