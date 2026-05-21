<template>

  <AllPasswordsPage
    :learners="learners"
    :className="className"
    :facilityName="facilityName"
    :route="backRoute"
  />

</template>


<script>

  import { computed } from 'vue';
  import store from 'kolibri/store';
  import AllPasswordsPage from 'kolibri-common/components/AllPasswordsPage';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { PageNames } from '../constants';

  export default {
    name: 'FacilityAllPasswordsPage',
    components: { AllPasswordsPage },
    setup() {
      const { facilityId, currentFacilityName } = useFacility();

      const learners = computed(() => store.state.classEditManagement.classLearners);
      const className = computed(() => store.state.classEditManagement.currentClass?.name || '');
      const facilityName = computed(() => currentFacilityName.value);
      const backRoute = computed(() => ({
        name: PageNames.CLASS_EDIT_MGMT_PAGE,
        params: {
          id: store.state.classEditManagement.currentClass?.id,
          facility_id: facilityId.value,
        },
      }));

      return { learners, className, facilityName, backRoute };
    },
  };

</script>
