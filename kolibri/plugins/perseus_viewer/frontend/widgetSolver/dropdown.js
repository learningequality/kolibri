export default rubric => {
  const correctIndex = rubric.choices.findIndex(choice => choice.correct);
  // Dropdown value is 1-indexed (0 = placeholder/unselected)
  return {
    value: correctIndex + 1,
  };
};
