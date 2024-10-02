import has from 'lodash/has';
import logger from 'kolibri.lib.logging';
import { masteryModelValidator } from 'kolibri-common/utils/contentNode';

export const logging = logger.getLogger(__filename);

export function tryValidator(currentTry) {
  const requiredFields = [
    'id',
    'mastery_criterion',
    'start_timestamp',
    'end_timestamp',
    'correct',
    'time_spent',
    'completion_timestamp',
    'complete',
  ];
  if (
    !requiredFields.every(key => {
      if (!has(currentTry, key)) {
        logging.error(`Missing required field ${key} in try ${JSON.stringify(currentTry)}`);
        return false;
      }
      return true;
    })
  ) {
    return false;
  }
  if (!masteryModelValidator(currentTry.mastery_criterion)) {
    return false;
  }
  if (!currentTry.diff || Object.keys(currentTry.diff).length === 0) {
    return true;
  }
  return has(currentTry.diff, 'correct') && has(currentTry.diff, 'time_spent');
}
