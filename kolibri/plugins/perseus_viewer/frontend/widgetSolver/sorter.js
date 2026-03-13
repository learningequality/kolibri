export default (widget, rubric) => {
  widget.props.handleUserInput({
    options: rubric.correct,
    changed: true,
  });
};
