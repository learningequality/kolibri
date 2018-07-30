import {
  ClassroomResource,
  ContentNodeProgressResource,
  ContentNodeResource,
  ContentNodeSlimResource,
} from 'kolibri.resources';
import { LearnerClassroomResource, LearnerLessonResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

// WARNING: Only call  _after_ to allow the previous page (often `content-page`)
// to finish destruction with the expected state in place
function preparePage(store, params) {
  const { pageName, initialState } = params;
  store.commit('SET_PAGE_NAME', pageName);
  store.commit('SET_PAGE_STATE', initialState);
}

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  return store.dispatch('loading').then(() => {
    // set pageState _after_ to allow the previous page (often `content-page`)
    // to finish destruction with the expected state in place
    preparePage(store, {
      pageName: ClassesPageNames.ALL_CLASSES,
      initialState: {
        classrooms: [],
      },
    });

    return ClassroomResource.fetchCollection()
      .then(classrooms => {
        store.commit('SET_LEARNER_CLASSROOMS', classrooms);
        store.dispatch('notLoading');
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  return store.dispatch('loading').then(() => {
    // set pageState _after_ to allow the previous page (often `content-page`)
    // to finish destruction with the expected state in place
    preparePage(store, {
      pageName: ClassesPageNames.CLASS_ASSIGNMENTS,
      initialState: {
        currentClassroom: {},
      },
    });
    return LearnerClassroomResource.fetchModel({ id: classId })
      .then(classroom => {
        store.commit('SET_CURRENT_CLASSROOM', classroom);
        store.dispatch('notLoading');
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}

// For a given Lesson, shows a "playlist" of all the resources in the Lesson
export function showLessonPlaylist(store, { lessonId }) {
  return store.dispatch('loading').then(() => {
    // set pageState _after_ to allow the previous page (often `content-page`)
    // to finish destruction with the expected state in place
    preparePage(store, {
      pageName: ClassesPageNames.LESSON_PLAYLIST,
      initialState: {
        currentLesson: {},
        contentNodes: [],
      },
    });
    return LearnerLessonResource.fetchModel({ id: lessonId })
      .then(lesson => {
        store.commit('SET_CURRENT_LESSON', lesson);
        return ContentNodeSlimResource.fetchCollection({ getParams: { in_lesson: lesson.id } });
      })
      .then(contentNodes => {
        store.commit('SET_LESSON_CONTENTNODES', contentNodes);
        // Only load contentnode progress if the user is logged in
        if (store.getters.isUserLoggedIn) {
          const contentNodeIds = contentNodes.map(({ id }) => id);

          if (contentNodeIds.length > 0) {
            ContentNodeProgressResource.fetchCollection({
              getParams: { ids: contentNodeIds },
            }).then(progresses => {
              store.commit('SET_LESSON_CONTENTNODES_PROGRESS', progresses);
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
    // set pageState _after_ to allow the previous page (often `content-page`)
    // to finish destruction with the expected state in place
    preparePage(store, {
      pageName: ClassesPageNames.LESSON_RESOURCE_VIEWER,
      initialState: {
        currentLesson: {},
        // To match expected shape for content-page
        content: {},
      },
    });
    return LearnerLessonResource.fetchModel({ id: lessonId })
      .then(lesson => {
        const index = Number(resourceNumber);
        store.commit('SET_CURRENT_LESSON', lesson);
        const currentResource = lesson.resources[index];
        if (!currentResource) {
          return Promise.reject(`Lesson does not have a resource at index ${index}.`);
        }
        const nextResource = lesson.resources[index + 1];
        const nextResourcePromise = nextResource
          ? ContentNodeSlimResource.fetchModel({
              id: nextResource.contentnode_id,
              getParams: { in_lesson: lesson.id },
            })
          : Promise.resolve();
        return Promise.all([
          ContentNodeResource.fetchModel({ id: currentResource.contentnode_id }),
          nextResourcePromise,
        ]).then(resources => {
          store.commit('SET_CURRENT_AND_NEXT_LESSON_RESOURCES', resources);
          store.dispatch('notLoading');
        });
      })
      .catch(error => {
        return store.dispatch('handleApiError', error);
      });
  });
}
