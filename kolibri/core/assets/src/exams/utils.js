const seededShuffle = require('seededshuffle');
const { assessmentMetaDataState } = require('kolibri.coreVue.vuex.mappers');

function createQuestionList(questionSources) {
  return questionSources.reduce((acc, val) =>
    acc.concat(Array.from(Array(val.number_of_questions).keys()).map(
      (assessmentItemIndex) => ({ contentId: val.exercise_id, assessmentItemIndex })
    )), []);
}

function selectQuestionFromExercise(index, seed, contentNode) {
  const assessmentmetadata = assessmentMetaDataState(contentNode);
  return seededShuffle.shuffle(assessmentmetadata.assessmentIds, seed, true)[index];
}

module.exports = {
  createQuestionList,
  selectQuestionFromExercise,
};
