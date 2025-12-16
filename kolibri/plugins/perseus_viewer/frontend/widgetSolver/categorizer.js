export default (widget, rubric) => {
  const values = rubric.values;

  widget.props.onChange(
    {
      values,
    },
    null, // cb
    false, // silent
  );
};
