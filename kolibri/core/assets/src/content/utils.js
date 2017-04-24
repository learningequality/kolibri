function validateAssessmentMetaData(data) {
  // Data is coming from a serializer for a one to many key, so at least will return an empty array.
  const assessmentMetaData = data.assessmentmetadata[0];
  if (!assessmentMetaData) {
    return {
      assessment: false,
    };
  }
  const assessmentIds = JSON.parse(assessmentMetaData.assessment_item_ids || '[]');
  const masteryModel = JSON.parse(assessmentMetaData.mastery_model || '{}');
  if (!assessmentIds.length || !Object.keys(masteryModel).length) {
    return {
      assessment: false,
      assessmentIds: [],
    };
  }
  return {
    assessment: true,
    assessmentIds,
    masteryModel,
    randomize: assessmentMetaData.randomize,
  };
}

module.exports = {
  validateAssessmentMetaData,
};
