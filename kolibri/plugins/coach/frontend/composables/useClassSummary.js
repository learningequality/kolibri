import { computed, getCurrentInstance } from 'vue';

export default function useClassSummary(store) {
  store = store || getCurrentInstance().proxy.$store;
  /**
   * Return array of learner names given a course session object.
   * @returns {Function} - Function that takes a course session object
   * and returns an array of learner names.
   */
  const getRecipientNamesForCourseSession = computed(() => {
    return store.getters['classSummary/getRecipientNamesForExam'];
  });

  return {
    getRecipientNamesForCourseSession,
  };
}
