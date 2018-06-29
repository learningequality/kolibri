import { ContentNodeResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { handleApiError } from 'kolibri.coreVue.vuex.actions';
import { LearnerClassroomResource, LearnerLessonResource } from '../../apiResources';
import { ClassesPageNames } from '../../constants';

const translator = createTranslator('classesPageTitles', {
  allClasses: 'All classes',
  classAssignments: 'Class assignments',
  lessonContents: 'Lesson contents',
});

// WARNING: Only call  _after_ to allow the previous page (often `content-page`)
// to finish destruction with the expected state in place
function preparePage(store, params) {
  const { pageName, title, initialState } = params;
  store.dispatch('SET_PAGE_NAME', pageName);
  store.dispatch('CORE_SET_TITLE', title || '');
  store.dispatch('SET_PAGE_STATE', initialState);
}

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  return LearnerClassroomResource.getCollection({ no_assignments: true })
    .fetch()
    ._promise.then(classrooms => {
      // set pageState _after_ to allow the previous page (often `content-page`)
      // to finish destruction with the expected state in place
      preparePage(store, {
        pageName: ClassesPageNames.ALL_CLASSES,
        title: translator.$tr('allClasses'),
        initialState: {
          classrooms: [],
        },
      });
      store.dispatch('SET_LEARNER_CLASSROOMS', classrooms);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      return handleApiError(store, error);
    });
}

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  // Force fetch, so it doesn't re-use the assignments-less version in the cache
  return LearnerClassroomResource.getModel(classId)
    .fetch({}, true)
    ._promise.then(classroom => {
      // set pageState _after_ to allow the previous page (often `content-page`)
      // to finish destruction with the expected state in place
      preparePage(store, {
        pageName: ClassesPageNames.CLASS_ASSIGNMENTS,
        title: translator.$tr('classAssignments'),
        initialState: {
          currentClassroom: {},
        },
      });
      store.dispatch('SET_CURRENT_CLASSROOM', classroom);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      return handleApiError(store, error);
    });
}

function getAllLessonContentNodes(lessonResources) {
  return Promise.all(
    lessonResources.map(resource => ContentNodeResource.getModel(resource.contentnode_id).fetch())
  );
}

// For a given Lesson, shows a "playlist" of all the resources in the Lesson
export function showLessonPlaylist(store, { lessonId }) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);

  return LearnerLessonResource.getModel(lessonId)
    .fetch({}, true)
    ._promise.then(lesson => {
      // set pageState _after_ to allow the previous page (often `content-page`)
      // to finish destruction with the expected state in place
      preparePage(store, {
        pageName: ClassesPageNames.LESSON_PLAYLIST,
        title: translator.$tr('lessonContents'),
        initialState: {
          currentLesson: {},
          contentNodes: [],
        },
      });
      store.dispatch('SET_CURRENT_LESSON', lesson);
      return ContentNodeResource.getCollection({ in_lesson: lesson.id }).fetch();
    })
    .then(contentNodes => {
      store.dispatch('SET_LESSON_CONTENTNODES', contentNodes);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      return handleApiError(store, error);
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
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  return LearnerLessonResource.getModel(lessonId)
    .fetch({}, true)
    ._promise.then(lesson => {
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
      const index = Number(resourceNumber);
      store.dispatch('SET_CURRENT_LESSON', lesson);
      const currentResource = lesson.resources[index];
      if (!currentResource) {
        return Promise.reject(`Lesson does not have a resource at index ${index}.`);
      }
      const nextResource = lesson.resources[index + 1];
      return getAllLessonContentNodes([currentResource, nextResource].filter(Boolean));
    })
    .then(resources => {
      store.dispatch('CORE_SET_TITLE', resources[0].title);
      store.dispatch('SET_CURRENT_AND_NEXT_LESSON_RESOURCES', resources);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      return handleApiError(store, error);
    });
}
