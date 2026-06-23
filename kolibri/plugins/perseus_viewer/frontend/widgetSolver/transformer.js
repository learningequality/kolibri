export default (widget, rubric) => {
  // Transformer scoring checks the transformations against rubric.correct
  widget.props.handleUserInput(rubric.correct);
};
