import Modalities from 'kolibri-constants/Modalities';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { ref, computed, provide, inject, watch } from 'vue';
import useFetch from 'kolibri-common/composables/useFetch.js';
import { useCourses } from '../../../composables/useCourses';

/**
 * Composable for managing the logic for the Assign Course side panel.
 * Holds the global assignment state for the side panel session: the selected course,
 * selected recipients, and snapshots of the original recipients used to detect unsaved changes.
 * State persists across side panel subpage navigation and is reset via resetAssignment().
 *
 * This is instantiated in the root component of the Assign Course side panel
 * and its state and methods will be passed down to child components through provide/inject.
 * @param {object} options - **Required** Configuration options for the composable.
 * @param {import('vue').Ref<string>} options.classId - **Required** The id of the class to which
 * the course will be assigned.
 * @returns {AssignCourseInjectObject} The assign-course composable API.
 */
export default function useAssignCourse({ classId }) {
  const searchKeywords = ref('');
  const selectedCourse = ref(null);
  const courseSessionId = ref(null);
  const courseSessionVisible = ref(false);

  const selectedGroupIds = ref([]);
  const selectedLearnerIds = ref([]);

  // Snapshot of recipients at the time editing began, used to detect unsaved changes
  const originalGroupIds = ref([]);
  const originalLearnerIds = ref([]);

  const coursesFetch = useFetch({
    fetchMethod: () => {
      return ContentNodeResource.fetchCollection({
        getParams: {
          available: true,
          max_results: 25,
          modality: Modalities.COURSE,
          keywords: searchKeywords.value,
        },
      });
    },
    fetchMoreMethod: moreParams => {
      return ContentNodeResource.fetchCollection({
        getParams: moreParams,
      });
    },
  });

  const isLoading = computed(() => coursesFetch.loading.value);

  const hasRecipientChanges = computed(() => {
    const sameGroups =
      selectedGroupIds.value.length === originalGroupIds.value.length &&
      selectedGroupIds.value.every(id => originalGroupIds.value.includes(id));
    const sameLearners =
      selectedLearnerIds.value.length === originalLearnerIds.value.length &&
      selectedLearnerIds.value.every(id => originalLearnerIds.value.includes(id));
    return !sameGroups || !sameLearners;
  });

  const { refreshClassCourses } = useCourses();

  const selectCourse = course => {
    selectedCourse.value = course;
  };

  /**
   * Set existing course assignment data for editing
   * @param {object} courseSession - The course session object from CoursesRootPage
   */
  const setExistingAssignment = courseSession => {
    courseSessionId.value = courseSession.id;
    selectedGroupIds.value = [...(courseSession.assignments || [])];
    selectedLearnerIds.value = [...(courseSession.learner_ids || [])];
    originalGroupIds.value = [...(courseSession.assignments || [])];
    originalLearnerIds.value = [...(courseSession.learner_ids || [])];
  };

  /**
   * Set existing course visibility data for editing
   * @param {boolean} isActive - The active status of the course session
   */
  const setCourseVisibility = isActive => {
    courseSessionVisible.value = isActive;
  };

  const assignCourse = () => {
    const isEditing = courseSessionId.value != null;
    return CourseSessionResource.saveModel({
      id: isEditing ? courseSessionId.value : undefined,
      data: {
        active: isEditing ? courseSessionVisible.value : false,
        collection: classId.value,
        course: selectedCourse.value.id,
        assignments: selectedGroupIds.value,
        learner_ids: selectedLearnerIds.value,
      },
      exists: isEditing,
    }).then(response => {
      // Refresh local course list so the changes show immediately
      refreshClassCourses();
      return response;
    });
  };

  /**
   * Reset the assignment state
   */
  const resetAssignment = () => {
    selectedCourse.value = null;
    courseSessionId.value = null;
    selectedGroupIds.value = [];
    selectedLearnerIds.value = [];
    originalGroupIds.value = [];
    originalLearnerIds.value = [];
    courseSessionVisible.value = false;
  };

  // Initial fetch of courses
  coursesFetch.fetchData();

  watch(searchKeywords, () => {
    coursesFetch.fetchData();
  });

  const composableApi = {
    classId,
    isLoading,
    searchKeywords,
    coursesFetch,
    selectedCourse,
    selectedGroupIds,
    selectedLearnerIds,
    selectCourse,
    courseSessionId,
    hasRecipientChanges,
    setCourseVisibility,
    setExistingAssignment,
    resetAssignment,
    assignCourse,
  };

  provide('assignCourseClassId', classId);
  provide('assignCourseIsLoading', isLoading);
  provide('assignCourseSearchKeywords', searchKeywords);
  provide('assignCourseCoursesFetch', coursesFetch);
  provide('assignCourseSelectedCourse', selectedCourse);
  provide('assignCourseSelectedGroupIds', selectedGroupIds);
  provide('assignCourseSelectedLearnerIds', selectedLearnerIds);
  provide('assignCourseCourseSessionId', courseSessionId);
  provide('assignCourseHasRecipientChanges', hasRecipientChanges);
  provide('assignCourseSelectCourse', selectCourse);
  provide('assignCourseSetExistingAssignment', setExistingAssignment);
  provide('assignCourseResetAssignment', resetAssignment);
  provide('assignCourseAssignCourse', assignCourse);

  return composableApi;
}

