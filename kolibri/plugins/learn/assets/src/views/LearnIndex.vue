<template slot-scope="{ loading }">

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <transition name="delay-entry">
      <PostSetupModalGroup
        v-if="welcomeModalVisible"
        isOnMyOwnUser
        @cancel="hideWelcomeModal"
      />
    </transition>
    <router-view :loading="loading" />
  </NotificationsRoot>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import plugin_data from 'plugin_data';
  import { PageNames } from '../constants';
  import PostSetupModalGroup from '../../../../device/assets/src/views/PostSetupModalGroup.vue';

  const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'LearnIndex',
    components: {
      NotificationsRoot,
      PostSetupModalGroup,
    },
    computed: {
      ...mapGetters(['isUserLoggedIn']),
      ...mapState({
        welcomeModalVisibleState: 'welcomeModalVisible',
      }),
      ...mapState({
        loading: state => state.core.loading,
      }),
      welcomeModalVisible() {
        return (
          this.welcomeModalVisibleState &&
          window.sessionStorage.getItem(welcomeDismissalKey) !== 'true'
        );
      },
      userIsAuthorized() {
        if (this.pageName === PageNames.BOOKMARKS) {
          return this.isUserLoggedIn;
        }
        return (
          (plugin_data.allowGuestAccess && this.$store.getters.allowAccess) || this.isUserLoggedIn
        );
      },
    },
    methods: {
      hideWelcomeModal() {
        window.sessionStorage.setItem(welcomeDismissalKey, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './learn';

</style>
