export default (widget, rubric) => {
  const answers = rubric.answers;

  widget.props.onChange(
    {
      answers,
    },
    null, // cb
    false, // silent
  );
};
