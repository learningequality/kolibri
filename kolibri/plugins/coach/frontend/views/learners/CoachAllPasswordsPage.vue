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
  import { PageNames } from '../../constants';
  import { LastPages } from '../../constants/lastPagesConstants';

  export default {
    name: 'CoachAllPasswordsPage',
    components: { AllPasswordsPage },
    setup() {
      const store = getCurrentInstance().proxy.$store;
      const { currentFacilityName } = useFacility();

      const learners = computed(() => store.getters['classSummary/learners']);
      const className = computed(() => store.state.classSummary.name);
      const facilityName = computed(() => currentFacilityName.value);

      return { learners, className, facilityName };
    },
    computed: {
      backRoute() {
        const classId = this.$route.params.classId;
        return this.$route.query.last === LastPages.HOME_PAGE
          ? { name: PageNames.HOME_PAGE, params: { classId } }
          : { name: PageNames.LEARNERS_ROOT, params: { classId } };
      },
    },
  };

</script>
