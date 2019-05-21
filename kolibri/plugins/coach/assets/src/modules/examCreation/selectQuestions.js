import find from 'lodash/find';
import range from 'lodash/range';
import sumBy from 'lodash/fp/sumBy';
import sortBy from 'lodash/sortBy';
import shuffled from 'kolibri.utils.shuffled';
import { annotateQuestionSourcesWithCounter } from 'kolibri.utils.exams';
import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

const getTotalOfQuestions = sumBy(qArray => qArray.length);

/**
 * Choose a an evenly-distributed random selection of questions from exercises.
 * @param {number} numQuestions - target number of questions
 * @param {array} exerciseIds - exercise IDs
 * @param {array} exerciseTitle - exercise titles
 * @param {array} questionIdArrays - arrays of question/assessment IDs
 *  corresponding to the exercise IDs
 * @param {number} seed - value to seed the random shuffle with
 * @return {array} - objects of the form { exercise_id, question_id, title }
 */
export default function selectQuestions(
  numQuestions,
  exerciseIds,
  exerciseTitles,
  questionIdArrays,
  seed
) {
  if (exerciseIds.length !== questionIdArrays.length) {
    logging.error('exerciseIds and questionIdArrays must have the same length');
  }
  if (exerciseIds.length !== exerciseTitles.length) {
    logging.error('exerciseIds and exerciseTitles must have the same length');
  }
  if (getTotalOfQuestions(questionIdArrays) < numQuestions) {
    logging.error('Not enough questions to reach numQuestions');
  }
  if (numQuestions < exerciseIds.length) {
    logging.warn(`Selecting ${numQuestions} questions from ${exerciseIds.length} exercises`);
  }

  const shuffleWithSeed = items => shuffled(items, seed);

  // helps iterate over exercises pseudo-randomly, in case there are too many exercises
  const randomIndexes = shuffleWithSeed(range(exerciseIds.length));

  // copy and shuffle the question IDs
  const shuffledQuestionIdArrays = questionIdArrays.map(shuffleWithSeed);

  // fill up the output list
  let output = [];
  let i = 0;
  while (output.length < numQuestions) {
    const ri = randomIndexes[i];
    // check if we've used up all questions in one exercise
    if (shuffledQuestionIdArrays[ri].length > 0) {
      const qId = shuffledQuestionIdArrays[ri].pop();

      // Only add the question/assessment to the list if it is not already there
      // from another identical exercise with a different exercise/node ID
      if (!find(output, { question_id: qId })) {
        output.push({
          exercise_id: exerciseIds[ri],
          question_id: qId,
          title: exerciseTitles[ri],
        });
      }
    } else if (getTotalOfQuestions(shuffledQuestionIdArrays) === 0) {
      // If there are not enough questions, then break the loop
      break;
    }
    // cycle through questions
    i = (i + 1) % exerciseIds.length;
  }

  // Add the counter_in_exercise field to make it match the V2 Exam specification
  output = annotateQuestionSourcesWithCounter(output);

  // sort the resulting questions by exercise title
  return sortBy(output, 'title');
}
