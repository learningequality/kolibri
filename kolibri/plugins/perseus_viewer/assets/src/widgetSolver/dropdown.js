export default (widget, rubric) => {
  const correct = rubric.choices.find(choice => choice.correct);
  widget.props.onChange(
    {
      selected: rubric.choices.indexOf(correct) + 1,
    },
    null,
    false,
  );
};
