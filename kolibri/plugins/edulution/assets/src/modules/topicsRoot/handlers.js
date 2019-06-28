import {
  ContentNodeSlimResource,
  ClassroomResource,
  LearnerGroupResource,
} from 'kolibri.resources';
import { LearnerClassroomResource } from '../../../../../learn/assets/src/apiResources';
import { PageNames } from '../../constants';
import { _collectionState } from '../../../../../learn/assets/src/modules/coreLearn/utils';

function displaySubscribedChannels(store, channels, channelRootIds, include_fields) {
  ContentNodeSlimResource.fetchCollection({
    getParams: { ids: channelRootIds, by_role: true, include_fields },
  }).then(channelCollection => {
    // we want them to be in the same order as the channels list
    const rootNodes = channels
      .map(channel => {
        let node;
        if (channelRootIds.length > 0) {
          node = _collectionState(channelCollection).find(n => n.channel_id === channel.id);
        }
        if (node) {
          node.thumbnail = channel.thumbnail;
          return node;
        }
      })
      .filter(Boolean);
    store.commit('topicsRoot/SET_STATE', { rootNodes });
    store.commit('CORE_SET_PAGE_LOADING', false);
    store.commit('CORE_SET_ERROR', null);
  });
}

function findGroupWithLearner(learnerId, groups) {
  let foundGroup = undefined;
  groups.forEach(function(group) {
    let found = group.user_ids.includes(learnerId);
    if (found) {
      foundGroup = group;
    }
  });
  return foundGroup;
}

export function showChannels(store) {
  store.commit('CORE_SET_PAGE_LOADING', true);
  store.commit('SET_PAGE_NAME', PageNames.TOPICS_ROOT);

  return store.dispatch('setAndCheckChannels').then(
    channels => {
      if (!channels.length) {
        return;
      }
      let channelRootIds = channels.map(channel => channel.root);
      const include_fields = [];
      if (store.getters.isCoach || store.getters.isAdmin) {
        include_fields.push('num_coach_contents');
      }
      if (store.getters.isLearner) {
        channelRootIds = [];
        LearnerClassroomResource.fetchCollection().then(classroomCollection => {
          classroomCollection.forEach(function(classObj) {
            ClassroomResource.fetchModel({ id: classObj.id }).then(channelsData => {
              LearnerGroupResource.fetchCollection().then(groupCollection => {
                let group = findGroupWithLearner(store.getters.currentUserId, groupCollection);
                if (group) {
                  channelRootIds = channelRootIds.concat(JSON.parse(group.subscriptions));
                  displaySubscribedChannels(store, channels, channelRootIds, include_fields);
                } else {
                  channelRootIds = channelRootIds.concat(JSON.parse(channelsData.subscriptions));
                  displaySubscribedChannels(store, channels, channelRootIds, include_fields);
                }
              });
            });
          });
        });
      } else {
        displaySubscribedChannels(store, channels, channelRootIds, include_fields);
      }
    },
    error => {
      store.dispatch('handleApiError', error);
      return error;
    }
  );
}
