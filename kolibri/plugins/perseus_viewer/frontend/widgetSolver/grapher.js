export default (widget, rubric) => {
  // Grapher scoring checks userInput.type and userInput.coords
  widget.props.handleUserInput(rubric.correct);
};
