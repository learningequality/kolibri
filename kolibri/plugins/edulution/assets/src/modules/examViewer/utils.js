export function calcQuestionsAnswered(attemptLogs) {
  let questionsAnswered = 0;
  Object.keys(attemptLogs).forEach(key => {
    Object.keys(attemptLogs[key]).forEach(innerKey => {
      questionsAnswered += attemptLogs[key][innerKey].answer ? 1 : 0;
    });
  });
  return questionsAnswered;
}
