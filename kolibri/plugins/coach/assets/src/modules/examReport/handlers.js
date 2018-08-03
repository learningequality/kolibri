import {
  LearnerGroupResource,
  ContentNodeSlimResource,
  ExamResource,
  ExamLogResource,
  FacilityUserResource,
} from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { PageNames } from '../../constants';

export function showExamReportPage(store, params) {
  const { classId, examId } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.EXAM_REPORT);

  ExamResource.fetchModel({ id: examId }).only(
    samePageCheckGenerator(store),
    exam => {
      const promises = [
        ExamLogResource.fetchCollection({ getParams: { exam: examId, collection: classId } }),
        FacilityUserResource.fetchCollection({ getParams: { member_of: classId } }),
        LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
        ExamResource.fetchCollection({ getParams: { collection: classId }, force: true }),
        ContentNodeSlimResource.fetchCollection({
          getParams: {
            in_exam: exam.id,
            fields: ['id', 'num_coach_contents'],
          },
        }),
        store.dispatch('setClassState', classId),
      ];
      ConditionalPromise.all(promises).only(
        samePageCheckGenerator(store),
        ([examLogs, facilityUsers, learnerGroups, exams, contentNodes]) => {
          const examTakers = facilityUsers.map(user => {
            const examTakenByUser =
              examLogs.find(examLog => String(examLog.user) === user.id) || {};
            const learnerGroup =
              learnerGroups.find(group => group.user_ids.indexOf(user.id) > -1) || {};
            return {
              id: user.id,
              name: user.full_name,
              group: learnerGroup,
              score: examTakenByUser.score,
              progress: examTakenByUser.progress,
              closed: examTakenByUser.closed,
            };
          });
          store.commit('examReport/SET_STATE', {
            exam,
            examTakers,
            exams,
            examsModalSet: null,
            exerciseContentNodes: [...contentNodes],
            learnerGroups,
          });
          store.commit('CORE_SET_ERROR', null);
          store.commit('CORE_SET_PAGE_LOADING', false);
        },
        error => {
          store.dispatch('handleApiError', error);
        }
      );
    },
    error => {
      if (error.status.code === 404) {
        // TODO: route to 404 page
        router.replace({ name: PageNames.EXAMS });
      } else {
        store.dispatch('handleCoachPageError', error);
      }
    }
  );
}
