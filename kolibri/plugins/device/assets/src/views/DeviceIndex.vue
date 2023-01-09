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
    },
    methods: {
      hideWelcomeModal() {
        window.sessionStorage.setItem(welcomeDimissalKey, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
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
