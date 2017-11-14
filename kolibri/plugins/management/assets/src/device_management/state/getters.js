export function wizardState(state) {
  return state.pageState.wizardState;
}
export function selectedNodes(state) {
  return wizardState(state).selectedItems.nodes;
}

export function availableChannels(state) {
  return wizardState(state).availableChannels;
}

export function driveChannelList(state) {
  return function getListByDriveId(driveId) {
    const match = wizardState(state).driveList.find(d => d.id === driveId);
    return match ? match.metadata.channels : [];
  };
}

export function installedChannelList(state) {
  return state.pageState.channelList;
}

export function channelIsInstalled(state) {
  return function findChannel(channelId) {
    return installedChannelList(state).find(({ id }) => id === channelId);
  };
}
