import { computed, ref } from 'vue';
import { useRouter } from 'vue-router/composables';
import { localeCompare } from 'kolibri/utils/i18n';
import store from 'kolibri/store';
import { PageNames } from '../constants';
import useCoreCoach from './useCoreCoach';

/**
 * Shared attendance form logic used by both AttendanceNewPage and AttendanceEditPage.
 *
 * @param {Object} options
 * @param {import('vue').Ref<boolean>|import('vue').ComputedRef<boolean>} options.hasChanges
 *   Reactive flag indicating whether the form has unsaved changes.
 * @param {Function} options.markClean
 *   Called when the user confirms leaving without saving.
 * @param {import('vue').Ref<boolean>} options.submitting
 *   Reactive flag for whether a submit/save is in progress.
 * @param {Function} [options.onChange]
 *   Optional callback fired whenever the attendance map changes (toggle or mark-all).
 */
export default function useAttendanceForm({ hasChanges, markClean, submitting, onChange }) {
  const router = useRouter();
  const { classId } = useCoreCoach();

  const attendanceMap = ref({});
  const showMarkAllModal = ref(false);
  const pendingRoute = ref(null);

  const backRoute = computed(() => ({
    name: PageNames.ATTENDANCE_HISTORY,
    params: { classId: classId.value },
  }));

  const sortedLearners = computed(() => {
    const learners = store.getters['classSummary/learners'] || [];
    return [...learners].sort((a, b) => localeCompare(a.name, b.name));
  });

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

  const presentCount = computed(() => Object.values(attendanceMap.value).filter(Boolean).length);
  const absentCount = computed(() => sortedLearners.value.length - presentCount.value);

  const allPresent = computed(
    () => sortedLearners.value.length > 0 && presentCount.value === sortedLearners.value.length,
  );

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
      showMarkAllModal.value = true;
    } else {
      setAllLearners(false);
    }
  }

  function confirmMarkAll() {
    setAllLearners(true);
    showMarkAllModal.value = false;
  }

  function cancelMarkAll() {
    showMarkAllModal.value = false;
  }

  function navigateBack() {
    router.push(backRoute.value);
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
    presentCount,
    absentCount,
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
