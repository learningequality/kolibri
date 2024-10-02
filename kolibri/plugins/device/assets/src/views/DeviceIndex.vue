<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <transition name="delay-entry">
      <PinAuthenticationModal
        v-if="showModal && authenticateWithPin"
        @submit="submit"
        @cancel="closePinModal"
      />
    </transition>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import Cookies from 'js-cookie';
  import { mapState } from 'vuex';
  import find from 'lodash/find';
  import NotificationsRoot from 'kolibri.coreVue.components.NotificationsRoot';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { IsPinAuthenticated } from 'kolibri.coreVue.vuex.constants';
  import redirectBrowser from 'kolibri.utils.redirectBrowser';
  import urls from 'kolibri.urls';
  import useUser from 'kolibri.coreVue.composables.useUser';
  import plugin_data from 'plugin_data';
  import { PageNames } from '../constants';

  import PinAuthenticationModal from './PinAuthenticationModal';

  export default {
    name: 'DeviceIndex',
    components: {
      NotificationsRoot,
      PinAuthenticationModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { isUserLoggedIn, userFacilityId } = useUser();
      return {
        isUserLoggedIn,
        userFacilityId,
      };
    },
    data() {
      return {
        showModal: false,
        currentFacility: {},
      };
    },
    computed: {
      ...mapState(['authenticateWithPin', 'grantPluginAccess']),
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
      pageName() {
        return this.$route.name;
      },
    },
    watch: {
      facilities(newValue) {
        this.currentFacility = find(newValue, { id: this.userFacilityId }) || {};
        const { dataset } = this.currentFacility;
        this.$store.commit('facilityConfig/SET_STATE', {
          facilityDatasetId: dataset.id, //Required for pin authentication
        });
      },
      isPinSet: {
        handler(newValue) {
          if (!newValue) {
            this.grantPluginAccess();
          }
          this.showModal = newValue && this.authenticateWithPin;
        },
        deep: true,
      },
    },
    methods: {
      closePinModal() {
        redirectBrowser(urls['kolibri:kolibri.plugins.learn:learn']());
        return (this.showModal = false);
      },
      submit() {
        Cookies.set(IsPinAuthenticated, true, {
          expires: new Date(new Date().getTime() + 15 * 1000),
        });
        this.$store.commit('SET_AUTHENTICATE_WITH_PIN', false);
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
