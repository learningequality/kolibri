import find from 'lodash/find';
import logger from 'kolibri-logging';
import { get } from '@vueuse/core';
import { computed, getCurrentInstance } from 'vue';
import { currentLanguage, isRtl } from 'kolibri/utils/i18n';
import useUser from 'kolibri/composables/useUser';
import useFacilities from 'kolibri-common/composables/useFacilities';
import { coachStrings } from '../views/common/commonCoachStrings';

const logging = logger.getLogger(__filename);

export default function useCoreCoach(store) {
  store = store || getCurrentInstance().proxy.$store;
  const route = computed(() => store.state.route);
  const pageTitle = computed(() => formatPageTitle());
  const appBarTitle = computed(() => getAppBarTitle());
  const authorized = computed(() => store.getters.userIsAuthorizedForCoach);
  const classId = computed(() => get(route).params.classId);
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

  function formatPageTitle() {
    // To get a page title, each coach route should have
    // meta.titleParts defined, which is an array of coachStrings tr keys
    // or special all-caps strings that get mapped to names.
    const parts = get(route).meta.titleParts || [];
    const classSummary = store.state.classSummary;
    const { params } = get(route);

    let strings = parts.map(part => {
      try {
        switch (part) {
          case 'GROUP_NAME':
            return classSummary.groupMap[params.groupId].name;
          case 'CLASS_NAME':
            return classSummary.name;
          case 'LEARNER_NAME':
            return classSummary.learnerMap[params.learnerId].name;
          case 'LESSON_NAME':
            return classSummary.lessonMap[params.lessonId].title;
          case 'QUIZ_NAME':
            return classSummary.examMap[params.quizId].title;
          case 'EXERCISE_NAME':
            return classSummary.contentMap[params.exerciseId].title;
          case 'RESOURCE_NAME':
            return classSummary.contentMap[params.resourceId].title;
          default:
            return coachStrings.$tr(part);
        }
      } catch (err) {
        logging.error(
          "Failed to obtain page title. Ensure that this route's meta.titleParts are corrrectly configured.",
        );
        return '';
      }
    });

    if (isRtl(currentLanguage)) {
      strings = strings.reverse();
    }
    return strings.join(' - ');
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
    groups,
    authorized,
    pageTitle,
    appBarTitle,
  };
}
