export default widget => {
  const newStates = widget.props.choices.map(choice => ({
    correctnessShown: false,
    rationaleShown: false,
    readOnly: false,
    selected: choice.correct,
    highlighted: true,
  }));

  widget.props.onChange(
    {
      choiceStates: newStates,
    },
    null, // cb
    false, // silent
  );
};
