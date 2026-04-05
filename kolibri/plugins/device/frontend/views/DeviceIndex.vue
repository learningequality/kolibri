<template>

  <NotificationsRoot
    :authorized="userIsAuthorized"
    authorizedRole="registeredUser"
  >
    <transition name="delay-entry">
      <PinAuthenticationModal
        v-if="showModal && authenticateWithPin"
        :facilityDatasetId="facilityDatasetId"
        @submit="submit"
        @cancel="closePinModal"
      />
    </transition>

    <router-view />
  </NotificationsRoot>

</template>


<script>

  import Cookies from 'js-cookie';
  import { ref, computed, onMounted } from 'vue';
  import { mapState } from 'vuex';

  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { IsPinAuthenticated } from 'kolibri/constants';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import urls from 'kolibri/urls';
  import useUser from 'kolibri/composables/useUser';
  import { handleApiError } from 'kolibri/utils/appError';
  import { useFacilityConfig } from 'kolibri-common/composables/useFacility';

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
      const { fetchFacilityConfig } = useFacilityConfig(userFacilityId.value);
      const isPinSet = ref(null);
      const showModal = ref(false);
      const facilityDatasetId = ref(null);

      const userIsAuthorized = computed(() => {
        return isUserLoggedIn.value;
      });

      onMounted(async () => {
        try {
          const facilityConfig = await fetchFacilityConfig();
          isPinSet.value = Boolean(facilityConfig?.extra_fields?.pin_code);
          facilityDatasetId.value = facilityConfig.id;
        } catch (error) {
          handleApiError({ error, reloadOnReconnect: true, shouldThrow: false });
        }
      });

      return {
        facilityDatasetId,
        isPinSet,
        showModal,
        userIsAuthorized,
      };
    },
    computed: {
      ...mapState(['authenticateWithPin', 'grantPluginAccess']),
    },
    watch: {
      isPinSet: {
        handler(newValue) {
          if (newValue === false) {
            this.grantPluginAccess();
          }
          this.showModal = newValue === true && this.authenticateWithPin;
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
