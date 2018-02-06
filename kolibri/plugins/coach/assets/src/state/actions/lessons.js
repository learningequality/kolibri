import { LessonsPageNames } from '../../lessonsConstants';
import { setClassState } from './main';
import { LearnerGroupResource, LessonResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';

const translator = createTranslator('lessonsPageTitles', {
  lessons: 'Lessons',
  selectResources: 'Select resources',
});

export function showLessonRootPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    lessons: [],
    learnerGroups: [],
  });
  const loadRequirements = [
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    updateLessons(store, classId),
    setClassState(store, classId),
  ];
  return Promise.all(loadRequirements).then(
    ([learnerGroups]) => {
      store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
      store.dispatch('SET_PAGE_NAME', LessonsPageNames.ROOT);
      store.dispatch('CORE_SET_TITLE', translator.$tr('lessons'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  );
}

export function updateLessons(store, classId) {
  return LessonResource.getCollection({ collection: classId })
    .fetch({}, true)
    ._promise.then(lessons => {
      store.dispatch('SET_CLASS_LESSONS', lessons);
    });
}

export function showLessonSummaryPage(store, classId, lessonId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    currentLesson: {},
  });

  const loadRequirements = [
    LessonResource.getModel(lessonId).fetch(),
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    setClassState(store, classId),
  ];

  Promise.all(loadRequirements).then(([lesson, learnerGroups]) => {
    store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
    store.dispatch('SET_CURRENT_LESSON', lesson);
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    store.dispatch('SET_PAGE_NAME', LessonsPageNames.SUMMARY);
    store.dispatch('CORE_SET_TITLE', lesson.name);
  });
}

/* eslint-disable*/
export function showLessonResourceSummaryPage(store, classId, lessonId, contentId) {}

export function showLessonResourceUserSummaryPage(store, classId, lessonId, contentId, userId) {}

export function showLessonReviewPage(store, classId, lessonId) {}

export function showLessonResourceSelectionRootPage(store, classId, lessonId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    currentLesson: lessonId,
  });
  const loadRequirements = [
    LearnerGroupResource.getCollection({ parent: classId }).fetch(),
    updateLessons(store, classId),
    setClassState(store, classId),
  ];
  return Promise.all(loadRequirements).then(
    ([learnerGroups]) => {
      store.dispatch('SET_LEARNER_GROUPS', learnerGroups);
      store.dispatch('SET_PAGE_NAME', LessonsPageNames.SELECTION_ROOT);
      store.dispatch('CORE_SET_TITLE', translator.$tr('selectResources'));
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    }
  );
}

export function showLessonSelectionTopicPage(store, classId, lessonId, topicId) {}

export function showLessonSelectionSearchPage(store, classId, lessonId, searchTerm) {}

export function showLessonContentPreview(store, classId, lessonId, contentId) {}
