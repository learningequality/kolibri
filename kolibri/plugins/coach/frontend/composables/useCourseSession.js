import { computed, ref, watch } from 'vue';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { TestType } from '../constants/courseConstants';

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
 * @typedef {object} CourseSession
 * @property {import('vue').Ref<boolean>} pageLoading - UI-blocking load state
 * @property {import('vue').Ref<boolean>} dataLoading - Background load state
 * @property {import('vue').Ref<boolean>} contentMissing - Course content deleted from device
 * @property {import('vue').Ref<object>} courseSession - Session record
 * @property {import('vue').Ref<object>} course - Course content tree
 * @property {import('vue').Ref<object>} lastUnitTest - Most recent unit test
 * @property {import('vue').ComputedRef<object>} activeTest - Open test, or null
 * @property {import('vue').ComputedRef<object[]>} units - Units with numbered titles
 * @property {import('vue').ComputedRef<object>} activeUnit - Unit in progress, or null
 * @property {import('vue').ComputedRef<number>} activeUnitIndex - Index of activeUnit, or -1
 * @property {import('vue').ComputedRef<object[]>} completedUnits - Units before the active one
 * @property {import('vue').ComputedRef<object[]>} upcomingUnits - Units after the active one
 * @property {import('vue').ComputedRef<boolean>} isCourseComplete - All units finished
 * @property {import('vue').ComputedRef<string>} unitPhase - Active unit's lifecycle phase
 * @property {(testType: string) => Promise<void>} activateTest - Start a unit's pre/post test
 * @property {() => Promise<void>} closeTest - Close the active test
 * @property {() => Promise<void>} toggleCourseActive - Flip the session's active flag
 * @property {() => Promise<void>} refreshCourseSessionData - Silently re-fetch the session
 */

/**
 * A composable for managing course session state.
 * Handles fetching course session data, course content, active tests, and test history.
 * Provides derived state for units and unit phase.
 * @param {import('vue').Ref<string>} courseSessionId - Refetches on change
 * @returns {CourseSession} Reactive session state, derived units, and test actions
 */
export default function useCourseSession(courseSessionId) {
  const { createSnackbar } = useSnackbar();
  // -----------
  // Raw state
  // -----------
  const courseSession = ref(null);
  const course = ref(null);
  const lastUnitTest = ref(null);
  // A test is active if it exists and is not closed
  const activeTest = computed(() => {
    const test = lastUnitTest.value;
    if (!test || !test.id) return null;
    return test.closed === false ? test : null;
  });

  // UI blocking loading state
  const pageLoading = ref(true);
  // Informative loading state (ie, we're re-fetching the last unit test, activating/closing)
  const dataLoading = ref(false);

  // Whether the course content is missing (deleted from device).
  // The courses list page detects this via a backend `missing_resource` annotation on the
  // session queryset. This composable detects it at fetch time via a failed fetchTree call,
  // which is needed because the detail page fetches the content tree independently.
  const contentMissing = ref(false);

  // -----------
  // Data fetching
  // -----------
  function fetchCourseSession() {
    pageLoading.value = true;
    contentMissing.value = false;
    if (!courseSessionId.value) {
      // Reset to avoid stale data
      courseSession.value = null;
      course.value = null;
      lastUnitTest.value = null;
      pageLoading.value = false;
      return;
    }
    CourseSessionResource.fetchModel({ id: courseSessionId.value })
      .then(session => {
        courseSession.value = session;
        return ContentNodeResource.fetchTree({ id: session.course }).catch(() => {
          contentMissing.value = true;
          return null;
        });
      })
      .then(courseData => {
        course.value = courseData;
        if (!courseData) return null;
        return CourseSessionResource.lastUnitTest({ id: courseSessionId.value });
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
  }

  fetchCourseSession();

  // When courseSessionId changes, we update all of our data
  watch(courseSessionId, () => fetchCourseSession());

  // -----------
  // Derived unit state
  // -----------

  /**
   * All units from the course content tree, with numbered titles.
   * Original title is preserved, numberedTitle adds the "Unit N:" prefix.
   */
  const units = computed(() => {
    if (!courseSessionId.value) return [];
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
    if (!courseSessionId.value) return null;
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

  /**
   * Silently re-fetches the course session to pick up changes (e.g. recipient edits)
   * without triggering the full-page loading state.
   * @returns {Promise<void>}
   */
  function refreshCourseSessionData() {
    if (!courseSessionId.value) return Promise.resolve();
    return CourseSessionResource.fetchModel({ id: courseSessionId.value })
      .then(session => {
        courseSession.value = session;
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
    contentMissing,
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
    refreshCourseSessionData,
  };
}
