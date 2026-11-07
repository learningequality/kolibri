export default rubric => ({
  selectedChoiceIds: rubric.choices.filter(choice => choice.correct).map(choice => choice.id),
});