/**
 * @typedef {import('kolibri-common/composables/useFetch.js').FetchObject} FetchObject
 */

/**
 * @typedef {object} AssignCourseInjectObject
 * @property {import('vue').Ref<string>} classId - The id of the class to which the course will
 * be assigned.
 * @property {import('vue').Ref<string>} searchKeywords - The keywords used to search for courses.
 * @property {FetchObject} coursesFetch - The useFetch object for fetching courses.
 * @property {import('vue').Ref<?object>} selectedCourse - The currently selected course.
 * @property {import('vue').Ref<string|null>} courseSessionId - The id of the course session being
 * edited, or null when creating a new assignment.
 * @property {import('vue').Ref<Array<string>>} selectedGroupIds - The ids of the selected groups
 * to assign the course to.
 * @property {import('vue').Ref<Array<string>>} selectedLearnerIds - The ids of the selected
 * learners to assign the course to.
 * @property {import('vue').ComputedRef<boolean>} hasRecipientChanges - True when selected
 * recipients differ from the snapshot taken at edit-session start.
 * @property {(course: object) => void} selectCourse - Method to set the `selectedCourse` ref.
 * @property {(courseSession: object) => void} setExistingAssignment - Populate state from an
 * existing course session for editing.
 * @property {() => void} resetAssignment - Reset all assignment state to initial empty values.
 * @property {() => Promise<object>} assignCourse - Method to assign the selected course to
 * the selected learners and groups.
 */

/**
 * Inject the assign-course composable API provided by an ancestor `useAssignCourse` call.
 * @returns {AssignCourseInjectObject} The injected composable API.
 */
export function injectAssignCourse() {
  return {
    classId: inject('assignCourseClassId'),
    searchKeywords: inject('assignCourseSearchKeywords'),
    coursesFetch: inject('assignCourseCoursesFetch'),
    selectedCourse: inject('assignCourseSelectedCourse'),
    selectedGroupIds: inject('assignCourseSelectedGroupIds'),
    selectedLearnerIds: inject('assignCourseSelectedLearnerIds'),
    selectCourse: inject('assignCourseSelectCourse'),
    courseSessionId: inject('assignCourseCourseSessionId'),
    hasRecipientChanges: inject('assignCourseHasRecipientChanges'),
    setExistingAssignment: inject('assignCourseSetExistingAssignment'),
    resetAssignment: inject('assignCourseResetAssignment'),
    assignCourse: inject('assignCourseAssignCourse'),
  };
}
