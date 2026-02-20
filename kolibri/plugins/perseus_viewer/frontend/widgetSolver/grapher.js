export default (widget, rubric) => {
  const plot = rubric.correct;

  widget.props.onChange(
    {
      plot,
    },
    null, // cb
    false, // silent
  );
};
