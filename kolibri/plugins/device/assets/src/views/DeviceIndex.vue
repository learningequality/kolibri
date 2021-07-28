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
    <template #sub-nav>
      <DeviceTopNav />
    </template>

    <transition name="delay-entry">
      <PostSetupModalGroup
        v-if="welcomeModalVisible"
        @cancel="hideWelcomeModal"
      />
    </transition>

    <KPageContainer :style="containerStyles">
      <router-view />
    </KPageContainer>
  </CoreBase>

</template>


<script>

  import { getCurrentInstance } from 'kolibri.lib.vueCompositionApi';
  import { useIntervalFn } from '@vueuse/core';
  import omit from 'lodash/omit';
  import { mapState, mapGetters } from 'vuex';
  import CoreBase from 'kolibri.coreVue.components.CoreBase';
  import { ContentWizardPages, PageNames } from '../constants';
  import DeviceTopNav from './DeviceTopNav';
  import PostSetupModalGroup from './PostSetupModalGroup';

  const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'DeviceIndex',
    components: {
      CoreBase,
      PostSetupModalGroup,
      DeviceTopNav,
    },
    setup() {
      const polling = useIntervalFn(() => {
        $store.dispatch('manageContent/refreshTaskList');
      }, 1000);
      const $store = getCurrentInstance().proxy.$store;
      function startTaskPolling() {
        if ($store.getters.canManageContent) {
          polling.start();
        }
      }
      function stopTaskPolling() {
        polling.stop();
      }

      return {
        stopTaskPolling,
        startTaskPolling,
      };
    },
    computed: {
      ...mapGetters(['canManageContent', 'isSuperuser']),
      ...mapState({ welcomeModalVisibleState: 'welcomeModalVisible' }),
      ...mapState('coreBase', ['appBarTitle']),
      welcomeModalVisible() {
        return this.welcomeModalVisibleState && !window.sessionStorage.getItem(welcomeDimissalKey);
      },
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
          return 'back';
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
      hideWelcomeModal() {
        window.sessionStorage.setItem(welcomeDimissalKey, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
    },
    $trs: {
      deviceManagementTitle: {
        message: 'Device',
        context:
          'The device is the physical or virtual machine that has the Kolibri server installed on it.',
      },
      permissionsLabel: {
        message: 'Permissions',
        context:
          'Indicates the Device > Permissions tab. Permissions refer to what users can manage on the device.',
      },
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
