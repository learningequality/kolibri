export default (widget, rubric) => {
  const correctIds = rubric.choices.filter(choice => choice.correct).map(choice => choice.id);

  widget.props.handleUserInput({
    selectedChoiceIds: correctIds,
  });
};
