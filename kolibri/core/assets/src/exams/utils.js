const seededShuffle = require('seededshuffle');

function createQuestionList(questionSources) {
  return questionSources.reduce((acc, val) =>
    acc.concat([...Array(val.number_of_questions).keys()].map(
      (assessmentItemIndex) => ({ contentId: val.exercise_id, assessmentItemIndex })
    )), []);
}

function selectQuestionFromExercise(index, seed, contentNode) {
  const assessmentItemIds = contentNode.assessmentmetadata.assessment_item_ids;
  return seededShuffle.shuffle(assessmentItemIds, seed, true)[index];
}

module.exports = {
  createQuestionList,
  selectQuestionFromExercise,
};
