export default (widget, rubric) => {
  const correct = rubric.answerForms.find(answer => answer.considered === 'correct');
  // TODO rtibbles: Parse this value to give a simplified, student appropriate form?
  widget.setInputValue('', correct.value);
};
