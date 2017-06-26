import mapKeys from 'lodash/mapKeys';
import camelCase from 'lodash/camelCase';
import snakeCase from 'lodash/snakeCase';

function assessmentMetaDataState(data) {
  const blankState = {
    assessment: false,
    assessmentIds: [],
    masteryModel: null,
    randomize: false,
  };
  // Data is from a serializer for a one to many key, so it will return a array of length 0 or 1
  const assessmentMetaData = data.assessmentmetadata[0];
  if (!assessmentMetaData) {
    return blankState;
  }
  const assessmentIds = assessmentMetaData.assessment_item_ids;
  const masteryModel = assessmentMetaData.mastery_model;
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

function convertKeysToCamelCase(object) {
  return mapKeys(object, (value, key) => camelCase(key));
}

function convertKeysToSnakeCase(object) {
  return mapKeys(object, (value, key) => snakeCase(key));
}

export {
  assessmentMetaDataState,
  convertKeysToCamelCase,
  convertKeysToSnakeCase,
};
