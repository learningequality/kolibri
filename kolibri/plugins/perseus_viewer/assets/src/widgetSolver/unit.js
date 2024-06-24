export default (widget, rubric) => {
  const value = rubric.value;

  widget.props.onChange(
    {
      value,
    },
    null, // cb
    false, // silent
  );
};
