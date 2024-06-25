export default (widget, rubric) => {
  widget.setState(
    {
      values: rubric.correct,
    },
    // Add callback to rerender Graphie after setting the state
    widget.componentDidMount,
  );
};
