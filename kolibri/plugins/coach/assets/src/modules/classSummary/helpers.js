import size from 'lodash/size';
import store from './index';

export default {
  groupNames(groupIds) {
    return groupIds.map(id => store.state.groupMap[id].name);
  },
  numLearnersAssigned(groupIds) {
    if (!groupIds.length) {
      return size(store.state.learnerMap);
    }
    return 20;
  },
};
