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
  import { IsPinAuthenticated } from 'kolibri.coreVue.vuex.constants';
  import { getCookie, setCookie } from 'kolibri.utils.cookieUtils';
  import redirectBrowser from 'kolibri.utils.redirectBrowser';
  import urls from 'kolibri.urls';
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
        currentFacility: {},
        isPinAuthenticated: getCookie(IsPinAuthenticated) === 'true',
      };
    },
    computed: {
      ...mapGetters(['isUserLoggedIn', 'currentFacilityId']),
      ...mapState(['authenticateWithPin', 'grantPluginAccess']),
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
          //Force learner back to learn
          redirectBrowser(urls['kolibri:kolibri.plugins.learn:learn']());
        }
        return (this.showModal = false);
      },
      submit() {
        this.isPinAuthenticated = true;
        setCookie(IsPinAuthenticated, true, 15000);
        this.grantPluginAccess();
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
