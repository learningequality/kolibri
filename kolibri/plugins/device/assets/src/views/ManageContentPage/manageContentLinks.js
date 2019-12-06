import { ContentWizardPages, PageNames } from '../../constants';

export function selectContentTopicLink(topicNode, query, channelId) {
  return {
    name: ContentWizardPages.SELECT_CONTENT,
    params: {
      node: topicNode,
    },
    query: {
      ...query,
      // If the linked node is the top-level channel remove the query param
      node_id: channelId === topicNode.id ? undefined : topicNode.id,
    },
  };
}

export function availableChannelsPageLink(params = {}) {
  const { driveId, addressId } = params;
  return {
    name: ContentWizardPages.AVAILABLE_CHANNELS,
    query: {
      drive_id: driveId,
      address_id: addressId,
    },
  };
}

export function selectContentPageLink(params = {}) {
  const { channelId, driveId, addressId } = params;
  return {
    name: ContentWizardPages.SELECT_CONTENT,
    params: {
      channel_id: channelId,
    },
    query: {
      drive_id: driveId,
      address_id: addressId,
    },
  };
}

export function manageContentPageLink() {
  return {
    name: PageNames.MANAGE_CONTENT_PAGE,
  };
}
