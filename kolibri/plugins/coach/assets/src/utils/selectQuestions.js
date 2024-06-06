import find from 'lodash/find';
import range from 'lodash/range';
import sumBy from 'lodash/fp/sumBy';
import sortBy from 'lodash/sortBy';
import shuffled from 'kolibri.utils.shuffled';
import logger from 'kolibri.lib.logging';

const logging = logger.getLogger(__filename);

const getTotalOfQuestions = sumBy(qArray => qArray.length);

/**
 * Choose a an evenly-distributed random selection of questions from exercises. Note that the order
 * of the arrays should correspond to each other, ie, exerciseIds[i] should correspond to
 * questionIdArrays[i] should correspond to exerciseTitles[i], etc.
 *
 * @param {Number} numQuestions - target number of questions
 * @param {String[]} exerciseIds - QuizExercise IDs
 * @param {String[]} exerciseTitle - QuizExercise titles
 * @param {Array[String[]]} questionIdArrays - QuizQuestion (assessmentitem) unique IDs in the
 *                                             composite format `exercise_id:question_id`
 * @param {number} seed - value to seed the random shuffle with
 *
 * @return {QuizQuestion[]}
 */
export default function selectQuestions(
  numQuestions,
  exerciseIds,
  exerciseTitles,
  questionIdArrays,
  seed,
  excludedQuestionIds = []
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

  // reduced to remove excludedQuestionIds, ternary expression avoids iterating unnecessarily
  const filteredQuestionIdArrays = !excludedQuestionIds.length
    ? shuffledQuestionIdArrays
    : shuffledQuestionIdArrays.reduce((acc, resourceQuestions) => {
        acc.push(resourceQuestions.filter(uId => !excludedQuestionIds.includes(uId)));
        return acc;
      }, []);

  // fill up the output list
  const output = [];
  let i = 0;
  while (output.length < numQuestions) {
    const ri = randomIndexes[i];
    // check if we've used up all questions in one exercise
    if (filteredQuestionIdArrays[ri].length > 0) {
      const uId = filteredQuestionIdArrays[ri].pop();

      // Only add the question/assessment to the list if it is not already there
      // from another identical exercise with a different exercise/node ID
      if (!find(output, { id: uId })) {
        output.push({
          counter_in_exercise: questionIdArrays[ri].indexOf(uId) + 1,
          exercise_id: uId.includes(':') ? uId.split(':')[0] : uId,
          question_id: uId.split(':')[1],
          // TODO See #12127 re: replacing all `id` with `item`
          id: uId,
          item: uId,
          title: exerciseTitles[ri],
        });
      }
    } else if (getTotalOfQuestions(filteredQuestionIdArrays) === 0) {
      // If there are not enough questions, then break the loop
      break;
    }
    // cycle through questions
    i = (i + 1) % exerciseIds.length;
  }

  // sort the resulting questions by exercise title
  return sortBy(output, 'title');
}
