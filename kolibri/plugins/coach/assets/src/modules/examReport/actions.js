import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { ExamResource, ExamLogResource, FacilityUserResource } from 'kolibri.resources';
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
  return new Promise(resolve => {
    createExam(store, exam).then(
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
        resolve(exam);
      },
      error => store.dispatch('handleApiError', error, { root: true })
    );
  });
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

export function setTableData(store, params) {
  const { examId, classId } = params;
  const { learnerGroups } = store.state;
  const isSamePage = params.isSamePage || samePageCheckGenerator(store);
  const promises = [
    ExamLogResource.fetchCollection({
      getParams: { exam: examId, collection: classId },
      force: true,
    }),
    FacilityUserResource.fetchCollection({ getParams: { member_of: classId } }),
  ];
  return Promise.all(promises).then(([examLogs, facilityUsers]) => {
    const examReportData = facilityUsers.map(user => {
      const examTakenByUser = examLogs.find(examLog => String(examLog.user) === user.id) || {};
      const learnerGroup = learnerGroups.find(group => group.user_ids.indexOf(user.id) > -1) || {};
      return {
        id: user.id,
        name: user.full_name,
        group: learnerGroup,
        score: examTakenByUser.score,
        progress: examTakenByUser.progress,
        closed: examTakenByUser.closed,
      };
    });
    if (isSamePage()) {
      store.commit('SET_EXAM_REPORT_TABLE_DATA', examReportData);
    }
  });
}
