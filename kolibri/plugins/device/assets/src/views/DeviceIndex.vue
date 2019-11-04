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
      ...mapState(['pageName', 'welcomeModalVisible']),
      ...mapState('coreBase', ['appBarTitle']),
      ...mapGetters('coreBase', [
        'currentPageIsImmersive',
        'immersivePageIcon',
        'inContentManagementPage',
      ]),
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
      immersivePageRoute() {
        if (this.$route.query.last) {
          return {
            name: this.$route.query.last,
          };
        }
        // In all Import/Export pages, go back to ManageContentPage
        if (this.inContentManagementPage) {
          // If a user is selecting content, they should return to the content
          // source that they're importing from using the query string.
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
        // When the icon is an arrow, it should true for Primary with one
        // exception: The SELECT_CONTENT page.
        return (
          (this.immersivePageIcon === 'arrow_back' &&
            this.pageName !== ContentWizardPages.SELECT_CONTENT) ||
          this.pageName === PageNames.REARRANGE_CHANNELS ||
          this.pageName === PageNames.DELETE_CHANNELS ||
          this.pageName === PageNames.EXPORT_CHANNELS
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
