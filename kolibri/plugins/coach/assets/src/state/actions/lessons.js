import { PageNames } from '../../constants';
import { setClassState } from './main';

function showLessonRootPage(store, classId) {
  store.dispatch('CORE_SET_PAGE_LOADING', true);
  store.dispatch('SET_PAGE_NAME', PageNames.LESSONS.ROOT);
  setClassState(store, classId).then(
    () => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
    },
    error => {
      store.dispatch('CORE_SET_PAGE_LOADING', false);
      console.log(error);
    }
  );
}

function showLessonSummaryPage(store, classId, lessonId) {
  console.log('test');
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
};
