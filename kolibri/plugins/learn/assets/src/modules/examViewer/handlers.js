import {
  ContentNodeResource,
  UserExamResource,
  ExamLogResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { canViewExam, convertExamQuestionSourcesV0V1 } from 'kolibri.utils.exams';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { now } from 'kolibri.utils.serverClock';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import { PageNames, ClassesPageNames } from '../../constants';
import { contentState } from '../coreLearn/utils';
import { calcQuestionsAnswered } from './utils';

export function showExam(store, params) {
  let questionNumber = params.questionNumber;
  const { classId, examId } = params;
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', ClassesPageNames.EXAM_VIEWER);
  // Reset examAttemptLogs, so that it will not merge into another exam.
  store.commit('RESET_EXAM_ATTEMPT_LOGS');
  const userId = store.getters.currentUserId;
  const examParams = { user: userId, exam: examId };

  if (!userId) {
    store.commit('CORE_SET_ERROR', 'You must be logged in as a learner to view this page');
    store.commit('CORE_SET_PAGE_LOADING', false);
  } else {
    questionNumber = Number(questionNumber); // eslint-disable-line no-param-reassign

    const promises = [
      UserExamResource.fetchModel({ id: examId }),
      ExamLogResource.fetchCollection({ getParams: examParams }),
      ExamAttemptLogResource.fetchCollection({ getParams: examParams }),
      store.dispatch('setAndCheckChannels'),
    ];
    ConditionalPromise.all(promises).only(
      samePageCheckGenerator(store),
      ([exam, examLogs, examAttemptLogs]) => {
        const currentChannel = store.getters.getChannelObject(exam.channel_id);
        if (!currentChannel) {
          return router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        }

        // Local copy of exam attempt logs
        const attemptLogs = {};

        if (examLogs.length > 0 && examLogs.some(log => !log.closed)) {
          store.commit('SET_EXAM_LOG', examLogs.find(log => !log.closed));
        } else if (examLogs.length > 0 && examLogs.some(log => log.closed)) {
          return router.replace({ name: PageNames.CONTENT_UNAVAILABLE });
        } else {
          ExamLogResource.createModel({ ...examParams, closed: false })
            .save()
            .then(newExamLog => {
              store.commit('SET_EXAM_LOG', newExamLog);
              return ExamLogResource.unCacheCollection(examParams);
            });
        }

        if (!canViewExam(exam, store.state.examLog)) {
          return router
            .getInstance()
            .replace({ name: ClassesPageNames.CLASS_ASSIGNMENTS, params: { classId } });
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
            const questionIds = {};
            contentNodes.forEach(node => {
              questionIds[node.id] = assessmentMetaDataState(node).assessmentIds;
            });

            // If necessary, convert the question source info
            const questions =
              exam.data_model_version === 0
                ? convertExamQuestionSourcesV0V1(exam.question_sources, exam.seed, questionIds)
                : exam.question_sources;

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

            const channelId = exam.channel_id;
            const currentQuestion = questions[questionNumber];
            const itemId = currentQuestion.question_id;
            const contentId = currentQuestion.exercise_id;
            const questionsAnswered = Math.max(
              store.state.examViewer.questionsAnswered || 0,
              calcQuestionsAnswered(attemptLogs)
            );

            if (!attemptLogs[currentQuestion.exercise_id]) {
              attemptLogs[currentQuestion.exercise_id] = {};
            }
            if (!attemptLogs[contentId][itemId]) {
              attemptLogs[contentId][itemId] = {
                start_timestamp: now(),
                completion_timestamp: null,
                end_timestamp: null,
                item: itemId,
                complete: false,
                time_spent: 0,
                correct: 0,
                answer: null,
                simple_answer: '',
                interaction_history: [],
                hinted: false,
                channel_id: channelId,
                content_id: contentId,
              };
            }
            store.commit('SET_EXAM_ATTEMPT_LOGS', attemptLogs);
            store.commit('examViewer/SET_STATE', {
              channelId,
              content: contentState(contentNodes.find(node => node.id === contentId)),
              currentAttempt: attemptLogs[contentId][itemId],
              currentQuestion,
              exam,
              itemId,
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
