import find from 'lodash/find';
import isEmpty from 'lodash/isEmpty';
import sumBy from 'lodash/sumBy';
import { TransferTypes } from '../../constants';

export function cachedTopicPath(state) {
  return function getPath(id) {
    return state.pathCache[id];
  };
}

export function getDriveById(state) {
  return function getDrive(driveId) {
    return find(state.driveList, { id: driveId });
  };
}

export function nodeTransferCounts(state) {
  return function(transferType) {
    const { included, omitted } = state.nodesForTransfer;
    const getDifference = key => (sumBy(included, key) || 0) - (sumBy(omitted, key) || 0);
    if (transferType === TransferTypes.LOCALEXPORT) {
      return {
        resources: getDifference('on_device_resources'),
        fileSize: getDifference('on_device_file_size'),
      };
    } else {
      // For REMOTE/LOCAL/PEERIMPORT
      // This will overestimate transfer size, since it counts items under topic that may not
      // be on the USB drive
      return {
        resources: getDifference('total_resources') - getDifference('on_device_resources'),
        fileSize: getDifference('total_file_size') - getDifference('on_device_file_size'),
      };
    }
  };
}

export function inExportMode(state) {
  return state.transferType === TransferTypes.LOCALEXPORT;
}

export function inLocalImportMode(state) {
  return state.transferType === TransferTypes.LOCALIMPORT;
}

export function inRemoteImportMode(state) {
  return state.transferType === TransferTypes.REMOTEIMPORT;
}

export function inPeerImportMode(state) {
  return state.transferType === TransferTypes.PEERIMPORT;
}

export function driveCanBeUsedForTransfer(state, getters, rootState, rootGetters) {
  return function isEnabled({ drive, transferType }) {
    if (transferType === TransferTypes.LOCALIMPORT) {
      const { transferredChannel } = state;
      // In top-level Import workflow -> Show any drive with content
      if (!getters.isImportingMore) {
        return drive.metadata.channels.length > 0;
      }
      // In "Import More" from Channel workflow -> Show any drive with that channel
      // where its version is >= to the installed version
      const channelOnDrive = find(drive.metadata.channels, { id: transferredChannel.id });
      const channelOnServer = rootGetters['manageContent/channelIsInstalled'](
        transferredChannel.id
      );
      return channelOnDrive && channelOnDrive.version >= channelOnServer.version;
    }

    if (transferType === TransferTypes.LOCALEXPORT) {
      // In Export workflow, drive just needs to be writable
      return drive.writable;
    }

    return false;
  };
}

// Utility to help distinguish when app is in import-more workflow or not
export function isImportingMore(state, getters) {
  return !getters.inExportMode && !isEmpty(state.transferredChannel);
}
