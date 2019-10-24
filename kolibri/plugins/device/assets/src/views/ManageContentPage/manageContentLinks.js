import { ContentWizardPages, PageNames } from '../../constants';

export function selectContentTopicLink(topicNode, query) {
  return {
    name: ContentWizardPages.SELECT_CONTENT_TOPIC,
    params: {
      node_id: topicNode.id,
      node: topicNode,
    },
    query,
  };
}

export function availableChannelsPageLink(params = {}) {
  const { driveId, forExport, addressId } = params;
  return {
    name: ContentWizardPages.AVAILABLE_CHANNELS,
    query: {
      drive_id: driveId,
      for_export: forExport,
      address_id: addressId,
    },
  };
}

export function selectContentPageLink(params = {}) {
  const { channelId, driveId, forExport, addressId } = params;
  return {
    name: ContentWizardPages.SELECT_CONTENT,
    params: {
      channel_id: channelId,
    },
    query: {
      drive_id: driveId,
      for_export: forExport,
      address_id: addressId,
    },
  };
}

export function manageContentPageLink() {
  return {
    name: PageNames.MANAGE_CONTENT_PAGE,
  };
}
