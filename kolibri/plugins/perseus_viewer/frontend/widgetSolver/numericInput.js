export default (widget, rubric) => {
  const answer = rubric.answers.find(answer => answer.status === 'correct');
  const currentValue = answer.value.toString();

  widget.props.handleUserInput({
    currentValue,
  });
};
