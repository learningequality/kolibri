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
  import { useRoute } from 'vue-router/composables';

  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { IsPinAuthenticated } from 'kolibri/constants';
  import redirectBrowser from 'kolibri/utils/redirectBrowser';
  import urls from 'kolibri/urls';
  import store from 'kolibri/store';
  import useUser from 'kolibri/composables/useUser';
  import plugin_data from 'kolibri-plugin-data';
  import useFacilities from 'kolibri-common/composables/useFacilities';
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
      const route = useRoute();
      const { isUserLoggedIn, userFacilityId } = useUser();
      const { getFacilityConfig, facilityConfig } = useFacilities();

      const isPinSet = ref(null);
      const showModal = ref(false);
      const facilityDatasetId = ref(null);

      const pageName = computed(() => route.name);
      const userIsAuthorized = computed(() => {
        if (pageName.value === PageNames.BOOKMARKS) {
          return isUserLoggedIn.value;
        }
        return (plugin_data.allowGuestAccess && store.getters.allowAccess) || isUserLoggedIn.value;
      });

      onMounted(async () => {
        try {
          await getFacilityConfig();
          isPinSet.value = facilityConfig.value.extra_fields?.pin_code;
          facilityDatasetId.value = facilityConfig.value.id;
        } catch (error) {
          store.dispatch('handleError', { error, reloadOnReconnect: true });
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
