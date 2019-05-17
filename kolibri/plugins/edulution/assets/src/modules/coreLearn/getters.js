import { PageNames, PageModes } from '../../constants';
import { pageMode as learnPageMode } from '../../../../../learn/assets/src/modules/coreLearn/getters';

export function pageMode(state) {
  const mode = learnPageMode(state);
  return mode === undefined && state.pageName === PageNames.KNOWLEDGE_MAP ? PageModes.TOPICS : mode;
}
