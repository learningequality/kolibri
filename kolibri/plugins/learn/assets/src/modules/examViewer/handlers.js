import { ContentNodeResource, ClassroomResource, ExamResource } from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { convertExamQuestionSources } from 'kolibri.utils.exams';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import shuffled from 'kolibri.utils.shuffled';
import { ClassesPageNames } from '../../constants';
import { contentState } from '../coreLearn/utils';

export function showExam(store, params, alreadyOnQuiz) {
  const questionNumber = Number(params.questionNumber);
  const { classId, examId } = params;
  if (!alreadyOnQuiz) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_VIEWER);

  const userId = store.getters.currentUserId;

  if (!userId) {
    store.commit('CORE_SET_ERROR', 'You must be logged in as a learner to view this page');
    store.commit('CORE_SET_PAGE_LOADING', false);
  } else {
    const promises = [
      ClassroomResource.fetchModel({ id: classId }),
      ExamResource.fetchModel({ id: examId }),
      store.dispatch('setAndCheckChannels'),
    ];
    ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([classroom, exam]) => {
        store.commit('classAssignments/SET_CURRENT_CLASSROOM', classroom);

        let contentPromise;
        if (exam.question_sources.length) {
          contentPromise = ContentNodeResource.fetchCollection({
            getParams: {
              ids: exam.question_sources.map(item => item.exercise_id),
            },
          });
        } else {
          contentPromise = ConditionalPromise.resolve([]);
        }
        contentPromise.only(
          samePageCheckGenerator(store),
          contentNodes => {
            // If necessary, convert the question source info
            let questions = convertExamQuestionSources(exam, { contentNodes });

            // When necessary, randomize the questions for the learner.
            // Seed based on the user ID so they see a consistent order each time.
            if (!exam.learners_see_fixed_order) {
              questions = shuffled(questions, store.state.core.session.user_id);
            }

            // Exam is drawing solely on malformed exercise data, best to quit now
            if (questions.some(question => !question.question_id)) {
              store.dispatch(
                'handleError',
                `This quiz cannot be displayed:\nQuestion sources: ${JSON.stringify(
                  questions
                )}\nExam: ${JSON.stringify(exam)}`
              );
              return;
            }
            // Illegal question number!
            else if (questionNumber >= questions.length) {
              store.dispatch(
                'handleError',
                `Question number ${questionNumber} is not valid for this quiz`
              );
              return;
            }

            const contentNodeMap = {};

            for (let node of contentNodes) {
              contentNodeMap[node.id] = contentState(node);
            }

            store.commit('examViewer/SET_STATE', {
              contentNodeMap,
              exam,
              questionNumber,
              questions,
            });
            store.commit('CORE_SET_PAGE_LOADING', false);
            store.commit('CORE_SET_ERROR', null);
          },
          error => {
            store.dispatch('handleApiError', error);
          }
        );
      },
      error => {
        store.dispatch('handleApiError', error);
      }
    );
  }
}
