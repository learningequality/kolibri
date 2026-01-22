import Modalities from 'kolibri-constants/Modalities';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import { ref, computed, provide, inject, watch } from 'vue';
import useFetch from '../../../composables/useFetch';

/**
 * Composable for managing the logic for the Assign Course side panel.
 * This composable will be live during the lifetime of the Assign Course side panel, and
 * will be used to encapsulate all the logic related to assigning a course to learners.
 *
 * This should be instantiated in the parent component of the Assign Course side panel
 * and its state and methods will be passed down to child components through provide/inject.
 *
 * @returns {void}
 */
export default function useAssignCourse() {
  const searchKeywords = ref('');
  const selectedCourse = ref(null);

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

  // Initial fetch of courses
  coursesFetch.fetchData();

  const selectCourse = course => {
    selectedCourse.value = course;
  };

  watch(searchKeywords, () => {
    coursesFetch.fetchData();
  });

  provide('assignCourseIsLoading', isLoading);
  provide('assignCourseSearchKeywords', searchKeywords);
  provide('assignCourseCoursesFetch', coursesFetch);
  provide('assignCourseSelectedCourse', selectedCourse);
  provide('assignCourseSelectCourse', selectCourse);
}

export function injectAssignCourse() {
  return {
    isLoading: inject('assignCourseIsLoading'),
    searchKeywords: inject('assignCourseSearchKeywords'),
    coursesFetch: inject('assignCourseCoursesFetch'),
    selectedCourse: inject('assignCourseSelectedCourse'),
    selectCourse: inject('assignCourseSelectCourse'),
  };
}
