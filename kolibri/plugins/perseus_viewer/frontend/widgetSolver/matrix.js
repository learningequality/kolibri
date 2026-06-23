export default (widget, rubric) => {
  const answers = rubric.answers.map(row =>
    row.map(cell => (typeof cell === 'number' ? cell.toString() : '')),
  );

  widget.props.handleUserInput({
    answers,
  });
};
