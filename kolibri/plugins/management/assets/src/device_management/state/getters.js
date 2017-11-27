import find from 'lodash/find';
import sumBy from 'lodash/sumBy';

export function wizardState(state) {
  return state.pageState.wizardState;
}

export function selectedNodes(state) {
  return wizardState(state).nodesForTransfer;
}

export function nodesForTransfer(state) {
  return wizardState(state).nodesForTransfer;
}

export function availableChannels(state) {
  return wizardState(state).availableChannels;
}

export function driveChannelList(state) {
  return function getListByDriveId(driveId) {
    const match = find(wizardState(state).driveList, { id: driveId });
    return match ? match.metadata.channels : [];
  };
}

export function installedChannelList(state) {
  return state.pageState.channelList;
}

export function channelIsInstalled(state) {
  return function findChannel(channelId) {
    return find(installedChannelList(state), { id: channelId });
  };
}

export function taskList(state) {
  return state.pageState.taskList;
}

export function cachedTopicPath(state) {
  return function getPath(pk) {
    return state.pageState.wizardState.pathCache[pk];
  };
}

export function getDriveById(state) {
  return function getDrive(driveId) {
    return find(state.pageState.wizardState.driveList, { id: driveId });
  };
}

export function nodeTransferCounts(state) {
  const { included, omitted } = selectedNodes(state);
  const getDifference = key => (sumBy(included, key) || 0) - (sumBy(omitted, key) || 0);
  return {
    resources: getDifference('total_resources'),
    fileSize: getDifference('total_file_size'),
  };
}
