export default rubric => {
  const correct = rubric.answerForms.find(answer => answer.considered === 'correct');
  // Expression user input is a plain string
  return correct.value;
};
