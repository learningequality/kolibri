export default (widget, rubric) => {
  const correctIndex = rubric.choices.findIndex(choice => choice.correct);
  // Dropdown value is 1-indexed (0 = placeholder/unselected)
  widget.props.handleUserInput({
    value: correctIndex + 1,
  });
};
