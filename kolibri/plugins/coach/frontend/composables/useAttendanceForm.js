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
 * Reactive flag indicating whether the form has unsaved changes.
 * @param {Function} options.markClean - Called when the user confirms leaving without saving.
 * @param {import('vue').Ref<boolean>} options.submitting
 * Reactive flag for whether a submit/save is in progress.
 * @param {Function} [options.onChange] - Optional callback fired whenever the attendance map
 * changes (toggle or mark-all).
 * @returns {object} Attendance form state and methods.
 */
export default function useAttendanceForm({ hasChanges, markClean, submitting, onChange }) {
  const router = useRouter();
  const { classId } = useCoreCoach();

  const attendanceMap = ref({});
  const previouslyEnrolledMap = ref({});
  const enrolledLearnerIds = ref(null);
  const showMarkAllModal = ref(false);
  const pendingMarkAll = ref(false);
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

  // The switch should appear checked if all learners are genuinely present, OR if the
  // user has clicked "mark all present" and is seeing the confirmation modal (pendingMarkAll).
  // When the modal is canceled, pendingMarkAll resets to false, which changes this computed
  // from true → false and gives Vue a real prop change to re-render the KSwitch correctly.
  const markAllPresent = computed(() => allPresent.value || pendingMarkAll.value);

  function setAllLearners(value) {
    const newMap = {};
    sortedLearners.value.forEach(l => {
      newMap[l.id] = value;
    });
    attendanceMap.value = newMap;
    if (onChange) onChange();
  }

  function handleMarkAllChange(checked) {
    if (checked) {
      pendingMarkAll.value = true;
      showMarkAllModal.value = true;
    } else {
      setAllLearners(false);
    }
  }

  function confirmMarkAll() {
    setAllLearners(true);
    pendingMarkAll.value = false;
    showMarkAllModal.value = false;
  }

  function cancelMarkAll() {
    pendingMarkAll.value = false;
    showMarkAllModal.value = false;
  }

  function navigateBack(query = {}) {
    router.push({
      ...backRoute.value,
      query,
    });
  }

  // Unsaved changes guard
  function confirmLeave() {
    const dest = pendingRoute.value;
    pendingRoute.value = null;
    markClean();
    router.push(dest);
  }

  function cancelLeave() {
    pendingRoute.value = null;
  }

  function beforeRouteLeave(to, _from, next) {
    if (hasChanges.value && !submitting.value) {
      pendingRoute.value = to;
      next(false);
    } else {
      next();
    }
  }

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
    markAllPresent,
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
