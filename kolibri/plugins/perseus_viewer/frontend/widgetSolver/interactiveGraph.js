export default (widget, rubric) => {
  const graph = rubric.correct;

  widget.props.onChange(
    {
      graph,
    },
    // When the props have finished updating, then use the resetGraphie method to make
    // the graph render with the new answer.
    () => {
      widget.resetGraphie();
    },
    false, // silent
  );
};
