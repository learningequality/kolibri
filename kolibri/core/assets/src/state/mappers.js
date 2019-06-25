import mapValues from 'lodash/mapValues';
import snakeCase from 'lodash/snakeCase';

function ensureTypeSnakeCase(value) {
  if (typeof value === 'string') {
    return snakeCase(value);
  }
  return value;
}

export function assessmentMetaDataState(data) {
  const blankState = {
    assessment: false,
    assessmentIds: [],
    masteryModel: null,
    randomize: false,
  };
  if (typeof data.assessmentmetadata === 'undefined') {
    return blankState;
  }
  // Data is from a serializer for a one to many key, so it will return an array of length 0 or 1
  const assessmentMetaData = data.assessmentmetadata[0];
  if (!assessmentMetaData) {
    return blankState;
  }
  const assessmentIds = assessmentMetaData.assessment_item_ids;
  const masteryModel = mapValues(assessmentMetaData.mastery_model, ensureTypeSnakeCase);
  if (!assessmentIds.length || !Object.keys(masteryModel).length) {
    return blankState;
  }
  return {
    assessment: true,
    assessmentIds,
    masteryModel,
    randomize: assessmentMetaData.randomize,
  };
}
