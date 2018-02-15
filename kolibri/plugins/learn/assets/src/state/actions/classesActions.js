import { ClassesPageNames } from '../../constants';
import { LearnerClassroomResource } from '../../apiResources';
import { ContentNodeResource, LessonResource } from 'kolibri.resources';
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
  return LessonResource.getModel(lessonId)
    .fetch({}, true)
    ._promise.then(lesson => {
      store.dispatch('SET_CURRENT_LESSON', lesson);
      return getAllLessonContentNodes(lesson.resources);
    })
    .then(contentNodes => {
      store.dispatch('SET_LESSON_CONTENTNODES', contentNodes);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}
