import { displayQuestionTitle } from 'kolibri-common/strings/enhancedQuizManagementStrings';
import { coachStrings } from '../views/common/commonCoachStrings';

const ratio = question => {
  return question.correct / question.total;
};

export const getDifficultQuestions = questions => {
  return questions
    .filter(question => {
      // Arbitrarily filter out questions that have higher than 80% correct rate
      return question.correct / question.total < 0.8;
    })
    .sort((question1, question2) => {
      // Sort first by raw correct
      if (ratio(question1) > ratio(question2)) {
        return 1;
      } else if (ratio(question2) > ratio(question1)) {
        return -1;
        // If they are equal, prioritize questions in which we have the highest
        // number of answers
      } else if (question1.total > question2.total) {
        return -1;
      } else if (question2.total > question1.total) {
        return 1;
      }
      // Nothing between them!
      return 0;
    });
};

/**
 * Title for a quiz question in coach reports.
 * @param {object} question - A quiz question from the exam's question_sources.
 * @param {object[]} exercises - The quiz's exercise content nodes.
 * @returns {string}
 */
export function quizQuestionTitle(question, exercises) {
  const exercise = exercises.find(node => node.id === question.exercise_id);
  if (exercise) {
    return displayQuestionTitle(question, exercise.title);
  }
  return coachStrings.$tr('nthExerciseName', {
    name: question.title,
    number: question.counter_in_exercise,
  });
}

/**
 * Merges params and query from a new route into the current route, overriding existing values.
 * @param {object} route - The current route object with params and query.
 * @param {object} newRoute - The new route object to merge params and query from.
 * @returns {object} A new route object with merged params and query.
 */
export function overrideRoute(route, newRoute) {
  const { params, query } = route;
  return {
    ...newRoute,
    params: {
      ...params,
      ...newRoute.params,
    },
    query: {
      ...query,
      ...newRoute.query,
    },
  };
}

/**
 * A learner's per-objective scores on a unit's active test.
 * @param {object} prefetchedData - A unit's report info: `{ activeTestType, reportData }`.
 * @param {string} learnerId - The learner to look up.
 * @returns {object|null} Correct answers keyed by learning objective id, or null if the
 * learner has no results on the active test.
 */
export function learnerTestScores(prefetchedData, learnerId) {
  const { activeTestType, reportData } = prefetchedData || {};
  if (!activeTestType) return null;
  const testKey = activeTestType === 'post' ? 'post_test' : 'pre_test';
  return reportData?.[testKey]?.scores?.[learnerId] || null;
}
