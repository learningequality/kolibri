import every from 'lodash/every';
import uniq from 'lodash/uniq';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import {
  ExamResource,
  ExamLogResource,
  FacilityUserResource,
  ExamAttemptLogResource,
  ContentNodeResource,
} from 'kolibri.resources';
import ConditionalPromise from 'kolibri.lib.conditionalPromise';
import samePageCheckGenerator from 'kolibri.utils.samePageCheckGenerator';

/*
 * Converts from v0 exam structures to v1
 *
 * @param {array} questionSources - array of v0 objects, which have the form:
 *    { exercise_id, number_of_questions: N, title: <exercise_title> }
 * @param {number} seed - an integer used to seed the PRNG
 * @param {number} numberOfQs - how many questions to return
 * @param {object} questionIds - map of node `id`s to arrays of assessment_item_ids
 *
 * @returns {array} - pseudo-randomized list of question objects compatible with v1 like:
 *    { exercise_id, question_id }
 */
function convertExamQuestionSourcesV0V2(questionSources, seed, questionIds) {
  // This is the original PRNG that was used and MUST BE KEPT as-is. Logic from:
  // https://github.com/LouisT/SeededShuffle/blob/8d71a917d2f64e18fa554dbe660c7f5e6578e13e/index.js
  // (For more reliable seeded shuffling in other parts of the code base, use
  // the kolibri.utils.shuffled function which uses the more reliable PRNG from the
  // https://github.com/davidbau/seedrandom package.)
  function seededShuffle(arr, seed) {
    const shuffled = arr.slice(0);
    const size = arr.length;
    const map = new Array(size);
    for (var x = 0; x < size; x++) {
      // Don't change these magic numbers or the spell will be broken
      map[x] = (((seed = (seed * 9301 + 49297) % 233280) / 233280.0) * size) | 0;
    }
    for (var i = size - 1; i > 0; i--) {
      shuffled[i] = shuffled.splice(map[size - 1 - i], 1, shuffled[i])[0];
    }
    return shuffled;
  }
  const examQuestions = questionSources.reduce(
    (acc, val) =>
      acc.concat(
        Array.from(Array(val.number_of_questions).keys()).map(questionNumber => ({
          exercise_id: val.exercise_id,
          title: val.title,
          questionNumber,
        }))
      ),
    []
  );
  const shuffledExamQuestions = seededShuffle(examQuestions, seed);
  const shuffledExerciseQuestions = {};
  Object.keys(questionIds).forEach(key => {
    shuffledExerciseQuestions[key] = seededShuffle(questionIds[key], seed);
  });
  return shuffledExamQuestions.map(question => ({
    exercise_id: question.exercise_id,
    question_id: shuffledExerciseQuestions[question.exercise_id][question.questionNumber],
    title: question.title,
    counter_in_exercise:
      questionIds[question.exercise_id].findIndex(
        id => id === shuffledExerciseQuestions[question.exercise_id][question.questionNumber]
      ) + 1,
  }));
}

function convertExamQuestionSourcesV1V2(questionSources) {
  // In case a V1 quiz already has this with the old name, rename it
  if (every(questionSources, 'counterInExercise')) {
    return questionSources.map(source => {
      const copy = source;
      copy.counter_in_exercise = copy.counterInExercise;
      delete copy.counterInExercise;
      return copy;
    });
  }

  return annotateQuestionSourcesWithCounter(questionSources);
}

export function convertExamQuestionSources(exam, extraArgs = {}) {
  const { data_model_version } = exam;
  if (data_model_version === 0) {
    // TODO contentNodes are only needed for V0 -> V2 conversion, but a request to the
    // ContentNode API is made regardless of the version being converted
    if (extraArgs.contentNodes === undefined) {
      throw new Error(
        "Missing 'contentNodes' array, which is required when converting a V0 Exam model"
      );
    }
    if (exam.seed === undefined) {
      throw new Error("Missing 'seed' integer, which is required when converting a V0 Exam model");
    }
    const { contentNodes } = extraArgs;
    const questionIds = {};
    contentNodes.forEach(node => {
      questionIds[node.id] = assessmentMetaDataState(node).assessmentIds;
    });
    return convertExamQuestionSourcesV0V2(exam.question_sources, exam.seed, questionIds);
  }
  if (data_model_version === 1) {
    return convertExamQuestionSourcesV1V2(exam.question_sources);
  }
  return exam.question_sources;
}

