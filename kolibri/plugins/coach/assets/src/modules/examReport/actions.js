import { ExamResource } from 'kolibri.resources';
import { createTranslator } from 'kolibri.utils.i18n';
import router from 'kolibri.coreVue.router';
import { PageNames } from '../../constants';
import { _createExam, _examState } from '../shared/exams';

export function setExamsModal(store, modalName) {
  store.commit('SET_EXAMS_MODAL', modalName);
}

const snackbarTranslator = createTranslator('ExamReportSnackbarTexts', {
  changesToExamSaved: 'Changes to exam saved',
  copiedExamToClass: 'Copied exam to { className }',
  examDeleted: 'Exam deleted',
  examIsNowActive: 'Exam is now active',
  examIsNowInactive: 'Exam is now inactive',
});

function updateExamStatus(store, { examId, isActive }) {
  return ExamResource.saveModel({
    id: examId,
    data: { active: isActive },
  }).then(
    () => {
      store.commit('SET_EXAM_STATUS', { examId, isActive });
      store.dispatch('setExamsModal', false);
      store.dispatch(
        'createSnackbar',
        {
          text: snackbarTranslator.$tr(isActive ? 'examIsNowActive' : 'examIsNowInactive'),
          autoDismiss: true,
        },
        { root: true }
      );
    },
    error => store.dispatch('handleError', error, { root: true })
  );
}

export function activateExam(store, examId) {
  return updateExamStatus(store, { examId, isActive: true });
}

export function deactivateExam(store, examId) {
  return updateExamStatus(store, { examId, isActive: false });
}

export function copyExam(store, { exam, className }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  _createExam(store, exam).then(
    () => {
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
    },
    error => store.dispatch('handleApiError', error, { root: true })
  );
}

export function updateExamDetails(store, { examId, payload }) {
  store.commit('CORE_SET_PAGE_LOADING', true, { root: true });
  return new Promise((resolve, reject) => {
    ExamResource.saveModel({
      id: examId,
      data: payload,
    }).then(
      exam => {
        const exams = store.state.exams;
        const examIndex = exams.findIndex(exam => exam.id === examId);
        exams[examIndex] = _examState(exam);

        store.commit('SET_EXAMS', exams);
        store.dispatch('setExamsModal', false);
        store.dispatch(
          'createSnackbar',
          {
            text: snackbarTranslator.$tr('changesToExamSaved'),
            autoDismiss: true,
          },
          { root: true }
        );
        store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
        resolve();
      },
      error => {
        store.commit('CORE_SET_PAGE_LOADING', false, { root: true });
        reject(error);
      }
    );
  });
}

export function deleteExam(store, examId) {
  return ExamResource.deletModel({ id: examId }).then(
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
