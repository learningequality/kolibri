export default (widget, rubric) => {
  // Table scoring uses filterNonEmpty on the userInput (array of row arrays)
  widget.props.handleUserInput(rubric.answers);
};
