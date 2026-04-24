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
