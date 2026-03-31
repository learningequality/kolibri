import { computed, getCurrentInstance, ref } from 'vue';
import UnitReportResource from '../apiResources/unitReport';
import { deriveUnitReportInfo } from '../utils/scoreBucketing';

/**
 * Composable that fetches unit report data from the API and exposes
 * reactive state for the learning objectives report.
 *
 * @param {import('vue').Ref<string>} courseSessionId
 * @param {import('vue').Ref<string>} unitContentnodeId
 */
export default function useUnitReport(courseSessionId, unitContentnodeId, store) {
  store = store || getCurrentInstance().proxy.$store;
  const loading = ref(false);
  const reportData = ref(null);

  async function fetchReport() {
    loading.value = true;
    try {
      reportData.value = await UnitReportResource.fetchReport({
        courseSessionId: courseSessionId.value,
        unitContentnodeId: unitContentnodeId.value,
      });
    } finally {
      loading.value = false;
    }
  }

  const derivedInfo = computed(() => {
    if (!reportData.value) {
      return null;
    }
    return deriveUnitReportInfo(reportData.value);
  });

  const activeTestType = computed(() => derivedInfo.value?.activeTestType || null);

  const activeTestStatus = computed(() => derivedInfo.value?.activeTestStatus || 'not_activated');

  const bucketedObjectives = computed(() => derivedInfo.value?.bucketedObjectives || []);

  const learnersWithGroups = computed(() => {
    if (!reportData.value) {
      return [];
    }
    const getGroupNames = store.getters['classSummary/getGroupNamesForLearner'];
    return reportData.value.learners.map(learner => ({
      ...learner,
      groups: getGroupNames(learner.id),
    }));
  });

  return {
    loading,
    reportData,
    fetchReport,
    activeTestType,
    activeTestStatus,
    bucketedObjectives,
    learnersWithGroups,
  };
}
