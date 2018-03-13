import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import {
  showCreateExamPage,
  showExamReportDetailPage,
  showExamReportPage,
  showExamsPage,
} from '../state/actions/exam';

export default [
  {
    name: PageNames.EXAMS,
    path: '/:classId/exams',
    handler: toRoute => {
      showExamsPage(store, toRoute.params.classId);
    },
  },
  {
    name: PageNames.CREATE_EXAM,
    path: '/:classId/exams/new/',
    handler: toRoute => {
      showCreateExamPage(store, toRoute.params.classId);
    },
  },
  {
    name: PageNames.EXAM_REPORT,
    path: '/:classId/exams/:examId',
    handler: toRoute => {
      showExamReportPage(store, toRoute.params.classId, toRoute.params.examId);
    },
  },
  {
    name: PageNames.EXAM_REPORT_DETAIL_ROOT,
    path: '/:classId/exams/:examId/users/:userId',
    redirect: '/:classId/exams/:examId/users/:userId/0/0',
  },
  {
    name: PageNames.EXAM_REPORT_DETAIL,
    path: '/:classId/exams/:examId/users/:userId/:question/:interaction',
    handler: toRoute => {
      showExamReportDetailPage(
        store,
        toRoute.params.classId,
        toRoute.params.userId,
        toRoute.params.examId,
        toRoute.params.question,
        toRoute.params.interaction
      );
    },
  },
];
