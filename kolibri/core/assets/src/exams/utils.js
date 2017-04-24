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
  if (assessmentmetadata.assessment) {
    return seededShuffle.shuffle(assessmentmetadata.assessmentItemIds, seed, true)[index];
  }
  return null;
}

module.exports = {
  createQuestionList,
  selectQuestionFromExercise,
};
