export default (widget, rubric) => {
  let newProps;

  // Have to fill multiple answers
  if (widget.props.multInput) {
    const currentMultipleValues = rubric.answers
      .filter(answer => answer.status === 'correct')
      .sort((a, b) => {
        return a.value > b.value ? 1 : -1;
      })
      .join(',');
    newProps = {
      currentMultipleValues,
    };
  } else {
    const answer = rubric.answers.find(answer => answer.status === 'correct');
    const currentValue = answer.value.toString();
    newProps = {
      currentValue,
    };
  }

  widget.props.onChange(
    newProps,
    null, // cb
    false, // silent
  );
};
