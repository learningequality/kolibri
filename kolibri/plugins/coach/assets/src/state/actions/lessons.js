/* eslint-disable */
import { PageNames } from '../../constants';
import { setClassState } from './main';
import { LessonResource } from 'kolibri.resources';

function showLessonRootPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {
    lessons: [],
  });
  store.dispatch('SET_PAGE_NAME', PageNames.LESSONS.ROOT);
  setClassState(store, classId).then(
    () => updateLessons(store, classId),
    error => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      console.log(error);
    }
  );
}

function updateLessons(store, classId) {
  return LessonResource.getCollection({ collection: classId })
    .fetch({}, true)
    ._promise.then(lessons => {
      store.dispatch('SET_CLASS_LESSONS', lessons);
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    });
}

function showLessonSummaryPage(store, classId, lessonId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_STATE', {});

  const loadRequirements = [
    LessonResource.getModel(lessonId).fetch(),
    setClassState(store, classId),
  ];

  Promise.all(loadRequirements).then(([lesson]) => {
    store.dispatch('SET_CURRENT_LESSON', lesson);
    store.dispatch('CORE_SET_PAGE_LOADING', false);
    console.log('LESSON SUMMARY PAGE YO');
    store.dispatch('SET_PAGE_NAME', PageNames.LESSONS.SUMMARY);
  });
}

function showLessonResourceSummaryPage(store, classId, lessonId, contentId) {
  console.log('test');
}

function showLessonResourceUserSummaryPage(store, classId, lessonId, contentId, userId) {
  console.log('test');
}

function showLessonReviewPage(store, classId, lessonId) {
  console.log('test');
}

function showLessonSelectionPage(store, classId, lessonId) {
  console.log('test');
}

function showLessonSelectionTopicPage(store, classId, lessonId, topicId) {
  console.log('test');
}

function showLessonSelectionSearchPage(store, classId, lessonId, searchTerm) {
  console.log('test');
}

function showLessonContentPreview(store, classId, lessonId, contentId) {
  console.log('test');
}

export {
  showLessonRootPage,
  showLessonSummaryPage,
  showLessonResourceSummaryPage,
  showLessonResourceUserSummaryPage,
  showLessonReviewPage,
  showLessonSelectionPage,
  showLessonSelectionTopicPage,
  showLessonSelectionSearchPage,
  showLessonContentPreview,
  updateLessons,
};
