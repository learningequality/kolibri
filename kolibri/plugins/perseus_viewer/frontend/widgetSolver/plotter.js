export default (widget, rubric) => {
  // Plotter scoring does deep comparison of userInput against rubric.correct
  widget.props.handleUserInput(rubric.correct);
};
