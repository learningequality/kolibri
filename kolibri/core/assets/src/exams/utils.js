import every from 'lodash/every';
import uniq from 'lodash/uniq';
import { v4 as uuidv4 } from 'uuid';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';
import { ExamResource, ContentNodeResource } from 'kolibri.resources';

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

function annotateQuestionsWithItem(questions) {
  return questions.map(question => {
    question.item = `${question.exercise_id}:${question.question_id}`;
    return question;
  });
}

/* Given a V2 question_sources, return V3 structure with those questions within one new section */
/**
 * @param {Array} questionSources - a V2 question_sources object
 * @param {boolean} learners_see_fixed_order - whether the questions should be randomized or not
 *                         - a V2 quiz will have this value on itself, but a V3 quiz will have it
 *                         on each section, so it should be passed in here
 * @returns V3 formatted question_sources
 */
export function convertV2toV3(questionSources, exam) {
  questionSources = questionSources || []; // Default value while requiring all params
  const questions = annotateQuestionsWithItem(questionSources);
  return {
    section_id: uuidv4(),
    section_title: '',
    description: '',
    resource_pool: [],
    questions,
    learners_see_fixed_order: exam.learners_see_fixed_order,
    question_count: exam.question_count,
  };
}

export function revertV3toV2(questionSources) {
  if (!questionSources.length) {
    return [];
  }
  return questionSources[0].questions;
}

/**
 * @param {object} exam - an exam object of any question_sources version
 * @returns V2 formatted question_sources
 */
export function convertExamQuestionSourcesToV3(exam, extraArgs = {}) {
  if (exam.data_model_version !== 3) {
    const V2_sources = convertExamQuestionSources(exam, extraArgs);
    return [convertV2toV3(V2_sources, exam)];
  }

  return exam.question_sources;
}

/**
 * @returns V2 formatted question_sources
 */
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
    return annotateQuestionsWithItem(
      convertExamQuestionSourcesV0V2(exam.question_sources, exam.seed, questionIds)
    );
  }
  if (data_model_version === 1) {
    return annotateQuestionsWithItem(convertExamQuestionSourcesV1V2(exam.question_sources));
  }

  // For backwards compatibility. If you are using V3, use the convertExamQuestionSourcesToV3 func
  if (data_model_version === 3) {
    return revertV3toV2(exam.question_sources);
  }

  return annotateQuestionsWithItem(exam.question_sources);
}

export function fetchNodeDataAndConvertExam(exam) {
  const { data_model_version } = exam;
  if (data_model_version >= 3) {
    /* For backwards compatibility, we need to convert V3 to V2 */
    exam.question_sources = revertV3toV2(exam.question_sources);
    return Promise.resolve(exam);
  }
  if (data_model_version == 2) {
    exam.question_sources = annotateQuestionsWithItem(exam.question_sources);
    return Promise.resolve(exam);
  }
  return ContentNodeResource.fetchCollection({
    getParams: {
      ids: uniq(exam.question_sources.map(item => item.exercise_id)),
      no_available_filtering: true,
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
export function getExamReport(examId, tryIndex = 0, questionNumber = 0, interactionIndex = 0) {
  return new Promise((resolve, reject) => {
    const examPromise = ExamResource.fetchModel({ id: examId });

    examPromise.then(
      exam => {
        const questionSources = exam.question_sources;

        let contentPromise;

        if (questionSources.length) {
          contentPromise = ContentNodeResource.fetchCollection({
            getParams: {
              ids: uniq(questionSources.map(item => item.exercise_id)),
              no_available_filtering: true,
            },
          });
        } else {
          contentPromise = Promise.resolve([]);
        }

        contentPromise.then(
          contentNodes => {
            const questions = convertExamQuestionSources(exam, { contentNodes });

            // When all the Exercises are not available on the server
            if (questions.length === 0) {
              return resolve({ exam });
            }

            const exercise = contentNodes.find(
              node => node.id === questions[questionNumber].exercise_id
            );

            const payload = {
              exerciseContentNodes: [...contentNodes],
              exam,
              questions,
              tryIndex: Number(tryIndex),
              questionNumber: Number(questionNumber),
              exercise,
              interactionIndex: Number(interactionIndex),
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
