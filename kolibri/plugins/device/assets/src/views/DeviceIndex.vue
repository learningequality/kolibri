<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <template #sub-nav>
      <DeviceTopNav />
    </template>

    <transition name="delay-entry">
      <PinAuthenticationModal
        v-if="showModal && requirePinAuthentication && !isPinAuthenticated"
        @submit="submit"
        @cancel="closePinModal"
      />
    </transition>

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
  import find from 'lodash/find';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { PageNames } from '../constants';
  import PostSetupModalGroup from './PostSetupModalGroup';
  import PinAuthenticationModal from './PinAuthenticationModal';
  import plugin_data from 'plugin_data';

  const welcomeDimissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';

  export default {
    name: 'DeviceIndex',
    components: {
      NotificationsRoot,
      PostSetupModalGroup,
      PinAuthenticationModal,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        showModal: true,
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'currentFacilityId']),
      ...mapState(['authenticateWithPin']),
      ...mapState({
        welcomeModalVisibleState: 'welcomeModalVisible',
      }),
      facilities() {
        return this.$store.state.core.facilities;
      },
      currentFacility() {
        return find(this.facilities, { id: this.currentFacilityId }) || {};
      },
      isPinSet() {
        const dataset = this.currentFacility['dataset'] || {};
        const extraFields = dataset['extra_fields'] || {};
        return extraFields['pin_code'];
      },
      isPinAuthenticated() {
        return this.$store.state.core.session['is_pin_authenticated'];
      },
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
      requirePinAuthentication() {
        return this.authenticateWithPin && !this.isPinSet;
      },
    },
    watch: {
      currentFacility(newValue) {
        const { dataset } = newValue;
        this.$store.commit('facilityConfig/SET_STATE', {
          facilityDatasetId: dataset.id, //Required for pin authentication
        });
      },
    },
    methods: {
      hideWelcomeModal() {
        window.sessionStorage.setItem(welcomeDimissalKey, true);
        this.$store.commit('SET_WELCOME_MODAL_VISIBLE', false);
      },
      closePinModal() {
        if (this.requirePinAuthentication) {
          //Due to cross-plugin routing limitations, navigate to last accessed page
          this.$router.go(-1);
        }
        return (this.showModal = false);
      },
      submit() {
        this.$store.commit('CORE_SET_SESSION', { is_pin_authenticated: true });
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
