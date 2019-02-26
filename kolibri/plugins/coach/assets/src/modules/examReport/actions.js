import { ExamResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../../constants';
import { createExam, examState } from '../examShared/exams';

export function setExamsModal(store, modalName) {
  store.commit('SET_EXAMS_MODAL', modalName);
}

const snackbarTranslator = createTranslator('ExamReportSnackbarTexts', {
  changesToExamSaved: 'Changes to quiz saved',
  copiedExamToClass: 'Copied quiz to { className }',
  examDeleted: 'Quiz deleted',
  examIsNowActive: 'Quiz is now active',
  examIsNowInactive: 'Quiz is now inactive',
});

export function copyExam(store, { exam, className }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  return new Promise(resolve => {
    createExam(store, exam).then(
      newExam => {
        store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
        store.dispatch('setExamsModal', false);
        store.dispatch(
          'createSnackbar',
          {
            text: snackbarTranslator.$tr('copiedExamToClass', { className }),
            autoDismiss: true,
          },
          { root: true }
        );
        store.commit('examsRoot/ADD_EXAM', newExam, { root: true });
        resolve(newExam);
      },
      error => store.dispatch('handleApiError', error, { root: true })
    );
  });
}

export function updateExamDetails(store, { examId, payload }) {
  return new Promise((resolve, reject) => {
    ExamResource.saveModel({
      id: examId,
      data: payload,
    }).then(
      exam => {
        const exams = store.state.exams;
        const examIndex = exams.findIndex(exam => exam.id === examId);
        exams[examIndex] = examState(exam);

        store.commit('SET_EXAMS', exams);
        // Update state.exam if it was just saved.
        // Is this necessary? Where is state.exams used?
        if (store.state.exam.id === exam.id) {
          store.commit('SET_EXAM', exam);
        }
        store.dispatch('setExamsModal', false);
        store.dispatch(
          'createSnackbar',
          {
            text: snackbarTranslator.$tr('changesToExamSaved'),
            autoDismiss: true,
          },
          { root: true }
        );
        resolve();
      },
      error => {
        reject(error);
      }
    );
  });
}

export function deleteExam(store, examId) {
  return ExamResource.deleteModel({ id: examId }).then(
    () => {
      const exams = store.state.exams;
      const updatedExams = exams.filter(exam => exam.id !== examId);
      store.commit('SET_EXAMS', updatedExams);

      router.replace({ name: PageNames.EXAMS });
      store.dispatch(
        'createSnackbar',
        {
          text: snackbarTranslator.$tr('examDeleted'),
          autoDismiss: true,
        },
        { root: true }
      );
      store.dispatch('setExamsModal', false);
    },
    error => store.dispatch('handleError', error, { root: true })
  );
}
