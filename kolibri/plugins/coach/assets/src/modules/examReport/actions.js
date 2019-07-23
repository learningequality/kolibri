import { ExamResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import { createExam } from '../examShared/exams';

const snackbarTranslator = createTranslator('ExamReportSnackbarTexts', {
  changesToExamSaved: 'Changes to quiz saved',
  copiedExamToClass: 'Copied quiz to { className }',
});

function showSnackbar(store, string) {
  return store.dispatch('createSnackbar', string, { root: true });
}

export function copyExam(store, { exam, className }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  return new Promise((resolve, reject) => {
    createExam(store, exam).then(newExam => {
      store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
      showSnackbar(store, snackbarTranslator.$tr('copiedExamToClass', { className }));
      store.commit('examsRoot/ADD_EXAM', newExam, { root: true });
      resolve(newExam);
    }, reject);
  });
}

export function updateExamDetails(store, { examId, payload }) {
  return new Promise((resolve, reject) => {
    ExamResource.saveModel({
      id: examId,
      data: payload,
    }).then(
      () => {
        // Update state.exam if it was just saved.
        // Is this necessary? Where is state.exams used?
        showSnackbar(store, snackbarTranslator.$tr('changesToExamSaved'));
        resolve();
      },
      error => {
        reject(error);
      }
    );
  });
}
