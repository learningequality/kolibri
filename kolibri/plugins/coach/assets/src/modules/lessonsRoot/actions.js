import LessonResource from 'kolibri-common/apiResources/LessonResource';
import router from 'kolibri/router';
import { createTranslator } from 'kolibri/utils/i18n';
import useSnackbar from 'kolibri/composables/useSnackbar';
import { PageNames } from '../../constants';

const translator = createTranslator('LessonRootActionTexts', {
  newLessonCreated: {
    message: 'New lesson created',
    context: 'Notification that a new lesson has been created.',
  },
});

export function refreshClassLessons(store, classId) {
  return LessonResource.fetchCollection({
    getParams: { collection: classId },
    force: true,
  })
    .then(lessons => {
      // Fetch lesson sizes before commiting new lessons
      // so that they can be commited together with their sizes.
      // Fixes https://github.com/learningequality/kolibri/issues/10797
      if (Object.keys(lessons).length > 0) {
        return store.dispatch('fetchLessonsSizes', classId, false).then(sizes => {
          return { lessons, sizes };
        });
      } else {
        return { lessons, sizes: null };
      }
    })
    .then(({ lessons, sizes }) => {
      store.commit('SET_CLASS_LESSONS', lessons);
      if (sizes) {
        store.commit('SET_CLASS_LESSONS_SIZES', sizes);
      }
      // resolve lessons in case it's needed
      return lessons;
    })
    .catch(error => {
      return store.dispatch('handleApiError', { error }, { root: true });
    });
}

export function fetchLessonsSizes(store, classId, shouldCommit = true) {
  return LessonResource.fetchLessonsSizes({ collection: classId })
    .then(sizes => {
      if (shouldCommit) {
        store.commit('SET_CLASS_LESSONS_SIZES', sizes);
      }
      return sizes;
    })
    .catch(error => {
      return store.dispatch('handleApiError', { error }, { root: true });
    });
}

export function createLesson(store, { classId, payload }) {
  return new Promise((resolve, reject) => {
    const data = {
      ...payload,
      collection: classId,
    };
    return LessonResource.saveModel({
      data,
    })
      .then(newLesson => {
        const { createSnackbar } = useSnackbar();
        createSnackbar(translator.$tr('newLessonCreated'));
        // Update the class summary now that we have a new lesson in town!
        store.dispatch('classSummary/refreshClassSummary', null, { root: true }).then(() => {
          router.push({
            name: PageNames.LESSON_SUMMARY,
            params: {
              classId,
              lessonId: newLesson.id,
            },
          });
          resolve();
        });
      })
      .catch(error => {
        reject(error);
      });
  });
}
