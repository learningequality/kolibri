import { computed, ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { TestStatus, TestType, UnitPhase } from '../constants/courseConstants';

const {
  unitNLabel$,
  courseVisible$,
  courseNotVisible$,
  preTestStartedForUnit$,
  postTestStartedForUnit$,
  preTestEndedForUnit$,
  postTestEndedForUnit$,
} = coursesStrings;

const { defaultErrorMessage$ } = coreStrings;

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
  const lastUnitTest = ref(null);
  const activeTest = computed(() =>
    lastUnitTest?.value?.status === TestStatus.ACTIVE ? lastUnitTest.value : null,
  );
  // UI blocking loading state
  const pageLoading = ref(true);
  // Informative loading state (ie, we're re-fetching the last unit test, activating/closing)
  const dataLoading = ref(false);

  // -----------
  // Data fetching
  // -----------
  CourseSessionResource.fetchModel({ id: courseSessionId })
    .then(session => {
      courseSession.value = session;
      return ContentNodeResource.fetchTree({ id: session.course });
    })
    .then(courseData => {
      course.value = courseData;
      return CourseSessionResource.lastUnitTest({ id: courseSessionId });
    })
    .then(testData => {
      lastUnitTest.value = testData;
    })
    .catch(e => {
      // eslint-disable-next-line no-console
      console.error(e);
      createSnackbar(defaultErrorMessage$());
    })
    .finally(() => {
      pageLoading.value = false;
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

    if (!activeTest.value && !lastUnitTest.value) {
      // No active test and no last test taken, we're at the very beginning
      return units.value[0];
    }

    // Active test tells us exactly which unit we're on
    if (activeTest.value) {
      return units.value.find(u => u.id === activeTest.value.unit_contentnode_id);
    }

    // We don't have an active test, so we'll use the lastUnitTest to work out which is active
    const lastTestUnitIndex = units.value.findIndex(
      u => u.id === lastUnitTest.value?.unit_contentnode_id,
    );

    if (lastUnitTest.value?.test_type === TestType.POST) {
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

    // Is there a test running right now?
    if (activeTest.value) {
      return activeTest.value.test_type === TestType.PRE
        ? UnitPhase.PRE_TEST_ACTIVE
        : UnitPhase.POST_TEST_ACTIVE;
    }

    // No active test - what was the last thing completed for this unit?
    if (!lastUnitTest.value) {
      // No tests done for this whole course session, so we're at the very start
      return UnitPhase.PRE_TEST_PENDING;
    }

    if (lastUnitTest.value.test_type === TestType.PRE) {
      // Pre-test done, ready for post-test (lessons phase)
      return UnitPhase.POST_TEST_PENDING;
    } else {
      // If the last unit test is a post test, we already know we have no active test
      // so, we're pending the pre-test for the next unit
      return UnitPhase.PRE_TEST_PENDING;
    }
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
    dataLoading.value = true;
    return CourseSessionResource.activateTest({
      id: courseSession.value.id,
      data: {
        unit_contentnode_id: activeUnit.value.id,
        test_type: testType,
      },
    })
      .then(() => {
        if (testType === TestType.PRE) {
          createSnackbar(preTestStartedForUnit$({ title: activeUnit.value.numberedTitle }));
        } else {
          createSnackbar(postTestStartedForUnit$({ title: activeUnit.value.numberedTitle }));
        }
        return CourseSessionResource.lastUnitTest({ id: courseSessionId });
      })
      .then(results => (lastUnitTest.value = results))
      .catch(e => {
        // eslint-disable-next-line no-console
        console.error(e);
        createSnackbar(defaultErrorMessage$());
      })
      .finally(() => (dataLoading.value = false));
  }

  /**
   * Closes the currently active test.
   * Moves the closed test to history and clears activeTest.
   *
   * @returns {Promise} Resolves when the test is closed
   */
  function closeTest() {
    dataLoading.value = true;
    return CourseSessionResource.closeTest({
      id: courseSession.value.id,
      data: {
        unit_contentnode_id: activeTest.value.unit_contentnode_id,
        test_type: activeTest.value.test_type,
      },
    })
      .then(result => {
        // Get this now because activeUnit will change before we trigger snackbars
        // if we closed the post-test
        const title = activeUnit.value.numberedTitle;

        if (result.test_type === TestType.PRE) {
          createSnackbar(preTestEndedForUnit$({ title }));
        } else {
          createSnackbar(postTestEndedForUnit$({ title }));
        }
        return CourseSessionResource.lastUnitTest({ id: courseSessionId });
      })
      .then(results => (lastUnitTest.value = results))
      .catch(e => {
        // eslint-disable-next-line no-console
        console.error(e);
        createSnackbar(defaultErrorMessage$());
      })
      .finally(() => (dataLoading.value = false));
  }

  /**
   * Toggles the active state of the course session.
   * Updates the courseSession ref with the new state on success.
   *
   * @returns {Promise} Resolves with the updated course session
   */
  function toggleCourseActive() {
    return CourseSessionResource.saveModel({
      id: courseSession.value.id,
      data: { active: !courseSession.value.active },
    }).then(result => {
      courseSession.value = { ...courseSession.value, active: result.active };
      if (result.active) {
        createSnackbar(courseVisible$());
      } else {
        createSnackbar(courseNotVisible$());
      }
      return result;
    });
  }

  return {
    // Loading state
    pageLoading,
    dataLoading,

    // Raw data
    courseSession,
    course,
    activeTest,

    // Derived unit state
    units,
    activeUnit,
    activeUnitIndex,
    completedUnits,
    upcomingUnits,
    isCourseComplete,

    // Derived test state
    unitPhase,
    lastUnitTest,

    // Actions
    activateTest,
    closeTest,
    toggleCourseActive,
  };
}
