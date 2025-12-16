export default (widget, rubric) => {
  widget.setState({
    current: rubric.correctOptions.map((option, i) => Object.assign(option, { key: i })),
  });
};
