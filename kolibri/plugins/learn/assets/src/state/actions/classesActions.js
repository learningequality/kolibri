import { ClassesPageNames } from '../../constants';
import { LearnerClassroomResource, LearnerLessonResource } from '../../apiResources';
import { ContentNodeResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('classesPageTitles', {
  allClasses: 'All classes',
  classAssignments: 'Class assignments',
  lessonContents: 'Lesson contents',
});

function preparePage(store, params) {
  const { pageName, title, initialState } = params;
  store.dispatch('SET_PAGE_NAME', pageName);
  store.dispatch('CORE_SET_TITLE', title);
  store.dispatch('SET_PAGE_STATE', initialState);
  store.dispatch('CORE_SET_PAGE_LOADING', true);
}

// Shows a list of all the Classrooms a Learner is enrolled in
export function showAllClassesPage(store) {
  preparePage(store, {
    pageName: ClassesPageNames.ALL_CLASSES,
    title: translator.$tr('allClasses'),
    initialState: {
      classrooms: [],
    },
  });
  return LearnerClassroomResource.getCollection({ no_assignments: true })
    .fetch()
    .then(classrooms => {
      store.dispatch('SET_LEARNER_CLASSROOMS', classrooms);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

// For a given Classroom, shows a list of all Exams and Lessons assigned to the Learner
export function showClassAssignmentsPage(store, classId) {
  preparePage(store, {
    pageName: ClassesPageNames.CLASS_ASSIGNMENTS,
    title: translator.$tr('classAssignments'),
    initialState: {
      currentClassroom: {},
    },
  });
  // Force fetch, so it doesn't re-use the assignments-less version in the cache
  return LearnerClassroomResource.getModel(classId)
    .fetch({}, true)
    ._promise.then(classroom => {
      store.dispatch('SET_CURRENT_CLASSROOM', classroom);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      // TODO Handle 404
      console.log(error); // eslint-disable-line
    });
}

function getAllLessonContentNodes(lessonResources) {
  return Promise.all(
    lessonResources.map(resource => ContentNodeResource.getModel(resource.contentnode_id).fetch())
  );
}

// For a given Lesson, shows a "playlist" of all the resources in the Lesson
export function showLessonPlaylist(store, { lessonId }) {
  preparePage(store, {
    pageName: ClassesPageNames.LESSON_PLAYLIST,
    title: translator.$tr('lessonContents'),
    initialState: {
      currentLesson: {},
      contentNodes: [],
    },
  });
  return LearnerLessonResource.getModel(lessonId)
    .fetch({}, true)
    ._promise.then(lesson => {
      store.dispatch('SET_CURRENT_LESSON', lesson);
      return getAllLessonContentNodes(lesson.resources);
    })
    .then(contentNodes => {
      store.dispatch('SET_LESSON_CONTENTNODES', contentNodes);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      console.log(error); // eslint-disable-line
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
  preparePage(store, {
    pageName: ClassesPageNames.LESSON_RESOURCE_VIEWER,
    title: translator.$tr('lessonContents'),
    initialState: {
      currentLesson: {},
      currentLessonResource: {},
      nextLessonResource: {},
    },
  });
  return LearnerLessonResource.getModel(lessonId)
    .fetch({}, true)
    ._promise.then(lesson => {
      store.dispatch('SET_CURRENT_LESSON', lesson);
      const currentResource = lesson.resources[resourceNumber];
      if (!currentResource) {
        return Promise.reject();
      }
      const nextResource = lesson.resources[resourceNumber + 1];
      return getAllLessonContentNodes([currentResource, nextResource].filter(x => x));
    })
    .then(resources => {
      store.dispatch('SET_CURRENT_AND_NEXT_LESSON_RESOURCES', resources);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    })
    .catch(error => {
      console.log(error); // eslint-disable-line
    });
}
