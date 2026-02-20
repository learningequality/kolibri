import { computed, ref } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { TestStatus, TestType } from '../constants/courseConstants';

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
   * The unit currently being worked on, derived from server-provided active_unit_id.
   */
  const activeUnit = computed(() => {
    if (!units.value.length || !lastUnitTest.value) return null;
    const id = lastUnitTest.value.active_unit_id;
    if (!id) return null;
    return units.value.find(u => u.id === id) || null;
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
   * Read directly from the server-provided unit_phase field.
   */
  const unitPhase = computed(() => {
    if (!lastUnitTest.value) return null;
    return lastUnitTest.value.unit_phase;
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
      .then(result => {
        if (testType === TestType.PRE) {
          createSnackbar(preTestStartedForUnit$({ title: activeUnit.value.numberedTitle }));
        } else {
          createSnackbar(postTestStartedForUnit$({ title: activeUnit.value.numberedTitle }));
        }
        lastUnitTest.value = result;
      })
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
        lastUnitTest.value = result;
      })
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
    })
      .then(result => {
        courseSession.value = { ...courseSession.value, active: result.active };
        if (result.active) {
          createSnackbar(courseVisible$());
        } else {
          createSnackbar(courseNotVisible$());
        }
        return result;
      })
      .then(result => {
        // If we activate the course and the pre-test for the first unit hasn't been started,
        // start it automatically to make things easier for the coach
        if (result?.active && !activeTest.value && activeUnitIndex.value === 0) {
          // Can fire it off and move on as it will handle dataLoading
          // and such internally
          activateTest(TestType.PRE);
        }
        return result; // pipe the original CourseSession result back out
      })
      .catch(() => {
        createSnackbar(defaultErrorMessage$());
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
