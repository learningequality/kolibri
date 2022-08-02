<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
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

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import { PageNames } from '../constants';
  import PostSetupModalGroup from './PostSetupModalGroup';
  import plugin_data from 'plugin_data';

  const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'DeviceIndex',
    components: {
      NotificationsRoot,
      PostSetupModalGroup,
    },
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState({ welcomeModalVisibleState: 'welcomeModalVisible' }),
      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (
          (plugin_data.allowGuestAccess && this.$store.getters.allowAccess) || this.isUserLoggedIn
        );
      },
      welcomeModalVisible() {
        return (
          this.welcomeModalVisibleState &&
          window.sessionStorage.getItem(welcomeDimissalKey) !== 'true'
        );
      },
      pageName() {
        return this.$route.name;
      },
      currentPageIsImmersive() {
        if (this.pageName == PageNames.MANAGE_CONTENT_PAGE) {
          return false;
        }
        return (
          this.inContentManagementPage || [PageNames.USER_PERMISSIONS_PAGE].includes(this.pageName)
        );
      },
      inContentManagementPage() {
        return this.$route.path.includes('/content');
      },
      // numberOfNavigationTabsToDisplay() {
      //   let navItems = document.getElementsByClassName('list-item-navigation');
      //   console.log(navItems);
      //   navItems = [].slice.call(navItems);
      //   let index = 0;
      //   let viewportWidthTakenUp = 0;
      //   let numberOfItemsToDisplayAsTabs;
      //   if (navItems && navItems.length > 0) {
      //     while (index < navItems.length) {
      //       viewportWidthTakenUp = viewportWidthTakenUp + navItems[index].offsetWidth;
      //       console.log(viewportWidthTakenUp);
      //       if (viewportWidthTakenUp < this.width - 40) {
      //         navItems[index].classList.add('visible');
      //         numberOfItemsToDisplayAsTabs = index;
      //       } else {
      //         navItems[index].classList.remove('visible');
      //       }
      //       index = index + 1;
      //     }
      //     console.log('numberOfItemsToDisplayAsTabs', numberOfItemsToDisplayAsTabs);
      //   }
      //   return numberOfItemsToDisplayAsTabs;
      // },
    },
    watch: {
      currentPageIsImmersive(val) {
        // If going to a non-immersive page, reset the state to show normal Toolbar
        if (!val) {
          this.$store.commit('coreBase/SET_APP_BAR_TITLE', '');
        }
      },
    },
    methods: {
      hideWelcomeModal() {
        window.sessionStorage.setItem(welcomeDimissalKey, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
      // numberOfNavigationTabsToDisplay() {
      //   let navItems = document.getElementsByClassName('list-item-navigation');
      //   navItems = [].slice.call(navItems);
      //   let index = 0;
      //   let viewportWidthTakenUp = 0;
      //   let numberOfItemsToDisplayAsTabs;
      //   if (navItems && navItems.length > 0) {
      //     while (index < navItems.length) {
      //       viewportWidthTakenUp = viewportWidthTakenUp + navItems[index].offsetWidth;
      //       if (viewportWidthTakenUp < window.innerWidth - 40) {
      //         navItems[index].classList.add('visible');
      //         numberOfItemsToDisplayAsTabs = index + 1;
      //       } else {
      //         navItems[index].classList.remove('visible');
      //       }
      //       index = index + 1;
      //     }
      //   }
      //   return numberOfItemsToDisplayAsTabs;
      // },
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

  @import '../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .delay-entry-enter {
    opacity: 0;
  }

  .delay-entry-enter-active {
    transition: opacity 0.75s;
  }

</style>
