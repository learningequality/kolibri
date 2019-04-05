import {
  ContentNodeResource,
  UserExamResource,
  ExamLogResource,
  ExamAttemptLogResource,
} from 'kolibri.resources';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';
import { createQuestionList, selectQuestionFromExercise, canViewExam } from 'kolibri.utils.exams';
import { now } from 'kolibri.utils.serverClock';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import router from 'kolibri.coreVue.router';
import seededShuffle from 'kolibri.lib.seededshuffle';
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

        const seed = exam.seed;
        const questionSources = exam.question_sources;

        // Create an array of objects with contentId and assessmentItemIndex
        // These will be used to select specific questions from the content node
        // The indices referred to shuffled positions in the content node's assessment_item_ids
        // property.
        // Wrap this all in a seededShuffle to give a consistent, repeatable shuffled order.
        const shuffledQuestions = seededShuffle.shuffle(
          createQuestionList(questionSources),
          seed,
          true
        );

        if (!shuffledQuestions[questionNumber]) {
          // Illegal question number!
          store.dispatch(
            'handleError',
            `Question number ${questionNumber} is not valid for this exam`
          );
        } else {
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
              const contentNodeMap = {};

              contentNodes.forEach(node => {
                contentNodeMap[node.id] = node;
              });

              const questions = shuffledQuestions.map(question => ({
                itemId: selectQuestionFromExercise(
                  question.assessmentItemIndex,
                  seed,
                  contentNodeMap[question.contentId]
                ),
                contentId: question.contentId,
              }));

              if (questions.every(question => !question.itemId)) {
                // Exam is drawing solely on malformed exercise data, best to quit now
                store.dispatch('handleError', `This exam has no valid questions`);
              } else {
                const itemId = questions[questionNumber].itemId;
                const channelId = exam.channel_id;
                const currentQuestion = questions[questionNumber];
                const questionsAnswered = Math.max(
                  store.state.examViewer.questionsAnswered || 0,
                  calcQuestionsAnswered(attemptLogs)
                );

                if (!attemptLogs[currentQuestion.contentId]) {
                  attemptLogs[currentQuestion.contentId] = {};
                }
                if (!attemptLogs[currentQuestion.contentId][itemId]) {
                  attemptLogs[currentQuestion.contentId][itemId] = {
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
                    content_id: currentQuestion.contentId,
                  };
                }
                store.commit('SET_EXAM_ATTEMPT_LOGS', attemptLogs);
                store.commit('examViewer/SET_STATE', {
                  channelId,
                  content: contentState(contentNodeMap[questions[questionNumber].contentId]),
                  currentAttempt: attemptLogs[currentQuestion.contentId][itemId],
                  currentQuestion,
                  exam,
                  itemId,
                  questionNumber,
                  questions,
                  questionsAnswered,
                });
                store.commit('CORE_SET_PAGE_LOADING', false);
                store.commit('CORE_SET_ERROR', null);
              }
            },
            error => {
              store.dispatch('handleApiError', error);
            }
          );
        }
      },
      error => {
        store.dispatch('handleApiError', error);
      }
    );
  }
}
