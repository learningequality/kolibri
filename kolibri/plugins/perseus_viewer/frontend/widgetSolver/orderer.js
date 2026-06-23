export default (widget, rubric) => {
  // Orderer scoring compares userInput.current against correctOptions[].content
  widget.props.handleUserInput({
    current: rubric.correctOptions.map(option => option.content),
  });
};
