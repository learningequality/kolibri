<template>

  <AllPasswordsPage
    :learners="learners"
    :className="className"
    :facilityName="facilityName"
    :route="backRoute"
  />

</template>


<script>

  import { computed, getCurrentInstance } from 'vue';
  import AllPasswordsPage from 'kolibri-common/components/AllPasswordsPage';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { PageNames } from '../constants';

  export default {
    name: 'FacilityAllPasswordsPage',
    components: { AllPasswordsPage },
    setup() {
      const store = getCurrentInstance().proxy.$store;
      const { currentFacilityName } = useFacility();

      const learners = computed(() => store.state.classEditManagement.classLearners);
      const className = computed(() => store.state.classEditManagement.currentClass?.name || '');
      const facilityName = computed(() => currentFacilityName.value);

      return { learners, className, facilityName };
    },
    computed: {
      backRoute() {
        return {
          name: PageNames.CLASS_EDIT_MGMT_PAGE,
          params: {
            id: this.$route.params.id,
            facility_id: this.$route.params.facility_id,
          },
        };
      },
    },
  };

</script>
