// Orderer scoring compares userInput.current against correctOptions[].content
export default rubric => ({
  current: rubric.correctOptions.map(option => option.content),
});
