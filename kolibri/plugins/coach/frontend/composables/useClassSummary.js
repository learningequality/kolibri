import { computed } from 'vue';
import store from 'kolibri/store';

export default function useClassSummary() {
  /**
   * Return array of learner names given a course session object.
   * @returns {Function} - Function that takes a course session object
   * and returns an array of learner names.
   */
  const getRecipientNamesForCourseSession = computed(() => {
    return store.getters['classSummary/getRecipientNamesForExam'];
  });

  const className = computed(() => store.state.classSummary.name);

  return {
    className,
    getRecipientNamesForCourseSession,
  };
}
