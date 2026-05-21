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
  import { useRoute } from 'vue-router/composables';
  import store from 'kolibri/store';
  import AllPasswordsPage from 'kolibri-common/components/AllPasswordsPage';
  import useFacility from 'kolibri-common/composables/useFacility';
  import { PageNames } from '../../constants';
  import { LastPages } from '../../constants/lastPagesConstants';

  export default {
    name: 'CoachAllPasswordsPage',
    components: { AllPasswordsPage },
    setup() {
      const { currentFacilityName } = useFacility();
      const route = useRoute();

      const learners = computed(() => store.getters['classSummary/learners']);
      const className = computed(() => store.state.classSummary.name);
      const facilityName = computed(() => currentFacilityName.value);
      const backRoute = computed(() => {
        const classId = route.params.classId;
        return route.query.last === LastPages.HOME_PAGE
          ? { name: PageNames.HOME_PAGE, params: { classId } }
          : { name: PageNames.LEARNERS_ROOT, params: { classId } };
      });

      return { learners, className, facilityName, backRoute };
    },
  };

</script>
