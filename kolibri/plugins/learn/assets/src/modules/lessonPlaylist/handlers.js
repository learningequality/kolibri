import {
  ContentNodeResource,
  ContentNodeSlimResource,
  ContentNodeProgressResource,
} from 'kolibri.resources';
import { LearnerLessonResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

// For a given Lesson, shows a "playlist" of all the resources in the Lesson
export function showLessonPlaylist(store, { lessonId }) {
  return store.dispatch('loading').then(() => {
    return LearnerLessonResource.fetchModel({ id: lessonId })
      .then(lesson => {
        store.commit('SET_PAGE_NAME', ClassesPageNames.LESSON_PLAYLIST);
        store.commit('lessonPlaylist/SET_CURRENT_LESSON', lesson);
        if (lesson.resources.length) {
          return ContentNodeSlimResource.fetchCollection({
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
        // Only load contentnode progress if the user is logged in
        if (store.getters.isUserLoggedIn) {
          const contentNodeIds = contentNodes.map(({ id }) => id);
          if (contentNodeIds.length > 0) {
            ContentNodeProgressResource.fetchCollection({
              getParams: { ids: contentNodeIds },
            }).then(progresses => {
              store.commit('lessonPlaylist/SET_LESSON_CONTENTNODES_PROGRESS', progresses);
            });
          }
        }
        store.dispatch('notLoading');
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}

/**
 * For a given Lesson and ContentNode Resource, render the ContentNode, and provide
 * links to the Lesson, and the next Resource
 * @param {string} params.lessonId -
 * @param {string} params.resourceNumber - 0-based index to specify a Resource in
 *   the Lesson Playlist
 *
 */
export function showLessonResourceViewer(store, { lessonId, resourceNumber }) {
  return store.dispatch('loading').then(() => {
    store.commit('SET_PAGE_NAME', ClassesPageNames.LESSON_RESOURCE_VIEWER);
    return LearnerLessonResource.fetchModel({ id: lessonId })
      .then(lesson => {
        const index = Number(resourceNumber);
        store.commit('lessonPlaylist/resource/SET_CURRENT_LESSON', lesson);
        const currentResource = lesson.resources[index];
        if (!currentResource) {
          return Promise.reject(`Lesson does not have a resource at index ${index}.`);
        }
        const nextResource = lesson.resources[index + 1];
        const nextResourcePromise = nextResource
          ? ContentNodeSlimResource.fetchModel({
              id: nextResource.contentnode_id,
            })
          : Promise.resolve();
        return Promise.all([
          ContentNodeResource.fetchModel({ id: currentResource.contentnode_id }),
          nextResourcePromise,
        ]).then(resources => {
          store.commit('lessonPlaylist/resource/SET_CURRENT_AND_NEXT_LESSON_RESOURCES', resources);
          store.dispatch('notLoading');
        });
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}
