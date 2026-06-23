export default (widget, rubric) => {
  // Interactive graph scoring checks the graph state object (coords, center, radius, etc.)
  widget.props.handleUserInput(rubric.correct);
};
