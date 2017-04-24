const seededShuffle = require('seededshuffle');
const { validateAssessmentMetaData } = require('kolibri.utils.content');

function createQuestionList(questionSources) {
  return questionSources.reduce((acc, val) =>
    acc.concat(Array.from(Array(val.number_of_questions).keys()).map(
      (assessmentItemIndex) => ({ contentId: val.exercise_id, assessmentItemIndex })
    )), []);
}

function selectQuestionFromExercise(index, seed, contentNode) {
  const assessmentmetadata = validateAssessmentMetaData(contentNode);
  return seededShuffle.shuffle(assessmentmetadata.assessmentItemIds, seed, true)[index];
}

module.exports = {
  createQuestionList,
  selectQuestionFromExercise,
};
