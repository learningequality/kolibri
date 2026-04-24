import { computed, ref } from 'vue';
import { useRouter } from 'vue-router/composables';
import { localeCompare } from 'kolibri/utils/i18n';
import store from 'kolibri/store';
import { PageNames } from '../constants';
import useCoreCoach from './useCoreCoach';

/**
 * Shared attendance form logic used by both AttendanceNewPage and AttendanceEditPage.
 * @param {object} options - Options object.
 * @param {import('vue').Ref<boolean>|import('vue').ComputedRef<boolean>} options.hasChanges
 *   Reactive flag indicating whether the form has unsaved changes.
 * @param {Function} options.markClean - Called when the user confirms leaving without saving.
 * @param {import('vue').Ref<boolean>} options.submitting
 *   Reactive flag for whether a submit/save is in progress.
 * @param {Function} [options.onChange] - Optional callback fired when the attendance map changes.
 * @returns {object} Attendance form state and methods.
 */
export default function useAttendanceForm({ hasChanges, markClean, submitting, onChange }) {
  const router = useRouter();
  const { classId } = useCoreCoach();

  const attendanceMap = ref({});
  const previouslyEnrolledMap = ref({});
  const enrolledLearnerIds = ref(null);
  const showMarkAllModal = ref(false);
  const pendingRoute = ref(null);

  const backRoute = computed(() => ({
    name: PageNames.ATTENDANCE_HISTORY,
    params: { classId: classId.value },
  }));

  const sortedLearners = computed(() => {
    const learners = store.getters['classSummary/learners'] || [];
    return [...learners]
      .filter(l => enrolledLearnerIds.value === null || enrolledLearnerIds.value.has(l.id))
      .sort((a, b) => localeCompare(a.name, b.name));
  });

  /**
   * Sets the set of enrolled learner IDs to filter the learner list.
   * @param {object} ids - A Set of learner IDs, or null to include all learners.
   * @returns {void}
   */
  function setEnrolledLearnerIds(ids) {
    enrolledLearnerIds.value = ids;
  }

  function isPresent(learnerId) {
    return !!attendanceMap.value[learnerId];
  }

  function toggleLearner(learnerId) {
    attendanceMap.value = {
      ...attendanceMap.value,
      [learnerId]: !attendanceMap.value[learnerId],
    };
    if (onChange) onChange();
  }

  const sortedPreviouslyEnrolled = computed(() =>
    Object.values(previouslyEnrolledMap.value).sort((a, b) => localeCompare(a.name, b.name)),
  );

  /**
   * Populates the map of previously enrolled learners from attendance records.
   * @param {Array} records - Attendance record objects with user and presence data.
   * @returns {void}
   */
  function setPreviouslyEnrolled(records) {
    const map = {};
    records.forEach(r => {
      map[r.user] = {
        id: r.user,
        name: r.user_name || '',
        username: r.user_username || '',
        present: r.present,
      };
    });
    previouslyEnrolledMap.value = map;
  }

  const currentPresentCount = computed(
    () => sortedLearners.value.filter(l => !!attendanceMap.value[l.id]).length,
  );
  const removedPresentCount = computed(
    () => Object.values(previouslyEnrolledMap.value).filter(r => r.present).length,
  );
  const presentCount = computed(() => currentPresentCount.value + removedPresentCount.value);
  const currentAbsentCount = computed(
    () => sortedLearners.value.length - currentPresentCount.value,
  );
  const absentCount = computed(
    () =>
      sortedLearners.value.length +
      Object.keys(previouslyEnrolledMap.value).length -
      presentCount.value,
  );

  const allPresent = computed(
    () =>
      sortedLearners.value.length > 0 && currentPresentCount.value === sortedLearners.value.length,
  );

  /**
   * Sets the attendance status for all current learners.
   * @param {boolean} value - Whether to mark all learners as present or absent.
   * @returns {void}
   */
  function setAllLearners(value) {
    const newMap = {};
    sortedLearners.value.forEach(l => {
      newMap[l.id] = value;
    });
    attendanceMap.value = newMap;
    if (onChange) onChange();
  }

  /**
   * Handles the mark-all checkbox change event.
   * @param {boolean} checked - Whether the mark-all checkbox is checked.
   * @returns {void}
   */
  function handleMarkAllChange(checked) {
    if (checked) {
      showMarkAllModal.value = true;
    } else {
      setAllLearners(false);
    }
  }

  /**
   * Confirms marking all learners as present and closes the modal.
   * @returns {void}
   */
  function confirmMarkAll() {
    setAllLearners(true);
    showMarkAllModal.value = false;
  }

  /**
   * Cancels the mark-all action and closes the modal.
   * @returns {void}
   */
  function cancelMarkAll() {
    showMarkAllModal.value = false;
  }

  /**
   * Navigates back to the attendance history page with optional query parameters.
   * @param {object} query - Query parameters to include in the route.
   * @returns {void}
   */
  function navigateBack(query = {}) {
    router.push({
      ...backRoute.value,
      query,
    });
  }

  // Unsaved changes guard
  /**
   * Confirms navigation away from the page, discarding unsaved changes.
   * @returns {void}
   */
  function confirmLeave() {
    const dest = pendingRoute.value;
    pendingRoute.value = null;
    markClean();
    router.push(dest);
  }

  /**
   * Cancels the pending navigation, keeping the user on the current page.
   * @returns {void}
   */
  function cancelLeave() {
    pendingRoute.value = null;
  }

  /**
   * Vue Router navigation guard to prompt confirmation when leaving with unsaved changes.
   * @param {object} to - The target route being navigated to.
   * @param {object} _from - The current route being navigated away from.
   * @param {Function} next - The callback to resolve the guard.
   * @returns {void}
   */
  function beforeRouteLeave(to, _from, next) {
    if (hasChanges.value && !submitting.value) {
      pendingRoute.value = to;
      next(false);
    } else {
      next();
    }
  }

  /**
   * Builds the attendance records array from current learner states.
   * @returns {Array} Array of record objects with user ID and presence status.
   */
  function buildRecords() {
    return sortedLearners.value.map(learner => ({
      user: learner.id,
      present: !!attendanceMap.value[learner.id],
    }));
  }

  return {
    attendanceMap,
    backRoute,
    sortedLearners,
    sortedPreviouslyEnrolled,
    setPreviouslyEnrolled,
    setEnrolledLearnerIds,
    presentCount,
    absentCount,
    currentAbsentCount,
    allPresent,
    showMarkAllModal,
    pendingRoute,
    isPresent,
    toggleLearner,
    handleMarkAllChange,
    confirmMarkAll,
    cancelMarkAll,
    navigateBack,
    confirmLeave,
    cancelLeave,
    beforeRouteLeave,
    buildRecords,
  };
}
