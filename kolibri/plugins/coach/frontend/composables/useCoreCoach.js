import find from 'lodash/find';
import { get } from '@vueuse/core';
import { computed, getCurrentInstance } from 'vue';
import { useRoute } from 'vue-router/composables';
import useUser from 'kolibri/composables/useUser';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { coachStrings } from '../views/common/commonCoachStrings';

export default function useCoreCoach(store) {
  store = store || getCurrentInstance().proxy.$store;
  const route = useRoute();
  const appBarTitle = computed(() => getAppBarTitle());
  const authorized = computed(() => store.getters.userIsAuthorizedForCoach);
  const classId = computed(() => route.params.classId);
  const className = computed(() => store.state.classSummary.name);
  const groups = computed(() => store.getters['classSummary/groups']);
  const { isSuperuser } = useUser();
  const { facilities } = useFacilities();

  function getAppBarTitle() {
    let facilityName;
    // Using coachStrings.$tr() here because mixins are not applied
    // prior to props being processed.
    const { facility_id, name } = store.state.classSummary;
    if (facility_id && get(facilities).length > 1 && get(isSuperuser)) {
      const match = find(get(facilities), { id: facility_id }) || {};
      facilityName = match.name;
    }
    if (facilityName && name) {
      return coachStrings.$tr('coachLabelWithOneName', {
        name: facilityName,
      });
    } else {
      return coachStrings.$tr('coachLabel');
    }
  }

  function initClassInfo() {
    return store.dispatch('initClassInfo', get(classId));
  }

  function refreshClassSummary() {
    return store.dispatch('classSummary/refreshClassSummary', null, { root: true });
  }

  return {
    initClassInfo,
    refreshClassSummary,
    classId,
    className,
    groups,
    authorized,
    appBarTitle,
  };
}
