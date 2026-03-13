export default (widget, rubric) => {
  const correct = rubric.answerForms.find(answer => answer.considered === 'correct');
  // Expression user input is a plain string
  widget.props.handleUserInput(correct.value);
};
