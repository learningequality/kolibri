export default (widget, rubric) => {
  widget.props.handleUserInput({
    currentValue: rubric.value.toString(),
  });
};
