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
