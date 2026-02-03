import Modalities from 'kolibri-constants/Modalities';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import CourseSessionResource from 'kolibri-common/apiResources/CourseSessionResource';
import { ref, computed, provide, inject, watch } from 'vue';
import useFetch from '../../../composables/useFetch';
import { useCourses } from '../../../composables/useCourses';

/**
 * Composable for managing the logic for the Assign Course side panel.
 * This composable will live during the lifetime of the Assign Course side panel, and
 * will be used to encapsulate all the logic related to assigning a course to learners.
 *
 * This is instantiated in the root component of the Assign Course side panel
 * and its state and methods will be passed down to child components through provide/inject.
 *
 * @param {Object} options **Required** Configuration options for the composable.
 * @param {import('vue').Ref<string>} options.classId **Required** The id of the class to which
 *                                                    the course will be assigned.
 */
export default function useAssignCourse({ classId }) {
  const searchKeywords = ref('');
  const selectedCourse = ref(null);

  const selectedGroupIds = ref([]);
  const selectedLearnerIds = ref([]);

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

  const { refreshClassCourses } = useCourses();

  const selectCourse = course => {
    selectedCourse.value = course;
  };

  const assignCourse = () => {
    return CourseSessionResource.saveModel({
      data: {
        active: false,
        collection: classId.value,
        course: selectedCourse.value.id,
        assignments: selectedGroupIds.value,
        learner_ids: selectedLearnerIds.value,
      },
    }).then(response => {
      // Refresh local course list so the new course shows immediately
      refreshClassCourses();
      return response;
    });
  };

  // Initial fetch of courses
  coursesFetch.fetchData();

  watch(searchKeywords, () => {
    coursesFetch.fetchData();
  });

  provide('assignCourseClassId', classId);
  provide('assignCourseIsLoading', isLoading);
  provide('assignCourseSearchKeywords', searchKeywords);
  provide('assignCourseCoursesFetch', coursesFetch);
  provide('assignCourseSelectedCourse', selectedCourse);
  provide('assignCourseSelectedGroupIds', selectedGroupIds);
  provide('assignCourseSelectedLearnerIds', selectedLearnerIds);
  provide('assignCourseSelectCourse', selectCourse);
  provide('assignCourseAssignCourse', assignCourse);
}

/**
 * @typedef {import('../../../composables/useFetch').FetchObject} FetchObject
 *
 * @typedef {Object} AssignCourseInjectObject
 * @property {import('vue').Ref<string>} classId The id of the class to which the course will
 *                                               be assigned.
 * @property {import('vue').Ref<string>} searchKeywords The keywords used to search for courses.
 * @property {FetchObject} coursesFetch The useFetch object for fetching courses.
 * @property {import('vue').Ref<Object|null>} selectedCourse The currently selected course.
 * @property {import('vue').Ref<Array<string>>} selectedGroupIds The ids of the selected groups
 *                                                               to assign the course to.
 * @property {import('vue').Ref<Array<string>>} selectedLearnerIds The ids of the selected learners
 *                                                                 to assign the course to.
 * @property {(course: Object) => void} selectCourse Method to set the `selectedCourse` ref.
 * @property {() => Promise<Object>} assignCourse Method to assign the selected course to the
 *                                                selected learners and groups.
 *
 * @returns {AssignCourseInjectObject} An object with properties and methods for managing
 *                                     the fetch process.
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
    assignCourse: inject('assignCourseAssignCourse'),
  };
}
