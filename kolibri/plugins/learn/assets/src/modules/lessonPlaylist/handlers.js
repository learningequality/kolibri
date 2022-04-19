import { ContentNodeResource } from 'kolibri.resources';
import useContentNodeProgress from '../../composables/useContentNodeProgress';
import { LearnerLessonResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

const { fetchContentNodeProgress } = useContentNodeProgress();

// For a given Lesson, shows a "playlist" of all the resources in the Lesson
export function showLessonPlaylist(store, { lessonId }) {
  return store.dispatch('loading').then(() => {
    // Only load contentnode progress if the user is logged in
    if (store.getters.isUserLoggedIn) {
      fetchContentNodeProgress({ lesson: lessonId });
    }
    return LearnerLessonResource.fetchModel({ id: lessonId })
      .then(lesson => {
        store.commit('SET_PAGE_NAME', ClassesPageNames.LESSON_PLAYLIST);
        store.commit('lessonPlaylist/SET_CURRENT_LESSON', lesson);
        if (lesson.resources.length) {
          return ContentNodeResource.fetchCollection({
            getParams: {
              ids: lesson.resources.map(resource => resource.contentnode_id),
            },
          });
        }
        return Promise.resolve([]);
      })
      .then(contentNodes => {
        const sortedContentNodes = contentNodes.sort((a, b) => {
          const lesson = store.state.lessonPlaylist.currentLesson;
          const aKey = lesson.resources.findIndex(resource => resource.contentnode_id === a.id);
          const bKey = lesson.resources.findIndex(resource => resource.contentnode_id === b.id);
          return aKey - bKey;
        });
        store.commit('lessonPlaylist/SET_LESSON_CONTENTNODES', sortedContentNodes);
        store.dispatch('notLoading');
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}
