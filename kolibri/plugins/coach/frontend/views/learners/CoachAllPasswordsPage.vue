<template>

  <NotificationsRoot
    :authorized="authorized"
    authorizedRole="adminOrCoach"
  >
    <AllPasswordsPage
      :learners="learners"
      :className="className"
      :facilityName="facilityName"
      :route="backRoute"
    />
  </NotificationsRoot>

</template>


<script>

  import { computed } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import NotificationsRoot from 'kolibri/components/pages/NotificationsRoot';
  import AllPasswordsPage from 'kolibri-common/components/AllPasswordsPage';
  import useFacility from 'kolibri-common/composables/useFacility';
  import useCoreCoach from '../../composables/useCoreCoach';
  import store from '../../store';
  import { PageNames } from '../../constants';
  import { LastPages } from '../../constants/lastPagesConstants';

  export default {
    name: 'CoachAllPasswordsPage',
    components: { AllPasswordsPage, NotificationsRoot },
    setup() {
      const { currentFacilityName } = useFacility();
      const route = useRoute();
      const { authorized, className } = useCoreCoach(store);

      const learners = computed(() => store.getters['classSummary/learners']);
      const facilityName = computed(() => currentFacilityName.value);
      const backRoute = computed(() => {
        const classId = route.params.classId;
        return route.query.last === LastPages.HOME_PAGE
          ? { name: PageNames.HOME_PAGE, params: { classId } }
          : { name: PageNames.LEARNERS_ROOT, params: { classId } };
      });

      return { authorized, learners, className, facilityName, backRoute };
    },
  };

</script>
