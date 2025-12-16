export default (widget, rubric) => {
  const answers = rubric.answers.map(row =>
    row.map(cell => (typeof cell === 'number' ? cell.toString() : '')),
  );

  widget.props.onChange(
    {
      answers,
    },
    null, // cb
    false, // silent
  );
};
