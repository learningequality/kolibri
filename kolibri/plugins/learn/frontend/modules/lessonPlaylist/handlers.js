import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
import useUser from 'kolibri/composables/useUser';
import { handleApiError } from 'kolibri/utils/appError';
import { get } from '@vueuse/core';
import { pageLoading } from 'kolibri-common/composables/usePageLoading';
import useContentNodeProgress from '../../composables/useContentNodeProgress';
import { LearnerLessonResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

const { fetchContentNodeProgress } = useContentNodeProgress();

// For a given Lesson, shows a "playlist" of all the resources in the Lesson
export function showLessonPlaylist(store, { lessonId }) {
  pageLoading.value = true;
  // Only load contentnode progress if the user is logged in
  const { isUserLoggedIn } = useUser();
  if (get(isUserLoggedIn)) {
    fetchContentNodeProgress({ lesson: lessonId });
  }
  const contentNodePromise = ContentNodeResource.fetchLessonResources(lessonId);
  return LearnerLessonResource.fetchModel({ id: lessonId })
    .then(lesson => {
      store.commit('SET_PAGE_NAME', ClassesPageNames.LESSON_PLAYLIST);
      store.commit('lessonPlaylist/SET_CURRENT_LESSON', lesson);
      if (lesson.resources.length) {
        return contentNodePromise;
      }
      return Promise.resolve([]);
    })
    .then(contentNodes => {
      const contentNodesMap = {};
      for (const node of contentNodes) {
        contentNodesMap[node.id] = node;
      }
      store.commit('lessonPlaylist/SET_LESSON_CONTENTNODES', contentNodesMap);
      pageLoading.value = false;
    })
    .catch(error => {
      pageLoading.value = false;
      handleApiError({ error, reloadOnReconnect: true });
    });
}
