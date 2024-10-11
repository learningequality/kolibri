import uniq from 'lodash/uniq';
import some from 'lodash/some';
import { MAX_QUESTIONS_PER_QUIZ_SECTION } from 'kolibri/constants';
import ExamResource from 'kolibri-common/apiResources/ExamResource';
import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';

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
        })),
      ),
    [],
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
        id => id === shuffledExerciseQuestions[question.exercise_id][question.questionNumber],
      ) + 1,
  }));
}

function convertExamQuestionSourcesV1V2(questionSources) {
  if (some(questionSources, 'counterInExercise')) {
    for (const question of questionSources) {
      if (!question.counterInExercise) {
        continue;
      }
      question.counter_in_exercise = question.counterInExercise;
      delete question.counterInExercise;
    }
  }
  // In case a V1 quiz already has this with the old name, rename it
  return annotateQuestionSourcesWithCounter(questionSources);
}

/**
 * This function applies an `item` field to each question in the array which is similar to
 * where we elsewhere use `exercise_id:question_id` to uniquely identify a question.
 */
function annotateQuestionsWithItem(questions) {
  return questions.map(question => {
    question.item = `${question.exercise_id}:${question.question_id}`;
    return question;
  });
}

/* Given a V2 question_sources, return V3 structure with those questions within one new section */
/**
 * @param {Exam} learners_see_fixed_order - whether the questions should be randomized or not
 *                         - a V2 quiz will have this value on itself, but a V3 quiz will have it
 *                         on each section, so it should be passed in here
 * @returns V3 formatted question_sources
 */
export function convertExamQuestionSourcesV2toV3({ question_sources, learners_see_fixed_order }) {
  // In V2, question_sources are questions so we add them
  // to the newly created section's `questions` property
  const questions = question_sources.map(item => {
    return {
      ...item,
      // Overwrite the exercise title as the question title
      // is user editable in the V3 schema, so we set it to
      // blank to indicate it has not been set by an editor.
      title: '',
    };
  });
  const sections = [];

  while (questions.length > 0) {
    sections.push({
      section_title: '',
      description: '',
      questions: questions.splice(0, MAX_QUESTIONS_PER_QUIZ_SECTION),
      learners_see_fixed_order,
    });
  }
  return sections;
}

/**
 * Fetches the content nodes for an exam and converts the exam to the latest data_model_version
 *
 * data_model_version 0 (V0):
 * - question_sources here refer to exercise nodes that the exam drew questions from at that time
 *
 * data_model_version 1 (V1):
 * - question_sources is changed to now refer to the questions themselves by including the
 *   exercise_id and question_id along with a title
 *
 * data_model_version 2 (V2):
 * - The objects in question_sources are now annotated with a counter_in_exercise field
 *
 * data_model_version 3 (V3):
 * - question_sources now refers to a list of sections, each with their own list of questions
 */

export async function convertExamQuestionSources(exam) {
  if (exam.data_model_version === 0) {
    const ids = uniq(exam.question_sources.map(item => item.exercise_id));
    const exercises = await ContentNodeResource.fetchCollection({
      getParams: {
        ids,
        no_available_filtering: true,
      },
    });
    const questionIds = exercises.reduce((nodeIds, node) => {
      nodeIds[node.id] = node.assessmentmetadata ? node.assessmentmetadata.assessment_item_ids : [];
      return nodeIds;
    }, []);
    exam.question_sources = convertExamQuestionSourcesV0V2(
      exam.question_sources,
      exam.seed,
      questionIds,
    );
    // v1 -> v2 only updates the `counter_in_exercise` field if it's in camelCase
    // so we can set the data_model_version to 2 here to skip that code
    exam.data_model_version = 2;
  }

  if (exam.data_model_version === 1) {
    exam.question_sources = convertExamQuestionSourcesV1V2(exam.question_sources);
    exam.data_model_version = 2;
  }

  if (exam.data_model_version === 2) {
    exam.question_sources = convertExamQuestionSourcesV2toV3(exam);
    exam.data_model_version = 3;
  }

  // Now we know we have the latest V3 structure
  exam.question_sources = exam.question_sources.map(section => {
    section.questions = annotateQuestionsWithItem(section.questions);
    return section;
  });

  return exam;
}

/**
 * @returns {Promise} - resolves to an object with the exam and the exercises
 */
export async function fetchExamWithContent(exam) {
  return convertExamQuestionSources(exam).then(converted => {
    exam.question_sources = converted.question_sources;
    const ids = uniq(
      exam.question_sources.reduce((acc, section) => {
        acc = [...acc, ...section.questions.map(item => item.exercise_id)];
        return acc;
      }, []),
    );

    return ContentNodeResource.fetchCollection({
      getParams: {
        ids,
        no_available_filtering: true,
      },
    }).then(exercises => {
      return {
        exam,
        exercises,
      };
    });
  });
}

// Takes a V1 Exam's question_sources field, and annotates it with the
// counter_in_exercise field. Also used in selectQuestions.js to do same
// calculations when creating a new Exam.
export function annotateQuestionSourcesWithCounter(questionSources) {
  const counterInExerciseMap = {};
  return questionSources.map(source => {
    if (source.counter_in_exercise) {
      return source;
    }
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
  return ExamResource.fetchModel({ id: examId }).then(examData => {
    return fetchExamWithContent(examData).then(({ exam, exercises }) => {
      // When all the Exercises are not available on the server
      if (exam.question_count === 0) {
        return exam;
      }

      // We need this array of questions to easily do questionNumber based indexing across
      // all the sections.
      const questions = exam.question_sources.reduce((qs, sect) => {
        qs = [...qs, ...sect.questions];
        return qs;
      }, []);

      const exercise = exercises.find(node => node.id === questions[questionNumber].exercise_id);

      return {
        exerciseContentNodes: [...exercises],
        exam,
        questions,
        tryIndex: Number(tryIndex),
        questionNumber: Number(questionNumber),
        exercise,
        interactionIndex: Number(interactionIndex),
      };
    });
  });
}

export function annotateSections(sections, questions = []) {
  // Adding the additional startQuestionNumber and endQuestionNumber fields to each section
  // allows to more easily identify the overall place in the quiz that a question is.
  // This is useful for deciding which section is currently active based on the global
  // question number, and also for displaying the global question number in the UI.
  if (!sections) {
    return [
      {
        section_title: '',
        questions: questions,
        startQuestionNumber: 0,
        endQuestionNumber: questions.length - 1,
      },
    ];
  }
  let startQuestionNumber = 0;
  return sections.map(section => {
    const annotatedSection = {
      ...section,
      startQuestionNumber,
      endQuestionNumber: startQuestionNumber + section.questions.length - 1,
    };
    startQuestionNumber += section.questions.length;
    return annotatedSection;
  });
}
