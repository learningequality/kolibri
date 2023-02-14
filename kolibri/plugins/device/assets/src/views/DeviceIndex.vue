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
  const isPinAuthenticatedKey = 'IS_PIN_AUTHENTICATED';

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
        currentFacility: {},
        isPinAuthenticated: window.sessionStorage.getItem(isPinAuthenticatedKey) === 'true',
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
      isPinSet() {
        const dataset = this.currentFacility['dataset'] || {};
        const extraFields = dataset['extra_fields'] || {};
        return extraFields['pin_code'];
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
        return this.authenticateWithPin && this.isPinSet;
      },
    },
    watch: {
      facilities(newValue) {
        this.currentFacility = find(newValue, { id: this.currentFacilityId }) || {};
        const { dataset } = this.currentFacility;
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
        window.sessionStorage.setItem(isPinAuthenticatedKey, true);
        this.isPinAuthenticated = window.sessionStorage.getItem(isPinAuthenticatedKey) === 'true';
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
