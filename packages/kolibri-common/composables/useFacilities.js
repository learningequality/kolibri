import { reactive, computed } from 'vue';
import plugin_data from 'kolibri-plugin-data';
import FacilityResource from 'kolibri-common/apiResources/FacilityResource';
import useUser from 'kolibri/composables/useUser';
import redirectBrowser from 'kolibri/utils/redirectBrowser';
import FacilityDatasetResource from 'kolibri-common/apiResources/FacilityDatasetResource';
import Lockr from 'lockr';

const state = reactive({
  error: '',
  loading: true,
  pageSessionId: 0,
  notifications: [],
  allowRemoteAccess: plugin_data.allowRemoteAccess,
  // facility
  facilityConfig: {},
  facilities: [],
  pageVisible: true,
  facilityId: Lockr.get('facilityId') || null,
});

export function useFacilities() {
  const { isAppContext, userFacilityId } = useUser();

  const selectedFacility = computed(() => {
    const facilityById = facilities.value.find(f => f.id === state.facilityId);
    if (facilityById) {
      return facilityById;
    }
    return facilities.value.find(f => f.id === userFacilityId.value) || null;
  });

  //getters
  const facilities = computed(() => state.facilities);
  const facilityConfig = computed(() => state.facilityConfig);
  const pageSessionId = computed(() => state.pageSessionId);
  const allowAccess = computed(() => state.allowRemoteAccess || isAppContext.value);
  const isPageLoading = computed(() => state.loading);

  //actions
  async function getFacilities() {
    try {
      state.loading = true;
      const facilities = await FacilityResource.fetchCollection({ force: true });
      state.facilities = facilities;
    } catch (error) {
      state.error = error.message;
    }
  }

  async function getFacilityConfig(facilityId) {
    const facId = facilityId || userFacilityId.value;

    if (!facId) {
      // No facility Id, so redirect and let Kolibri sort it out
      return redirectBrowser();
    }

    let facilityConfig;

    try {
      if (selectedFacility.value && typeof selectedFacility.value.dataset !== 'object') {
        facilityConfig = [selectedFacility.value.dataset];
      } else {
        facilityConfig = await FacilityDatasetResource.fetchCollection({
          getParams: {
            facility_id: facId,
          },
        });
      }

      let config = {};
      const facility = facilityConfig[0];

      if (facility) {
        config = { ...facility };
      }
      setFacilityConfig(config);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }

  //mutations
  function setFacilityConfig(state, facilityConfig) {
    state.facilityConfig = facilityConfig;
  }

  function setFacilities(state, facilities) {
    state.facilities = facilities;
  }

  function setPageLoading(state, value) {
    const update = { loading: value };
    if (value) {
      update.pageSessionId = state.pageSessionId + 1;
    }
    Object.assign(state, update);
  }

  function setError(state, error) {
    state.error = error;
  }

  function setNotification(state, notification) {
    state.notification = notification;
  }

  function removeNotification(state, notification_id) {
    state.notifications = state.notifications.filter(obj => obj.id !== notification_id);
  }

  // fucntion name voilating camelCase as other functions with same name already exist
  function setpageVisibility(state, visibility) {
    state.pageVisibility = visibility;
  }

  return {
    facilities,
    facilityConfig,
    pageSessionId,
    allowAccess,
    isPageLoading,
    getFacilities,
    getFacilityConfig,
    setFacilityConfig,
    setFacilities,
    setPageLoading,
    setError,
    setNotification,
    removeNotification,
    setpageVisibility,
  };
}
