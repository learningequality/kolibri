export default (widget, rubric) => {
  widget.props.handleUserInput({
    left: rubric.left,
    right: rubric.right,
  });
};
