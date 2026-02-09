import { computed, ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { UnitPhase } from '../constants/courseConstants';

const {
  unitNLabel$,
  courseVisible$,
  courseNotVisible$,
  preTestStartedForUnit$,
  postTestStartedForUnit$,
  preTestEndedForUnit$,
  postTestEndedForUnit$,
} = coursesStrings;

/**
 * A composable for managing course session state.
 * Handles fetching course session data, course content, active tests, and test history.
 * Provides derived state for units and unit phase.
 *
 * @param {string} courseSessionId - The ID of the course session to load
 * @returns {Object} Reactive state and methods for managing the course session
 */
export default function useCourseSession(courseSessionId) {
  const { createSnackbar } = useSnackbar();
  // -----------
  // Raw state
  // -----------
  const courseSession = ref(null);
  const course = ref(null);
  const activeTest = ref(null);
  const testHistory = ref([]);
  const loading = ref(true);

  // -----------
  // Data fetching
  // -----------
  CourseSessionResource.fetchModel({ id: courseSessionId })
    .then(session => {
      courseSession.value = session;
      return Promise.all([
        ContentNodeResource.fetchTree({ id: session.course }),
        CourseSessionResource.activeTest({ id: courseSessionId }),
        CourseSessionResource.testHistory({ id: courseSessionId }),
      ]);
    })
    .then(([courseData, activeTestData, historyData]) => {
      course.value = courseData;
      activeTest.value = activeTestData.active_test;
      testHistory.value = historyData.data;
    })
    .finally(() => {
      loading.value = false;
    });

  // -----------
  // Derived unit state
  // -----------

  /**
   * All units from the course content tree, with numbered titles.
   * Original title is preserved, numberedTitle adds the "Unit N:" prefix.
   */
  const units = computed(() => {
    const children = course.value?.children?.results || [];
    return children.map((unit, i) => ({
      ...unit,
      numberedTitle: `${unitNLabel$({ num: i + 1 })} ${unit.title}`,
    }));
  });

  /**
   * The most recently completed test from history.
   */
  const lastCompletedTest = computed(() => {
    if (!testHistory.value?.length) return null;
    return testHistory.value[testHistory.value.length - 1];
  });

  /**
   * The unit currently being worked on, derived from activeTest and testHistory.
   *
   * Logic:
   * - If there's an active test, that determines the active unit
   * - If no active test, derive from test history:
   *   - If last completed test was a post-test, advance to next unit
   *   - If last completed test was a pre-test, stay on that unit
   * - If no history, start at the first unit
   */
  const activeUnit = computed(() => {
    if (!units.value.length) return null;

    // Active test tells us exactly which unit we're on
    if (activeTest.value) {
      return units.value.find(u => u.id === activeTest.value.unit_contentnode_id);
    }

    // No active test - derive from history
    if (!lastCompletedTest.value) {
      // No history = starting fresh at unit 0
      return units.value[0];
    }

    const lastTestUnitIndex = units.value.findIndex(
      u => u.id === lastCompletedTest.value.unit_contentnode_id,
    );

    if (lastCompletedTest.value.test_type === 'post') {
      // Post-test done = unit complete, move to next (or null if course complete)
      return units.value[lastTestUnitIndex + 1] || null;
    }

    // Pre-test done = still on this unit (lessons phase)
    return units.value[lastTestUnitIndex];
  });

  /**
   * Index of the active unit within the units array.
   */
  const activeUnitIndex = computed(() => {
    if (!activeUnit.value) return -1;
    return units.value.findIndex(u => u.id === activeUnit.value.id);
  });

  /**
   * Units that have been completed (before the active unit, or all units if course complete).
   */
  const completedUnits = computed(() => {
    // Course complete - all units are completed
    if (!activeUnit.value) return units.value;
    if (activeUnitIndex.value <= 0) return [];
    return units.value.slice(0, activeUnitIndex.value);
  });

  /**
   * Units that are upcoming (after the active unit).
   */
  const upcomingUnits = computed(() => {
    if (activeUnitIndex.value < 0) return [];
    return units.value.slice(activeUnitIndex.value + 1);
  });

  /**
   * Whether the entire course is complete (all units finished).
   */
  const isCourseComplete = computed(() => {
    return units.value.length > 0 && completedUnits.value.length === units.value.length;
  });

  // -----------
  // Derived test state
  // -----------

  /**
   * The current phase of the active unit in the test lifecycle.
   *
   * State machine:
   * PRE_TEST_PENDING → PRE_TEST_ACTIVE → POST_TEST_PENDING → POST_TEST_ACTIVE → COMPLETE
   */
  const unitPhase = computed(() => {
    // Course complete - all units finished
    if (isCourseComplete.value) return UnitPhase.COMPLETE;

    if (!activeUnit.value) return null;

    // Is there a test running right now?
    if (activeTest.value) {
      return activeTest.value.test_type === 'pre'
        ? UnitPhase.PRE_TEST_ACTIVE
        : UnitPhase.POST_TEST_ACTIVE;
    }

    // No active test - what was the last thing completed for this unit?
    const lastTestForActiveUnit = [...(testHistory.value || [])]
      .reverse()
      .find(t => t.unit_contentnode_id === activeUnit.value.id);

    if (!lastTestForActiveUnit) {
      // No tests done for this unit yet
      return UnitPhase.PRE_TEST_PENDING;
    }

    if (lastTestForActiveUnit.test_type === 'pre') {
      // Pre-test done, ready for post-test (lessons phase)
      return UnitPhase.POST_TEST_PENDING;
    }

    // Post-test done for this unit
    return UnitPhase.COMPLETE;
  });

  // -----------
  // Actions
  // -----------

  /**
   * Activates a test for the current active unit.
   *
   * @param {string} testType - Either 'pre' or 'post'
   * @returns {Promise} Resolves when the test is activated
   */
  function activateTest(testType) {
    return CourseSessionResource.activateTest({
      id: courseSession.value.id,
      data: {
        unit_contentnode_id: activeUnit.value.id,
        test_type: testType,
      },
    }).then(result => {
      activeTest.value = result;
      if (testType === 'pre') {
        createSnackbar(preTestStartedForUnit$({ title: activeUnit.value.numberedTitle }));
      } else {
        createSnackbar(postTestStartedForUnit$({ title: activeUnit.value.numberedTitle }));
      }
    });
  }

  /**
   * Closes the currently active test.
   * Moves the closed test to history and clears activeTest.
   *
   * @returns {Promise} Resolves when the test is closed
   */
  function closeTest() {
    return CourseSessionResource.closeTest({
      id: courseSession.value.id,
      data: {
        unit_contentnode_id: activeTest.value.unit_contentnode_id,
        test_type: activeTest.value.test_type,
      },
    }).then(result => {
      // Get this now because activeUnit will change before we trigger snackbars
      // if we closed the post-test
      const title = activeUnit.value.numberedTitle;

      // Move the closed test to history
      testHistory.value = [
        ...testHistory.value,
        {
          ...activeTest.value,
          status: result.status,
        },
      ];
      activeTest.value = null;
      if (result.test_type === 'pre') {
        createSnackbar(preTestEndedForUnit$({ title }));
      } else {
        createSnackbar(postTestEndedForUnit$({ title }));
      }
    });
  }

  /**
   * Toggles the active state of the course session.
   * Updates the courseSession ref with the new state on success.
   *
   * @returns {Promise} Resolves with the updated course session
   */
  async function toggleCourseActive() {
    const result = await CourseSessionResource.saveModel({
      id: courseSession.value.id,
      data: { active: !courseSession.value.active },
    });
    courseSession.value = { ...courseSession.value, active: result.active };
    if (result.active) {
      createSnackbar(courseVisible$());
    } else {
      createSnackbar(courseNotVisible$());
    }
    return result;
  }

  return {
    // Loading state
    loading,

    // Raw data
    courseSession,
    course,
    activeTest,
    testHistory,

    // Derived unit state
    units,
    activeUnit,
    activeUnitIndex,
    completedUnits,
    upcomingUnits,
    isCourseComplete,

    // Derived test state
    lastCompletedTest,
    unitPhase,

    // Actions
    activateTest,
    closeTest,
    toggleCourseActive,
  };
}
