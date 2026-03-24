import { computed, ref } from 'vue';
import UnitReportResource from '../apiResources/unitReport';
import { bucketAllObjectives } from '../utils/scoreBucketing';

/**
 * Composable that fetches unit report data from the API and exposes
 * reactive state for the learning objectives report.
 *
 * @param {import('vue').Ref<string>} courseSessionId
 * @param {import('vue').Ref<string>} unitContentnodeId
 */
export default function useUnitReport(courseSessionId, unitContentnodeId) {
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

  const activeTest = computed(() => {
    if (!reportData.value) {
      return null;
    }
    const { post_test, pre_test } = reportData.value;
    if (post_test.status !== 'not_activated') {
      return post_test;
    }
    if (pre_test.status !== 'not_activated') {
      return pre_test;
    }
    return null;
  });

  const activeTestStatus = computed(() => {
    return activeTest.value?.status || 'not_activated';
  });

  const bucketedObjectives = computed(() => {
    if (!reportData.value || !activeTest.value) {
      return [];
    }
    return bucketAllObjectives(reportData.value.learning_objectives, activeTest.value.scores);
  });

  return {
    loading,
    reportData,
    fetchReport,
    activeTest,
    activeTestStatus,
    bucketedObjectives,
  };
}
