import {
  ContentNodeResource,
  ExamResource,
  ExamLogResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { convertExamQuestionSources } from 'kolibri.utils.exams';
import { now } from 'kolibri.utils.serverClock';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import shuffled from 'kolibri.utils.shuffled';
import { canViewExam } from '../../utils/exams';
import { ClassesPageNames } from '../../constants';
import { contentState } from '../coreLearn/utils';
import { calcQuestionsAnswered } from './utils';

export function showExam(store, params, alreadyOnQuiz) {
  const questionNumber = Number(params.questionNumber);
  const { classId, examId } = params;
  if (!alreadyOnQuiz) {
    store.commit('CORE_SET_PAGE_LOADING', true);
  }
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_VIEWER);
  // Reset examAttemptLogs, so that it will not merge into another exam.
  store.commit('RESET_EXAM_ATTEMPT_LOGS');
  const userId = store.getters.currentUserId;
  const examParams = { user: userId, exam: examId };

  if (!userId) {
    store.commit('CORE_SET_ERROR', 'You must be logged in as a learner to view this page');
    store.commit('CORE_SET_PAGE_LOADING', false);
  } else {
    const promises = [
      ExamResource.fetchModel({ id: examId }),
      ExamLogResource.fetchCollection({ getParams: examParams }),
      ExamAttemptLogResource.fetchCollection({ getParams: examParams }),
      store.dispatch('setAndCheckChannels'),
    ];
    ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([exam, examLogs, examAttemptLogs]) => {
        // Local copy of exam attempt logs
        const attemptLogs = {};

        if (examLogs.length > 0 && examLogs.some(log => !log.closed)) {
          store.commit('SET_EXAM_LOG', examLogs.find(log => !log.closed));
        } else if (examLogs.length > 0 && examLogs.some(log => log.closed)) {
          // If exam is closed, then redirect to route for the report
          return router.replace({
            name: ClassesPageNames.EXAM_REPORT_VIEWER,
            params: {
              ...examParams,
              questionNumber: 0,
              questionInteraction: 0,
            },
          });
        } else {
          ExamLogResource.createModel({ ...examParams, closed: false })
            .save()
            .then(newExamLog => {
              store.commit('SET_EXAM_LOG', newExamLog);
              return ExamLogResource.unCacheCollection(examParams);
            });
        }

        if (!canViewExam(exam, store.state.examLog)) {
          return router.replace({ name: ClassesPageNames.CLASS_ASSIGNMENTS, params: { classId } });
        }
        // Sort through all the exam attempt logs retrieved and organize them into objects
        // keyed first by content_id and then item id under that.
        examAttemptLogs.forEach(log => {
          const { content_id, item } = log;
          if (!attemptLogs[content_id]) {
            attemptLogs[content_id] = {};
          }
          attemptLogs[content_id][item] = { ...log };
        });

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
                `This exam cannot be displayed:\nQuestion sources: ${JSON.stringify(
                  questions
                )}\nExam: ${JSON.stringify(exam)}`
              );
              return;
            }
            // Illegal question number!
            else if (questionNumber >= questions.length) {
              store.dispatch(
                'handleError',
                `Question number ${questionNumber} is not valid for this exam`
              );
              return;
            }

            const currentQuestion = questions[questionNumber];
            const { question_id, exercise_id } = currentQuestion;
            const questionsAnswered = Math.max(
              store.state.examViewer.questionsAnswered || 0,
              calcQuestionsAnswered(attemptLogs)
            );

            if (!attemptLogs[exercise_id]) {
              attemptLogs[exercise_id] = {};
            }
            if (!attemptLogs[exercise_id][question_id]) {
              attemptLogs[exercise_id][question_id] = {
                start_timestamp: now(),
                completion_timestamp: null,
                end_timestamp: null,
                item: question_id,
                complete: false,
                time_spent: 0,
                correct: 0,
                answer: null,
                simple_answer: '',
                interaction_history: [],
                hinted: false,
                content_id: exercise_id,
              };
            }
            store.commit('SET_EXAM_ATTEMPT_LOGS', attemptLogs);
            store.commit('examViewer/SET_STATE', {
              content: contentState(contentNodes.find(node => node.id === exercise_id)),
              currentAttempt: attemptLogs[exercise_id][question_id],
              currentQuestion,
              exam,
              itemId: question_id,
              questionNumber,
              questions,
              questionsAnswered,
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
