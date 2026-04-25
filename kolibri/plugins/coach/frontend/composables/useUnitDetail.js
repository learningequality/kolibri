import { ref, watch, computed } from 'vue';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import UnitReportResource from '../apiResources/unitReport';
import UnitLessonProgressResource from '../apiResources/unitLessonProgress';
import { deriveUnitReportInfo } from '../utils/scoreBucketing';
import { STATUSES } from '../modules/classSummary/constants';

const { defaultErrorMessage$ } = coreStrings;
const { unitNLabel$ } = coursesStrings;

// Invert STATUSES ({ notStarted: 'NotStarted', ... }) to map backend values → tally keys
const STATUS_KEY_MAP = Object.fromEntries(
  Object.entries(STATUSES).map(([key, value]) => [value, key]),
);

/**
 * Returns objectives from bucketedObjectives whose IDs are mapped to lessonId
 * in the lesson_objectives map from ContentNode.options.
 * @param {string} lessonId - The lesson ContentNode ID whose objectives to select.
 * @param {object} lessonObjectivesMap - { [lessonContentnodeId]: string[] }
 * @param {object[]} bucketedObjectives - Objectives carrying score-bucket counts to filter.
 * @returns {object[]} The objectives mapped to the given lesson.
 */
export function filterObjectivesForLesson(lessonId, lessonObjectivesMap, bucketedObjectives) {
  const loIds = lessonObjectivesMap[lessonId];
  if (!loIds || !loIds.length) return [];
  const loIdSet = new Set(loIds);
  return bucketedObjectives.filter(obj => loIdSet.has(obj.id));
}

/**
 * Computes the status tally for a single content item across all assigned learners.
 * @param {string} contentId - The content item's ID to tally.
 * @param {object} contentStatusIndex - { [contentId]: { [learnerId]: status } }
 * @param {string[]} learnerIds - The IDs of the assigned learners to count.
 * @returns {{ completed: number, started: number, helpNeeded: number, notStarted: number,
 *   total: number }} The per-status learner counts plus the total learner count.
 */
export function computeResourceTally(contentId, contentStatusIndex, learnerIds) {
  const byLearner = contentStatusIndex[contentId] || {};
  const tally = Object.fromEntries(Object.keys(STATUSES).map(key => [key, 0]));
  tally.total = learnerIds.length;
  for (const learnerId of learnerIds) {
    const status = byLearner[learnerId] || STATUSES.notStarted;
    tally[STATUS_KEY_MAP[status]] += 1;
  }
  return tally;
}

export default function useUnitDetail(courseSessionId, unitContentnodeId) {
  const { createSnackbar } = useSnackbar();

  const loading = ref(true);
  const lessons = ref([]);
  const bucketedObjectives = ref([]);
  const rawLearningObjectives = ref([]);
  const lessonObjectivesMap = ref({});
  const unitTitle = ref('');
  const unitNumber = ref(null);
  const courseTitle = ref('');
  const learnerIds = ref([]);
  const contentLearnerStatus = ref([]);
  const activeTestStatus = ref('not_activated');

  function fetchData() {
    const sessionId = courseSessionId.value;
    const unitId = unitContentnodeId.value;
    if (!sessionId || !unitId) return;

    loading.value = true;

    Promise.all([
      UnitReportResource.fetchReport({ courseSessionId: sessionId, unitContentnodeId: unitId }),
      UnitLessonProgressResource.fetchProgress({
        courseSessionId: sessionId,
        unitContentnodeId: unitId,
      }),
    ])
      .then(([reportData, progressData]) => {
        const derived = deriveUnitReportInfo(reportData);
        activeTestStatus.value = derived.activeTestStatus;
        bucketedObjectives.value = derived.bucketedObjectives;
        unitTitle.value = reportData.unit_title;
        unitNumber.value = reportData.unit_number || null;
        courseTitle.value = reportData.course_title || '';
        rawLearningObjectives.value = reportData.learning_objectives || [];
        lessonObjectivesMap.value = reportData.lesson_objectives || {};
        learnerIds.value = reportData.learners.map(l => l.id);

        lessons.value = progressData.lessons;
        contentLearnerStatus.value = progressData.content_learner_status;
      })
      .catch(() => {
        createSnackbar(defaultErrorMessage$());
      })
      .finally(() => {
        loading.value = false;
      });
  }

  watch([courseSessionId, unitContentnodeId], fetchData, { immediate: true });

  // Index status entries by content_id → learner_id so resourceTally is O(1) lookup
  // rather than scanning all entries per resource per render.
  const contentStatusIndex = computed(() => {
    const index = {};
    for (const entry of contentLearnerStatus.value) {
      if (!index[entry.content_id]) index[entry.content_id] = {};
      index[entry.content_id][entry.learner_id] = entry.status;
    }
    return index;
  });

  function resourceTally(contentId) {
    return computeResourceTally(contentId, contentStatusIndex.value, learnerIds.value);
  }

  const numberedUnitTitle = computed(() => {
    if (!unitNumber.value) return unitTitle.value;
    return `${unitNLabel$({ num: unitNumber.value })} ${unitTitle.value}`;
  });

  function objectivesForLesson(lessonId) {
    // When test data is available, use bucketed objectives (have score counts).
    // When no active test, fall back to raw LOs with zero counts so the LO
    // names still render in the accordion (SparklineBars show empty state).
    const source =
      bucketedObjectives.value.length > 0
        ? bucketedObjectives.value
        : rawLearningObjectives.value.map(lo => ({
            id: lo.id,
            text: lo.text,
            numQuestions: lo.num_questions,
            lowCount: 0,
            midCount: 0,
            highCount: 0,
          }));
    return filterObjectivesForLesson(lessonId, lessonObjectivesMap.value, source);
  }

  return {
    loading,
    lessons,
    courseTitle,
    numberedUnitTitle,
    resourceTally,
    objectivesForLesson,
    activeTestStatus,
  };
}
