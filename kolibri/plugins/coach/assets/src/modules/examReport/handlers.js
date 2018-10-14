import { LearnerGroupResource, ContentNodeSlimResource, ExamResource } from 'kolibri.resources';
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
        LearnerGroupResource.fetchCollection({ getParams: { parent: classId } }),
        ExamResource.fetchCollection({ getParams: { collection: classId }, force: true }),
        exam.question_sources.length
          ? ContentNodeSlimResource.fetchCollection({
              getParams: {
                ids: exam.question_sources.map(item => item.exercise_id),
                fields: ['id'],
                include_fields: ['num_coach_contents'],
              },
            })
          : ConditionalPromise.resolve([]),
        store.dispatch('setClassState', classId),
      ];
      ConditionalPromise.all(promises).only(
        samePageCheckGenerator(store),
        ([learnerGroups, exams, contentNodes]) => {
          store.commit('examReport/SET_STATE', {
            exam,
            examTakers: [],
            exams,
            examsModalSet: null,
            exerciseContentNodes: [...contentNodes],
            learnerGroups,
          });
          // Needs to be called after SET_STATE, since it relies on state.learnerGroups
          return store.dispatch('examReport/setTableData', { classId, examId }).then(() => {
            store.commit('CORE_SET_ERROR', null);
            store.commit('CORE_SET_PAGE_LOADING', false);
          });
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
