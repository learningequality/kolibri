import seededShuffle from 'seededshuffle';
import { assessmentMetaDataState } from 'kolibri.coreVue.vuex.mappers';

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

export {
  createQuestionList,
  selectQuestionFromExercise,
};
