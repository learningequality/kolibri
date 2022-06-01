<template>

  <div>
    <transition name="delay-entry">
      <PostSetupModalGroup
        v-if="welcomeModalVisible"
        @cancel="hideWelcomeModal"
      />
    </transition>

    <router-view />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { PageNames } from '../constants';
  import PostSetupModalGroup from './PostSetupModalGroup';

  const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'DeviceIndex',
    components: {
      PostSetupModalGroup,
    },
    computed: {
      ...mapState({ welcomeModalVisibleState: 'welcomeModalVisible' }),
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