export function fetchNodeDataAndConvertExam(exam) {
  const { data_model_version } = exam;
  if (data_model_version >= 2) {
    return Promise.resolve(exam);
  }
  return ContentNodeResource.fetchCollection({
    getParams: {
      ids: uniq(exam.question_sources.map(item => item.exercise_id)),
    },
  }).then(contentNodes => {
    return {
      ...exam,
      question_sources: convertExamQuestionSources(exam, { contentNodes }),
    };
  });
}

// Takes a V1 Exam's question_sources field, and annotates it with the
// counter_in_exercise field. Also used in selectQuestions.js to do same
// calculations when creating a new Exam.
export function annotateQuestionSourcesWithCounter(questionSources) {
  const counterInExerciseMap = {};
  return questionSources.map(source => {
    const { exercise_id } = source;
    if (!counterInExerciseMap[exercise_id]) {
      counterInExerciseMap[exercise_id] = 0;
    }
    return {
      ...source,
      counter_in_exercise: (counterInExerciseMap[exercise_id] += 1),
    };
  });
}

// idk the best place to place this function
export function getExamReport(store, examId, userId, questionNumber = 0, interactionIndex = 0) {
  return new Promise((resolve, reject) => {
    const examPromise = ExamResource.fetchModel({ id: examId });
    const examLogPromise = ExamLogResource.fetchCollection({
      getParams: {
        exam: examId,
        user: userId,
      },
    });
    const attemptLogPromise = ExamAttemptLogResource.fetchCollection({
      getParams: {
        exam: examId,
        user: userId,
      },
      force: true,
    });
    const userPromise = FacilityUserResource.fetchModel({ id: userId });

    ConditionalPromise.all([examPromise, examLogPromise, attemptLogPromise, userPromise]).only(
      samePageCheckGenerator(store),
      ([exam, examLogs, examAttempts, user]) => {
        const examLog = examLogs[0] || {};
        const questionSources = exam.question_sources;

        let contentPromise;

        if (questionSources.length) {
          contentPromise = ContentNodeResource.fetchCollection({
            getParams: {
              ids: uniq(questionSources.map(item => item.exercise_id)),
            },
          });
        } else {
          contentPromise = ConditionalPromise.resolve([]);
        }

        contentPromise.only(
          samePageCheckGenerator(store),
          contentNodes => {
            const questions = convertExamQuestionSources(exam, { contentNodes });

            // When all the Exercises are not available on the server
            if (questions.length === 0) {
              return resolve({ exam, examLog, user });
            }

            const allQuestions = questions.map((question, index) => {
              const attemptLog = examAttempts.filter(
                log => log.item === question.question_id && log.content_id === question.exercise_id
              );
              let examAttemptLog = attemptLog[0]
                ? attemptLog[0]
                : { interaction_history: [], correct: false, noattempt: true };
              if (attemptLog.length > 1) {
                let completionTimeStamp = attemptLog.map(function(att) {
                  return att.completion_timestamp;
                });
                examAttemptLog = attemptLog.find(
                  log => log.completion_timestamp === completionTimeStamp.sort().reverse()[0]
                );
              }
              return Object.assign(
                {
                  questionNumber: index + 1,
                },
                examAttemptLog
              );
            });

            allQuestions.sort((loga, logb) => loga.questionNumber - logb.questionNumber);

            const currentQuestion = questions[questionNumber];
            const itemId = currentQuestion.question_id;
            const exercise = contentNodes.find(node => node.id === currentQuestion.exercise_id);
            const currentAttempt = allQuestions[questionNumber];
            // filter out interactions without answers but keep hints and errors
            const currentInteractionHistory = currentAttempt.interaction_history.filter(
              interaction =>
                Boolean(
                  interaction.answer || interaction.type === 'hint' || interaction.type === 'error'
                )
            );
            const currentInteraction = currentInteractionHistory[interactionIndex];
            if (examLog.completion_timestamp) {
              examLog.completion_timestamp = new Date(examLog.completion_timestamp);
            }
            const payload = {
              exerciseContentNodes: [...contentNodes],
              exam,
              itemId,
              questions,
              currentQuestion,
              questionNumber: Number(questionNumber),
              currentAttempt,
              exercise,
              interactionIndex: Number(interactionIndex),
              currentInteraction,
              currentInteractionHistory,
              user,
              examAttempts: allQuestions,
              examLog,
            };
            resolve(payload);
          },
          error => reject(error)
        );
      },
      error => reject(error)
    );
  });
}
