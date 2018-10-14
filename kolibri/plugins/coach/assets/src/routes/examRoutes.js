import store from 'kolibri.coreVue.vuex.store';
import { PageNames } from '../constants';
import {
  showExamCreationRootPage,
  showExamCreationTopicPage,
  showExamCreationPreviewPage,
  showExamCreationSearchPage,
} from '../modules/examCreation/handlers';
import { showExamReportDetailPage } from '../modules/examReportDetail/handlers';
import { showExamReportPage } from '../modules/examReport/handlers';
import { showExamsPage } from '../modules/examsRoot/handlers';

export default [
  {
    name: PageNames.EXAMS,
    path: '/:classId/exams',
    handler: toRoute => {
      showExamsPage(store, toRoute.params.classId);
    },
  },
  {
    name: PageNames.EXAM_CREATION_ROOT,
    path: '/:classId/exams/new/',
    handler: toRoute => {
      showExamCreationRootPage(store, toRoute.params);
    },
  },
  {
    name: PageNames.EXAM_CREATION_TOPIC,
    path: '/:classId/exams/new/topic/:topicId',
    handler: toRoute => {
      showExamCreationTopicPage(store, toRoute.params);
    },
  },
  {
    name: PageNames.EXAM_CREATION_PREVIEW,
    path: '/:classId/exams/new/preview/:contentId',
    handler: toRoute => {
      showExamCreationPreviewPage(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: PageNames.EXAM_CREATION_SEARCH,
    path: '/:classId/exams/new/search/:searchTerm',
    handler: toRoute => {
      showExamCreationSearchPage(store, toRoute.params, toRoute.query);
    },
  },
  {
    name: PageNames.EXAM_REPORT,
    path: '/:classId/exams/:examId',
    handler: toRoute => {
      showExamReportPage(store, toRoute.params);
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
      showExamReportDetailPage(store, toRoute.params);
    },
  },
];
