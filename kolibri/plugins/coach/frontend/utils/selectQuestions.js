import range from 'lodash/range';
import sumBy from 'lodash/fp/sumBy';
import sortBy from 'lodash/sortBy';
import shuffled from 'kolibri-common/utils/shuffled';
import logger from 'kolibri-logging';

const logging = logger.getLogger(__filename);

const getTotalOfQuestions = sumBy(qArray => qArray.length);

export function exerciseToQuestionArray(exercise) {
  return exercise.assessmentmetadata.assessment_item_ids.map((question_id, i) => {
    return {
      exercise_id: exercise.id,
      question_id,
      counter_in_exercise: i + 1,
      // In the V3 schema, the title is user editable, and no longer
      // simply the title of the exercise the question came from.
      // We set it to blank to indicate that no user generated title
      // has been created.
      title: '',
      item: `${exercise.id}:${question_id}`,
    };
  });
}

function getExerciseQuestionsMap(exercises, excludedQuestionIds = []) {
  const excludedQuestionIdMap = {};
  for (const uId of excludedQuestionIds) {
    excludedQuestionIdMap[uId] = true;
  }
  const allQuestionsByExercise = {};
  for (const exercise of exercises) {
    allQuestionsByExercise[exercise.id] = exerciseToQuestionArray(exercise);
    if (excludedQuestionIds.length) {
      allQuestionsByExercise[exercise.id] = allQuestionsByExercise[exercise.id].filter(
        question => !excludedQuestionIdMap[question.item],
      );
    }
  }
  return allQuestionsByExercise;
}

/**
 * Choose a an evenly-distributed random selection of questions from exercises. Note that the order
 * of the arrays should correspond to each other, ie, exerciseIds[i] should correspond to
 * questionIdArrays[i] should correspond to exerciseTitles[i], etc.
 *
 * @param {Number} numQuestions - target number of questions
 * @param {String[]} exercises - Exercise objects
 * @param {number} seed - value to seed the random shuffle with
 *
 * @return {QuizQuestion[]}
 */
export default function selectQuestions(numQuestions, exercises, seed, excludedQuestionIds = []) {
  const allQuestionsByExercise = getExerciseQuestionsMap(exercises, excludedQuestionIds);
  const exerciseIds = Object.keys(allQuestionsByExercise);
  const questionArrays = Object.values(allQuestionsByExercise);
  if (getTotalOfQuestions(questionArrays) < numQuestions) {
    logging.error('Not enough questions to reach numQuestions');
  }
  if (numQuestions < exerciseIds.length) {
    logging.warn(`Selecting ${numQuestions} questions from ${exerciseIds.length} exercises`);
  }

  const shuffleWithSeed = items => shuffled(items, seed);

  // helps iterate over exercises pseudo-randomly, in case there are too many exercises
  const randomIndexes = shuffleWithSeed(range(exerciseIds.length));

  // copy and shuffle the question IDs
  const shuffledQuestionArrays = questionArrays.map(shuffleWithSeed);

  // fill up the output list
  const output = [];
  let i = 0;
  while (output.length < numQuestions) {
    const ri = randomIndexes[i];
    // check if we've used up all questions in one exercise
    if (shuffledQuestionArrays[ri].length > 0) {
      const question = shuffledQuestionArrays[ri].pop();
      output.push(question);
    } else if (getTotalOfQuestions(shuffledQuestionArrays) === 0) {
      // If there are not enough questions, then break the loop
      break;
    }
    // cycle through questions
    i = (i + 1) % exerciseIds.length;
  }

  // sort the resulting questions by exercise title
  return sortBy(output, 'title');
}
