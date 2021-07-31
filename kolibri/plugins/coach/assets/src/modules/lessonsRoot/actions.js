import { LessonResource } from 'kolibri.resources';
import router from 'kolibri.coreVue.router';
import { createTranslator } from 'kolibri.utils.i18n';
import { lessonSummaryLink } from '../../routes/planLessonsRouterUtils';

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
      store.commit('SET_CLASS_LESSONS', lessons);
      // resolve lessons in case it's needed
      return lessons;
    })
    .catch(error => {
      return store.dispatch('handleApiError', error, { root: true });
    });
}

export function createLesson(store, { classId, payload }) {
  return new Promise((resolve, reject) => {
    const lesson_assignments = payload.assignments;
    delete payload.assignments;
    const data = {
      ...payload,
      lesson_assignments,
      collection: classId,
    };
    return LessonResource.saveModel({
      data,
    })
      .then(newLesson => {
        store.dispatch('createSnackbar', translator.$tr('newLessonCreated'), { root: true });
        // Update the class summary now that we have a new lesson in town!
        store.dispatch('classSummary/refreshClassSummary', null, { root: true }).then(() => {
          router.push(lessonSummaryLink({ classId, lessonId: newLesson.id }));
          resolve();
        });
      })
      .catch(error => {
        reject(error);
      });
  });
}
